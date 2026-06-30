import type { ToolType } from '../store';

export const CONTINUOUS_DRAG_TOOLS = new Set<ToolType>([
  'terrainUp', 'terrainDown', 'eraser', 'pave', 'treeA', 'treeB', 'rock', 'pond', 'spring',
]);

export const OBJECT_DRAG_TOOLS = new Set<ToolType>([
  'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock',
  'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot',
  'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel',
]);

export const GREEN_BURST_TOOLS = new Set<ToolType>([
  'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush',
  'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot',
  'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel',
]);

export const GRAY_BURST_TOOLS = new Set<ToolType>(['terrainUp', 'terrainDown', 'rock', 'pave']);

export const PLACEABLE_TOOLS = new Set<ToolType>([
  'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock',
  'deer', 'wolf', 'seagull', 'dolphin', 'fish', 'spring', 'pond', 'streetlamp',
  'lantern_girl', 'house', 'windmill', 'lighthouse', 'platform', 'pier', 'boat', 'raft',
  'bridge_pillar', 'sub_island', 'birdhouse', 'balloon', 'balloon_ladder', 'balloon_bridge',
  'tent', 'campfire', 'fence', 'well', 'bench', 'sign', 'mailbox', 'hoe', 'seed_wheat',
  'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel', 'train',
]);

export const VERTICAL_TOOLS = new Set<ToolType>([
  'house', 'windmill', 'lighthouse', 'streetlamp', 'lantern_girl', 'sub_island',
  'bridge_pillar', 'balloon', 'balloon_ladder', 'balloon_bridge', 'tent', 'campfire',
  'fence', 'well', 'bench', 'sign', 'mailbox', 'hoe', 'seed_wheat', 'seed_carrot',
  'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel', 'treeA', 'treeB',
  'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'train',
]);

export const FIXED_ROTATION_TOOLS = new Set<ToolType>([
  'bridge_pillar', 'tent', 'campfire', 'well', 'bench', 'sign', 'mailbox', 'hoe',
  'seed_wheat', 'seed_carrot', 'observatory', 'ruins_arch', 'waterwheel',
]);

export const BUILD_PREVIEW_TOOLS = new Set<ToolType>(['platform', 'pier', 'sub_island', 'bridge']);
