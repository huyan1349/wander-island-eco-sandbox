import { useGameStore } from '../store';

// 直接把一份岛屿快照应用到 store（临时、不建存档）。用于开屏 demo / 归隐之岛预置底图。
export function applyIslandSnapshot(d: any) {
  const cur = useGameStore.getState().terrainData;
  useGameStore.setState({
    assets: d.assets ?? [],
    grassHealth: d.grassHealth ?? 100,
    deerCount: d.deerCount ?? 0,
    wolfCount: d.wolfCount ?? 0,
    timeOfDay: d.timeOfDay ?? 8,
    weather: d.weather ?? 'sunny',
    season: d.season ?? useGameStore.getState().season,
    biome: d.biome ?? useGameStore.getState().biome,
    _history: [],
    _future: [],
    terrainData: {
      ...cur,
      positions: d.terrainPositions ? new Float32Array(d.terrainPositions) : null,
      types: d.terrainTypes ? new Uint8Array(d.terrainTypes) : null,
    },
  } as any);
}

export async function loadPresetIsland(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('preset fetch failed');
  applyIslandSnapshot(await res.json());
}

// 标题开屏背景：永远展示预置岛 preset-demo（瞬时快照，不建存档、不动玩家存档、不设 islandId）。
// 与玩家自己的存档/登录完全解耦——「开始旅程」进游戏时才加载玩家真正的岛。
export async function showTitleBackdrop(): Promise<void> {
  if (useGameStore.getState().screen !== 'TITLE') return;
  try {
    const res = await fetch('/preset-demo.json?v=2');
    if (!res.ok) return;
    const data = await res.json();
    if (useGameStore.getState().screen !== 'TITLE') return; // await 后再判，避免覆盖玩家已发生的导航
    applyIslandSnapshot(data);
  } catch {
    /* 背景加载失败无所谓 */
  }
}

// 默认岛槽位 id（固定，避免重复落地）
const HOME_ISLAND_ID = 'home';
let seedPromise: Promise<void> | null = null;

// 把预置岛(preset-demo)落地为唯一一个真实存档槽，名「<玩家>的岛屿」。仅在零存档时调用。
async function seedPresetHome(): Promise<void> {
  const store = useGameStore.getState();
  const res = await fetch('/preset-demo.json?v=2');
  if (!res.ok) throw new Error('preset-demo fetch failed');
  const d = await res.json();
  const name = `${store.authUser?.username || store.playerName || '漫游者'}的岛屿`;
  const slot = { id: HOME_ISLAND_ID, name, lastPlayed: Date.now(), ecoPoints: d.ecoPoints ?? 200, playtime: d.stats?.playtime ?? 0 };
  localStorage.setItem('eco_saves_index', JSON.stringify([slot]));
  localStorage.setItem(`eco_save_${HOME_ISLAND_ID}`, JSON.stringify({
    timeOfDay: d.timeOfDay ?? 6,
    weather: d.weather ?? 'sunny',
    assets: d.assets ?? [],
    grassHealth: d.grassHealth ?? 100,
    deerCount: d.deerCount ?? 0,
    wolfCount: d.wolfCount ?? 0,
    playerName: store.playerName,
    playerAvatar: store.playerAvatar,
    playerXP: d.playerXP ?? 0,
    playerLevel: d.playerLevel ?? 1,
    ecoPoints: d.ecoPoints ?? 200,
    awakening: d.awakening ?? 0,
    unlockedAssets: d.unlockedAssets,
    stats: d.stats ?? { playtime: 0, itemsPlaced: d.assets?.length || 0 },
    terrainPositions: d.terrainPositions ?? null,
    terrainTypes: d.terrainTypes ?? null,
  }));
}

// 确保存档列表里至少有「默认岛」：零存档时把预置岛(preset-demo)落地为一个真实存档槽
// （名「<玩家>的岛屿」）。只落地、不加载、不切屏——供存档界面进入前调用。并发共用一次落地。
export async function ensureHomeSlot(): Promise<void> {
  if (useGameStore.getState().getSavedSlots().length > 0) return;
  if (!seedPromise) {
    seedPromise = seedPresetHome()
      .catch((e) => { console.error('默认岛落地失败', e); })
      .finally(() => { seedPromise = null; });
  }
  await seedPromise;
}

// 把当前小岛序列化成游戏可读取的数据对象（与存档格式一致）
export function serializeIsland() {
  const s = useGameStore.getState();
  return {
    format: 'wander-island',
    version: 2,
    name: s.islandName,
    savedAt: Date.now(),
    timeOfDay: s.timeOfDay,
    weather: s.weather,
    season: s.season,
    biome: s.biome,
    assets: s.assets,
    grassHealth: s.grassHealth,
    deerCount: s.deerCount,
    wolfCount: s.wolfCount,
    ecoPoints: s.ecoPoints,
    playerXP: s.playerXP,
    playerLevel: s.playerLevel,
    unlockedAssets: s.unlockedAssets,
    stats: s.stats,
    terrainPositions: s.terrainData.positions ? Array.from(s.terrainData.positions) : null,
    terrainTypes: s.terrainData.types ? Array.from(s.terrainData.types) : null,
  };
}

// 导出当前小岛为 JSON 文件并触发下载
export function exportIslandFile() {
  const data = serializeIsland();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wander-island-${(data.name || 'save').replace(/\s+/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 把一份岛屿数据写入本地存档并进入游戏（礼物领取 / 文件导入共用）
export function applyIslandData(d: any, name: string) {
  const store = useGameStore.getState();
  const id = Date.now().toString();
  const slots = store.getSavedSlots();
  slots.push({ id, name, lastPlayed: Date.now(), ecoPoints: d.ecoPoints ?? 200, playtime: d.stats?.playtime ?? 0 });
  localStorage.setItem('eco_saves_index', JSON.stringify(slots));
  localStorage.setItem(`eco_save_${id}`, JSON.stringify({
    timeOfDay: d.timeOfDay ?? 6,
    weather: d.weather ?? 'sunny',
    assets: d.assets ?? [],
    grassHealth: d.grassHealth ?? 100,
    deerCount: d.deerCount ?? 0,
    wolfCount: d.wolfCount ?? 0,
    playerName: store.playerName,
    playerAvatar: store.playerAvatar,
    playerXP: d.playerXP ?? 0,
    playerLevel: d.playerLevel ?? 1,
    ecoPoints: d.ecoPoints ?? 200,
    unlockedAssets: d.unlockedAssets,
    stats: d.stats ?? { playtime: 0, itemsPlaced: 0 },
    terrainPositions: d.terrainPositions ?? null,
    terrainTypes: d.terrainTypes ?? null,
  }));
  store.loadGame(id);
}

// Unicode 安全的 base64 编解码（岛数据含中文）
function encodeB64(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function decodeB64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export interface GiftPayload {
  name: string;
  fromName: string;
  message: string;
  data: any;
}

// 截取当前游戏画面（缩放压缩）用作礼物卡片正面底图。需 canvas 开 preserveDrawingBuffer
export function captureScreenshot(maxW = 640): string {
  const src = document.querySelector('canvas') as HTMLCanvasElement | null;
  if (!src) return '';
  try {
    const scale = Math.min(1, maxW / src.width);
    const c = document.createElement('canvas');
    c.width = Math.round(src.width * scale);
    c.height = Math.round(src.height * scale);
    c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.75);
  } catch {
    return '';
  }
}

// 生成礼物分享链接：在线走后端短链；离线/失败降级把礼物编码进链接（去截图控长度）。
// 截图与接收人存进 data._gift，不改后端 schema。
export async function createGiftLink(meta: { fromName: string; toName: string; message: string; screenshot: string }): Promise<string> {
  const island = serializeIsland();
  const data = { ...island, _gift: { toName: meta.toName, screenshot: meta.screenshot } };
  const payload = { name: island.name, fromName: meta.fromName, message: meta.message, data };
  try {
    const res = await fetch('/api/gifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('server');
    const { id } = await res.json();
    return `${location.origin}/?gift=${id}`;
  } catch {
    // 离线降级：去掉地形(占数据绝大部分)与截图，大幅压缩使其能塞进二维码
    const slimData = { ...data, terrainPositions: null, terrainTypes: null, _gift: { toName: meta.toName, screenshot: '' } };
    const slim = { name: island.name, fromName: meta.fromName, message: meta.message, data: slimData };
    return `${location.origin}/?gift=data:${encodeB64(JSON.stringify(slim))}`;
  }
}

// 取礼物信息（不立即载入，供开礼物动画使用）。支持后端短链与离线 data: 链接
export async function fetchGift(id: string): Promise<GiftPayload> {
  if (id.startsWith('data:')) {
    return JSON.parse(decodeB64(id.slice(5)));
  }
  const res = await fetch(`/api/gifts/${id}`);
  if (!res.ok) throw new Error('礼物不存在或已失效');
  return res.json();
}

// 领取礼物：取数据并载入游戏，返回展示用岛名
export async function claimGift(id: string): Promise<string> {
  const gift = await fetchGift(id);
  const name = gift.fromName ? `${gift.name || '小岛'} (来自 ${gift.fromName})` : (gift.name || '收到的礼物');
  applyIslandData(gift.data, name);
  return name;
}
