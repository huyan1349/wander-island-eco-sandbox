// 成就系统：轻量、治愈、复用现有数据；解锁状态存 localStorage
import { TRACKS, isCardOwned } from '../components/ui/musicData';

export interface AchSnapshot {
  itemsPlaced: number;
  playtime: number;       // 秒
  ecoPoints: number;
  level: number;
  deerCount: number;
  wolfCount: number;
  treeCount: number;
  buildingCount: number;
  hasSign: boolean;
  cardsOwned: number;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  check: (s: AchSnapshot) => boolean;
}

const TREE_TYPES = ['treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'spirit_tree'];
const BUILD_TYPES = ['house', 'windmill', 'lighthouse', 'tent', 'well', 'observatory', 'ruins_arch', 'waterwheel', 'bench', 'streetlamp'];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_tree', title: '第一棵树', desc: '在岛上种下第一棵树', check: s => s.treeCount >= 1 },
  { id: 'first_build', title: '安家落户', desc: '建起第一座建筑', check: s => s.buildingCount >= 1 },
  { id: 'items_10', title: '小岛初成', desc: '在岛上放置 10 个物件', check: s => s.itemsPlaced >= 10 },
  { id: 'items_50', title: '繁荣之岛', desc: '在岛上放置 50 个物件', check: s => s.itemsPlaced >= 50 },
  { id: 'items_120', title: '生机盎然', desc: '在岛上放置 120 个物件', check: s => s.itemsPlaced >= 120 },
  { id: 'first_deer', title: '初见生灵', desc: '岛上迎来第一只鹿', check: s => s.deerCount >= 1 },
  { id: 'food_chain', title: '生态平衡', desc: '同时拥有树木、鹿与狼', check: s => s.treeCount >= 3 && s.deerCount >= 1 && s.wolfCount >= 1 },
  { id: 'sign', title: '留下足迹', desc: '立起一块写字牌', check: s => s.hasSign },
  { id: 'level_5', title: '资深漫游者', desc: '等级达到 5 级', check: s => s.level >= 5 },
  { id: 'playtime_10', title: '静谧时光', desc: '在岛上停留 10 分钟', check: s => s.playtime >= 600 },
  { id: 'all_cards', title: '记忆收藏家', desc: '集齐全部音乐记忆卡', check: s => s.cardsOwned >= TRACKS.length },
];

const KEY = 'achievements_unlocked';
export function getUnlocked(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
}
function saveUnlocked(set: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}
export function isAchUnlocked(id: string): boolean { return getUnlocked().has(id); }

export function buildSnapshot(state: any): AchSnapshot {
  const assets = state.assets || [];
  return {
    itemsPlaced: state.stats?.itemsPlaced ?? assets.length,
    playtime: state.stats?.playtime ?? 0,
    ecoPoints: state.ecoPoints ?? 0,
    level: state.playerLevel ?? 1,
    deerCount: state.deerCount ?? 0,
    wolfCount: state.wolfCount ?? 0,
    treeCount: assets.filter((a: any) => TREE_TYPES.includes(a.type)).length,
    buildingCount: assets.filter((a: any) => BUILD_TYPES.includes(a.type)).length,
    hasSign: assets.some((a: any) => a.type === 'sign'),
    cardsOwned: TRACKS.filter(t => isCardOwned(t.url)).length,
  };
}

// 评估：返回本次新解锁的成就（并落盘）
export function evaluateAchievements(state: any): Achievement[] {
  const unlocked = getUnlocked();
  const snap = buildSnapshot(state);
  const newly: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.check(snap)) {
      unlocked.add(a.id);
      newly.push(a);
    }
  }
  if (newly.length) saveUnlocked(unlocked);
  return newly;
}
