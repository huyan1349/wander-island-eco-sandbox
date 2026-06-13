// 生生不息 (Flourish) — 策略生存模式的核心数据层
// 卡池、共生连锁规则、起始牌库。纯数据 + 纯函数，不依赖 React。
import type { PlacedAsset } from '../store';

export type FlourishCardId = 'oak' | 'pine' | 'spring' | 'deer' | 'wolf' | 'rock';

export interface FlourishCard {
  id: FlourishCardId;
  name: string;
  /** 映射到现有 3D 物件类型，打牌即放置该物件，零新美术 */
  assetType: PlacedAsset['type'];
  /** 打出消耗的 Eco 能量 */
  cost: number;
  /** 营养级，决定它在食物链里的位置 */
  trophic: 'producer' | 'water' | 'herbivore' | 'carnivore' | 'neutral';
  /** 卡面上印的共生提示，玩家不用记 */
  symbiosisHint: string;
}

export const FLOURISH_CARDS: Record<FlourishCardId, FlourishCard> = {
  oak:    { id: 'oak',    name: '橡树', assetType: 'treeA',  cost: 10, trophic: 'producer',  symbiosisHint: '靠近水源更繁茂 · 喂养鹿群' },
  pine:   { id: 'pine',   name: '松树', assetType: 'treeB',  cost: 10, trophic: 'producer',  symbiosisHint: '靠近水源更繁茂 · 喂养鹿群' },
  spring: { id: 'spring', name: '水源', assetType: 'spring', cost: 15, trophic: 'water',     symbiosisHint: '滋养周围的树木' },
  deer:   { id: 'deer',   name: '鹿',   assetType: 'deer',   cost: 20, trophic: 'herbivore', symbiosisHint: '需要树木供食 · 是狼的猎物' },
  wolf:   { id: 'wolf',   name: '狼',   assetType: 'wolf',   cost: 30, trophic: 'carnivore', symbiosisHint: '捕食鹿，闭合食物链' },
  rock:   { id: 'rock',   name: '岩石', assetType: 'rock',   cost: 5,  trophic: 'neutral',   symbiosisHint: '点缀风景（无共生）' },
};

/** 共生触发的相邻判定半径（世界单位） */
export const SYMBIOSIS_RADIUS = 6;

export interface SymbiosisResult {
  /** 连锁等级 0~3，0 表示未触发 */
  chain: number;
  /** 本次放置奖励的 Eco */
  ecoBonus: number;
  /** 是否触发"食物链闭合"翻倍 */
  doubled: boolean;
  /** 反馈文字，空串表示无连锁 */
  label: string;
}

const NO_SYMBIOSIS: SymbiosisResult = { chain: 0, ecoBonus: 0, doubled: false, label: '' };

const isTree = (t: string) => t === 'treeA' || t === 'treeB';

function hasNeighbor(
  assets: PlacedAsset[],
  pos: { x: number; z: number },
  match: (a: PlacedAsset) => boolean,
): boolean {
  const r2 = SYMBIOSIS_RADIUS * SYMBIOSIS_RADIUS;
  return assets.some((a) => {
    if (!match(a)) return false;
    const dx = a.position.x - pos.x;
    const dz = a.position.z - pos.z;
    return dx * dx + dz * dz < r2;
  });
}

/**
 * 在 pos 放下 placedType 后，结合岛上已有 assets 评估共生连锁。
 * 规则对称：无论先打树还是先打鹿，靠在一起都触发，鼓励玩家自由排序。
 */
export function evaluateSymbiosis(
  placedType: PlacedAsset['type'],
  pos: { x: number; z: number },
  assets: PlacedAsset[],
): SymbiosisResult {
  // x3 食物链闭合：狼旁有鹿
  if (placedType === 'wolf' && hasNeighbor(assets, pos, (a) => a.type === 'deer')) {
    return { chain: 3, ecoBonus: 30, doubled: true, label: '🐺 食物链闭合！本季 Eco 翻倍' };
  }
  // x2 鹿群觅食：鹿旁有树，或树旁有鹿
  if (placedType === 'deer' && hasNeighbor(assets, pos, (a) => isTree(a.type))) {
    return { chain: 2, ecoBonus: 16, doubled: false, label: '🦌 鹿群觅食 连锁 x2' };
  }
  if (isTree(placedType) && hasNeighbor(assets, pos, (a) => a.type === 'deer')) {
    return { chain: 2, ecoBonus: 16, doubled: false, label: '🦌 鹿群觅食 连锁 x2' };
  }
  // x1 水土丰茂：树旁有水源，或水源旁有树
  if (isTree(placedType) && hasNeighbor(assets, pos, (a) => a.type === 'spring')) {
    return { chain: 1, ecoBonus: 8, doubled: false, label: '🌿 水土丰茂' };
  }
  if (placedType === 'spring' && hasNeighbor(assets, pos, (a) => isTree(a.type))) {
    return { chain: 1, ecoBonus: 8, doubled: false, label: '🌿 水土丰茂' };
  }
  return NO_SYMBIOSIS;
}

/** 起始牌库（会被打乱后逐张抽取） */
export const STARTING_DECK: FlourishCardId[] = [
  'oak', 'oak', 'oak', 'pine', 'pine',
  'spring', 'spring', 'spring',
  'deer', 'deer', 'wolf', 'rock',
];

/** 手牌上限 */
export const HAND_SIZE = 4;

/** 每推进一个季节回收的 Eco（基础产出，再叠加生态被动产出） */
export const SEASON_BASE_ECO = 20;

/** Fisher–Yates 洗牌，返回新数组 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
