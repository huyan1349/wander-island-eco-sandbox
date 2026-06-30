export const DEFAULT_UNLOCKED_ASSET_IDS = [
  'treeA',
  'treeB',
  'cherry_tree',
  'bamboo',
  'pine_tree',
  'willow_tree',
  'bush',
  'rock',
  'terrainUp',
  'terrainDown',
  'eraser',
  'deer',
  'wolf',
  'seagull',
  'dolphin',
  'fish',
  'spring',
  'pond',
  'water_flow',
  'waterfall',
  'streetlamp',
  'house',
  'windmill',
  'lighthouse',
  'platform',
  'boat',
  'raft',
  'bridge',
  'rope',
  'sub_island',
  'birdhouse',
  'hoe',
  'seed_wheat',
  'seed_carrot',
  'tent',
  'campfire',
  'fence',
  'well',
  'bench',
  'balloon',
  'balloon_ladder',
  'balloon_bridge',
  'spirit_tree',
  'observatory',
  'ruins_arch',
  'waterwheel',
  'lantern_girl',
] as const;

export function getDefaultUnlockedAssets(): string[] {
  return [...DEFAULT_UNLOCKED_ASSET_IDS];
}

export function mergeDefaultUnlockedAssets(unlocked: unknown): string[] {
  const saved = Array.isArray(unlocked) ? unlocked.filter((id): id is string => typeof id === 'string') : [];
  return Array.from(new Set([...saved, ...DEFAULT_UNLOCKED_ASSET_IDS]));
}
