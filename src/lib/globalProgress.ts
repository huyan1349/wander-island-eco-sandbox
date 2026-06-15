// 全局玩家进度：等级/经验属于「玩家账号」，跨所有小岛累加，而非绑定单个小岛存档。
// 存于 localStorage，独立于每个岛屿的存档数据。
const XP_KEY = 'global_player_xp';

export function getGlobalXP(): number {
  try { return parseInt(localStorage.getItem(XP_KEY) || '0', 10) || 0; } catch { return 0; }
}

export function setGlobalXP(xp: number): void {
  try { localStorage.setItem(XP_KEY, String(Math.max(0, Math.floor(xp)))); } catch { /* ignore */ }
}

export function addGlobalXP(amount: number): number {
  const next = getGlobalXP() + amount;
  setGlobalXP(next);
  return next;
}

export function levelFromXP(xp: number): number {
  return Math.floor(xp / 100) + 1;
}
