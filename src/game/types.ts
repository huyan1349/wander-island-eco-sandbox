export type ToolType = 'none' | 'treeA' | 'treeB' | 'rock' | 'deer' | 'wolf' | 'seagull' | 'dolphin' | 'fish' | 'spring' | 'pond' | 'water_flow' | 'waterfall' | 'streetlamp' | 'terrainUp' | 'terrainDown' | 'eraser' | 'house' | 'windmill' | 'lighthouse' | 'platform' | 'pier' | 'boat' | 'raft' | 'bridge' | 'bridge_pillar' | 'rope' | 'pave' | 'sub_island' | 'birdhouse' | 'hoe' | 'seed_wheat' | 'seed_carrot' | 'tent' | 'campfire' | 'fence' | 'well' | 'bench' | 'balloon' | 'balloon_ladder' | 'balloon_bridge' | 'spirit_tree' | 'observatory' | 'ruins_arch' | 'waterwheel' | 'cherry_tree' | 'bamboo' | 'pine_tree' | 'willow_tree' | 'bush' | 'sign' | 'mailbox' | 'lantern_girl' | 'track' | 'train';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'snowy' | 'stormy';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type BiomeType = 'default' | 'forest' | 'desert' | 'tundra' | 'volcanic';

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface PlacedAsset {
  id: string;
  type: 'treeA' | 'treeB' | 'rock' | 'deer' | 'wolf' | 'seagull' | 'dolphin' | 'fish' | 'spring' | 'pond' | 'water_flow' | 'waterfall' | 'streetlamp' | 'house' | 'windmill' | 'lighthouse' | 'platform' | 'pier' | 'boat' | 'raft' | 'bridge' | 'bridge_pillar' | 'rope' | 'sub_island' | 'birdhouse' | 'hoe' | 'farmland' | 'crop_wheat' | 'crop_carrot' | 'tent' | 'campfire' | 'fence' | 'well' | 'bench' | 'balloon' | 'balloon_ladder' | 'balloon_bridge' | 'spirit_tree' | 'observatory' | 'ruins_arch' | 'waterwheel' | 'cherry_tree' | 'bamboo' | 'pine_tree' | 'willow_tree' | 'bush' | 'sign' | 'mailbox' | 'lantern_girl' | 'track' | 'train';
  position: Vector3Data;
  rotation: Vector3Data;
  scale?: number;
  customState?: string;
  text?: string;
  growthProgress?: number;
  plantedAt?: number;
  connections?: string[];
  terrain?: {
    positions: number[];
    types: number[];
    size: number;
    segments: number;
  };
}

export interface VFX {
  id: number;
  type: 'dust' | 'splash' | 'blood';
  position: Vector3Data;
}

export type GameScreen = 'TITLE' | 'LOGIN' | 'ONBOARD' | 'SAVE_SELECT' | 'PLAYING';

export interface AuthUser {
  id: string;
  username: string;
  avatar: string;
  motto: string;
  visitorCount?: number;
  memberNo?: number;
  residentNo?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'online' | 'offline' | 'friend_request' | 'info';
  createdAt: number;
}

export interface VisitingIsland {
  islandId: string;
  islandName: string;
  ownerName: string;
  data: any;
}

export interface SaveSlot {
  id: string;
  name: string;
  lastPlayed: number;
  ecoPoints: number;
  playtime: number;
}
