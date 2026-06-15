// 云端同步层：把原先只存在浏览器 localStorage 的「岛屿存档」与「账号级进度」
// 在登录后与服务器双向同步，实现「登录即同步」。
//
// 策略：
//  - 岛屿：以服务器 island id 作为本地 slot id，按 updated_at 谁新用谁；
//    本地未部署（无映射）的存档自动上云（demo 除外）。
//  - 账号进度（XP/好感度/记忆/成就/居民卡/音乐卡）：合并而非覆盖，零丢失，再回写两端。
import { api } from './api';
import { useGameStore } from '../store';

const ISLAND_INDEX = 'eco_saves_index';
const ISLAND_MAP = 'wander_server_island_map';
const islandDataKey = (id: string): string => `eco_save_${id}`;

const XP_KEY = 'global_player_xp';
const CI_AFFINITY_KEY = 'ci_affinity';
const CI_MEMORY_KEY = 'ci_memory';
const ACH_KEY = 'achievements_unlocked';
const RESIDENT_CARD_KEY = 'resident_card';
const CARD_PREFIX = 'card_got_';

const DEMO_SLOT_ID = 'default_01';
const MAX_MEMORY = 30;

interface SaveSlot {
  id: string;
  name: string;
  lastPlayed: number;
  ecoPoints: number;
  playtime: number;
}

interface CiMemoryEntry {
  text: string;
  at: number;
  type: string;
}

interface UserStateBlob {
  xp: number;
  ciAffinity: number;
  ciMemory: CiMemoryEntry[];
  achievements: string[];
  residentCard: unknown | null;
  cards: Record<string, number>;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore quota */ }
}

// ───────────────────────── 岛屿同步 ─────────────────────────

async function syncIslands(): Promise<void> {
  const res = await api.getMyIslands();
  const islands: any[] = res.islands || [];

  const slots = readJSON<SaveSlot[]>(ISLAND_INDEX, []);
  const map = readJSON<Record<string, string>>(ISLAND_MAP, {});

  const serverToLocal: Record<string, string> = {};
  for (const localId of Object.keys(map)) serverToLocal[map[localId]] = localId;

  // 1) 拉取：服务器 → 本地
  for (const isl of islands) {
    const serverId: string = isl.id;
    const serverUpdatedMs = (isl.updated_at || 0) * 1000;
    let data: any = {};
    try {
      data = typeof isl.data === 'string' ? JSON.parse(isl.data) : (isl.data || {});
    } catch { data = {}; }

    const localId = serverToLocal[serverId];
    if (localId) {
      // 已有映射：仅当服务器严格更新时才覆盖本地
      const slot = slots.find((s) => s.id === localId);
      const localMs = slot ? slot.lastPlayed : 0;
      if (serverUpdatedMs > localMs) {
        writeJSON(islandDataKey(localId), data);
        if (slot) {
          slot.name = isl.name || slot.name;
          slot.lastPlayed = serverUpdatedMs;
          slot.ecoPoints = data.ecoPoints != null ? data.ecoPoints : slot.ecoPoints;
          slot.playtime = data.stats && data.stats.playtime != null ? data.stats.playtime : slot.playtime;
        }
      }
    } else {
      // 新设备 / 从未映射：以服务器 id 作为本地 slot id 落地
      if (!slots.find((s) => s.id === serverId)) {
        slots.push({
          id: serverId,
          name: isl.name || '岛屿',
          lastPlayed: serverUpdatedMs || Date.now(),
          ecoPoints: data.ecoPoints != null ? data.ecoPoints : 0,
          playtime: data.stats && data.stats.playtime != null ? data.stats.playtime : 0,
        });
      }
      writeJSON(islandDataKey(serverId), data);
      map[serverId] = serverId;
    }
  }

  // 2) 推送：本地未部署的存档 → 服务器（预置 demo 除外）
  for (const slot of slots) {
    if (slot.id === DEMO_SLOT_ID) continue;
    if (map[slot.id]) continue;
    const data = readJSON<any>(islandDataKey(slot.id), null);
    if (!data) continue;
    try {
      const created = await api.createIsland(slot.name || '岛屿', true, data);
      map[slot.id] = created.island.id;
    } catch { /* 单个失败不阻断整体同步 */ }
  }

  writeJSON(ISLAND_INDEX, slots);
  writeJSON(ISLAND_MAP, map);
  // 同步内存中的映射，保证 60s 自动同步与部署按钮状态一致
  try { useGameStore.getState().setServerIslandMap(map); } catch { /* store 尚未就绪 */ }
}

// ──────────────────────── 账号进度同步 ────────────────────────

function collectLocalUserState(): UserStateBlob {
  const cards: Record<string, number> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CARD_PREFIX)) {
      const v = localStorage.getItem(k);
      cards[k] = v ? (parseInt(v, 10) || Date.now()) : Date.now();
    }
  }
  return {
    xp: parseInt(localStorage.getItem(XP_KEY) || '0', 10) || 0,
    ciAffinity: parseInt(localStorage.getItem(CI_AFFINITY_KEY) || '0', 10) || 0,
    ciMemory: readJSON<CiMemoryEntry[]>(CI_MEMORY_KEY, []),
    achievements: readJSON<string[]>(ACH_KEY, []),
    residentCard: readJSON<unknown | null>(RESIDENT_CARD_KEY, null),
    cards,
  };
}

function mergeUserState(local: UserStateBlob, server: UserStateBlob | null): UserStateBlob {
  if (!server) return local;

  const memMap = new Map<string, CiMemoryEntry>();
  const allMem = (server.ciMemory || []).concat(local.ciMemory || []);
  for (const m of allMem) {
    if (m && typeof m.at === 'number') memMap.set(`${m.at}|${m.text}`, m);
  }
  const ciMemory = Array.from(memMap.values()).sort((a, b) => a.at - b.at).slice(-MAX_MEMORY);

  const cards: Record<string, number> = { ...(server.cards || {}) };
  const localCards = local.cards || {};
  for (const k of Object.keys(localCards)) {
    cards[k] = cards[k] ? Math.min(cards[k], localCards[k]) : localCards[k];
  }

  return {
    xp: Math.max(local.xp || 0, server.xp || 0),
    ciAffinity: Math.max(local.ciAffinity || 0, server.ciAffinity || 0),
    ciMemory,
    achievements: Array.from(new Set((server.achievements || []).concat(local.achievements || []))),
    residentCard: local.residentCard || server.residentCard || null,
    cards,
  };
}

function applyUserState(merged: UserStateBlob): void {
  localStorage.setItem(XP_KEY, String(merged.xp));
  localStorage.setItem(CI_AFFINITY_KEY, String(merged.ciAffinity));
  writeJSON(CI_MEMORY_KEY, merged.ciMemory);
  writeJSON(ACH_KEY, merged.achievements);
  if (merged.residentCard) writeJSON(RESIDENT_CARD_KEY, merged.residentCard);
  for (const k of Object.keys(merged.cards)) {
    if (!localStorage.getItem(k)) localStorage.setItem(k, String(merged.cards[k]));
  }
}

async function syncUserState(): Promise<void> {
  const local = collectLocalUserState();
  let server: UserStateBlob | null = null;
  try {
    const r = await api.getUserState();
    server = (r.state as UserStateBlob | null) || null;
  } catch { /* 首次或失败时按本地为准 */ }

  const merged = mergeUserState(local, server);
  applyUserState(merged);
  try { await api.putUserState(merged); } catch { /* ignore */ }
}

/** 把当前本地账号进度推送到服务器（用于周期性同步）。 */
export async function pushUserState(): Promise<void> {
  try { await api.putUserState(collectLocalUserState()); } catch { /* ignore */ }
}

let syncing = false;

/** 登录（手动或自动）后调用：双向同步岛屿与账号进度。 */
export async function syncOnLogin(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    await syncIslands();
    await syncUserState();
  } catch (e) {
    console.error('[cloudSync] login sync failed', e);
  } finally {
    syncing = false;
  }
}
