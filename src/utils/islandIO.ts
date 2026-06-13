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
