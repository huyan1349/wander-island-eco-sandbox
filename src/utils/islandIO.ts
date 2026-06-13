import { useGameStore } from '../store';

// 把当前小岛序列化成游戏可读取的数据对象（与存档格式一致）
export function serializeIsland() {
  const s = useGameStore.getState();
  return {
    format: 'wander-island',
    version: 1,
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

// 生成礼物分享链接（上传当前岛，返回独一无二的链接）
export async function createGiftLink(fromName: string): Promise<string> {
  const data = serializeIsland();
  const res = await fetch('/api/gifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: data.name, fromName, data }),
  });
  if (!res.ok) throw new Error('生成礼物失败');
  const { id } = await res.json();
  return `${location.origin}/?gift=${id}`;
}

// 领取礼物：按 ID 拉取并载入游戏，返回岛名
export async function claimGift(id: string): Promise<string> {
  const res = await fetch(`/api/gifts/${id}`);
  if (!res.ok) throw new Error('礼物不存在或已失效');
  const gift = await res.json();
  const name = gift.fromName ? `${gift.name || '小岛'} (来自 ${gift.fromName})` : (gift.name || '收到的礼物');
  applyIslandData(gift.data, name);
  return name;
}
