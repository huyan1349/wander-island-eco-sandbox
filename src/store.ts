import { create } from 'zustand';
import { AudioSystem } from './lib/audio';
import { getGlobalXP, addGlobalXP, levelFromXP } from './lib/globalProgress';
import { getCiAffinity, addCiAffinity, getCiMemory, addCiMemory as addCiMemoryEntry, getCiMemorySummary } from './lib/ciProgress';
import type { BrushMode, BrushFalloff, SurfaceType } from './utils/terrainBrush';
import { FlourishCardId, FLOURISH_CARDS, STARTING_DECK, HAND_SIZE, SEASON_BASE_ECO, evaluateSymbiosis, shuffle } from './game/flourish';
import { getTerrainHeight } from './utils/terrain';
import { pickFragment } from './game/fragments';
import { loadUnlocked, saveUnlocked } from './game/constellations';
import { snapFloatingPlatformPlacement } from './utils/platformPlacement';

export type ToolType = 'none' | 'treeA' | 'treeB' | 'rock' | 'deer' | 'wolf' | 'seagull' | 'dolphin' | 'fish' | 'spring' | 'pond' | 'water_flow' | 'waterfall' | 'streetlamp' | 'terrainUp' | 'terrainDown' | 'eraser' | 'house' | 'windmill' | 'lighthouse' | 'platform' | 'pier' | 'boat' | 'bridge' | 'bridge_pillar' | 'rope' | 'pave' | 'sub_island' | 'birdhouse' | 'hoe' | 'seed_wheat' | 'seed_carrot' | 'tent' | 'campfire' | 'fence' | 'well' | 'bench' | 'balloon' | 'balloon_ladder' | 'balloon_bridge' | 'spirit_tree' | 'observatory' | 'ruins_arch' | 'waterwheel' | 'cherry_tree' | 'bamboo' | 'pine_tree' | 'willow_tree' | 'bush' | 'sign' | 'mailbox' | 'lantern_girl';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'snowy' | 'stormy';

// 辞向玩家播报天气时的诗意文案（每种天气随机取一句）
const FORECAST_LINES: Record<WeatherType, string[]> = {
  sunny: ['天要放晴了，阳光会把岛照得发亮。', '云散了，是个好天气。'],
  cloudy: ['云正慢慢聚拢，光会变得温柔。', '天色要暗一点了，云在路上。'],
  rainy: ['我闻到雨的气息了，草会喝饱水。', '要下雨了，听见远处的潮声了吗。'],
  foggy: ['雾要漫上来了，岛会变得朦胧。', '一层雾正靠近，看不太远了。'],
  snowy: ['要下雪了……岛会安静下来。', '第一片雪快落了，记得留意。'],
  stormy: ['风暴在路上，把松动的东西收一收吧。', '雷云压过来了，今晚不太平静。'],
};
function pickForecastLine(w: WeatherType): string {
  const lines = FORECAST_LINES[w] || FORECAST_LINES.sunny;
  return lines[Math.floor(Math.random() * lines.length)];
}

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface PlacedAsset {
  id: string;
  type: 'treeA' | 'treeB' | 'rock' | 'deer' | 'wolf' | 'seagull' | 'dolphin' | 'fish' | 'spring' | 'pond' | 'water_flow' | 'waterfall' | 'streetlamp' | 'house' | 'windmill' | 'lighthouse' | 'platform' | 'pier' | 'boat' | 'bridge' | 'bridge_pillar' | 'rope' | 'sub_island' | 'birdhouse' | 'hoe' | 'farmland' | 'crop_wheat' | 'crop_carrot' | 'tent' | 'campfire' | 'fence' | 'well' | 'bench' | 'balloon' | 'balloon_ladder' | 'balloon_bridge' | 'spirit_tree' | 'observatory' | 'ruins_arch' | 'waterwheel' | 'cherry_tree' | 'bamboo' | 'pine_tree' | 'willow_tree' | 'bush' | 'sign' | 'mailbox' | 'lantern_girl';
  position: Vector3Data;
  rotation: Vector3Data;
  scale?: number;
  customState?: string;
  text?: string; // 牌子文字
  growthProgress?: number;
  plantedAt?: number;
  connections?: string[]; // IDs of connected objects (for ropes/bridges)
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
  memberNo?: number; residentNo?: number;
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

export const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/></linearGradient><linearGradient id="g2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs><rect width="120" height="120" fill="url(#g1)"/><circle cx="60" cy="45" r="24" fill="url(#g2)" opacity="0.9"/><path d="M10 100 L60 40 L110 100 Z" fill="#0f172a" opacity="0.7"/><path d="M45 100 L80 50 L115 100 Z" fill="#020617" opacity="0.6"/></svg>`;
export const AVATAR_PRESETS = [
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`,
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Wander&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Wander&backgroundColor=b6e3f4'
];
const DEFAULT_AVATAR = AVATAR_PRESETS[1];

interface GameState {
  screen: GameScreen;
  setScreen: (screen: GameScreen) => void;

  isSplashDone: boolean;
  setIsSplashDone: (val: boolean) => void;

  // 新手登岛欢迎引导（注册后首次进岛显示「辞」气泡）
  showWelcomeGuide: boolean;
  setShowWelcomeGuide: (val: boolean) => void;

  // Auth
  authUser: AuthUser | null;
  setAuthUser: (user: AuthUser | null) => void;
  clearAuthUser: () => void;

  // Toasts
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;

  // Visiting
  visitingIsland: VisitingIsland | null;
  setVisitingIsland: (island: VisitingIsland | null) => void;
  isVisiting: boolean;
  enterVisiting: (island: VisitingIsland) => void;
  exitVisiting: () => void;

  // Unread
  unreadCount: number;
  setUnreadCount: (count: number) => void;

  // Server island ID mapping (local save id -> server island id)
  serverIslandMap: Record<string, string>;
  setServerIslandMap: (map: Record<string, string>) => void;

  islandId: string | null;
  islandName: string;
  setIslandInfo: (id: string, name: string) => void;
  
  stats: { playtime: number; itemsPlaced: number };
  incrementPlaytime: (delta: number) => void;
  incrementItemsPlaced: () => void;

  timeOfDay: number; // 0-24
  setTimeOfDay: (time: number) => void;
  isTimeScrubbing: boolean;
  setIsTimeScrubbing: (scrubbing: boolean) => void;
  timeSpeed: number; // 1 = 1 real minute per game hour
  setTimeSpeed: (speed: number) => void;
  hasMovedCamera: boolean;
  setHasMovedCamera: (moved: boolean) => void;
  cameraFollowId: string | null;
  setCameraFollowId: (id: string | null) => void;

  tutorialPanDone: boolean;
  setTutorialPanDone: (done: boolean) => void;
  tutorialPanProgress: number;
  setTutorialPanProgress: (p: number) => void;
  
  tutorialRotateDone: boolean;
  setTutorialRotateDone: (done: boolean) => void;
  tutorialRotateProgress: number;
  setTutorialRotateProgress: (p: number) => void;
  
  tutorialZoomDone: boolean;
  setTutorialZoomDone: (done: boolean) => void;
  tutorialZoomProgress: number;
  setTutorialZoomProgress: (p: number) => void;

  weather: WeatherType;
  setWeather: (weather: WeatherType) => void;
  forecast: WeatherType[];
  advanceDay: () => void;
  // 随机天气来临时，辞向玩家播报的天气预报弹窗数据（null = 不显示）
  forecastAlert: { weather: WeatherType; forecast: WeatherType[]; line: string; at: number } | null;
  rollWeather: () => void;
  clearForecastAlert: () => void;

  waveIntensity: number;
  setWaveIntensity: (v: number) => void;

  balloonColor: string;
  setBalloonColor: (c: string) => void;
  balloonStyle: 'lowpoly' | 'striped';
  setBalloonStyle: (s: 'lowpoly' | 'striped') => void;
  
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  setSeason: (season: 'spring' | 'summer' | 'autumn' | 'winter') => void;

  biome: 'default' | 'forest' | 'desert' | 'tundra' | 'volcanic';
  setBiome: (biome: 'default' | 'forest' | 'desert' | 'tundra' | 'volcanic') => void;
  titleTheme: 'white' | 'blue';
  setTitleTheme: (theme: 'white' | 'blue') => void;
  
  selectedTool: ToolType;
  setSelectedTool: (tool: ToolType) => void;
  connectingPillarId: string | null;
  setConnectingPillarId: (id: string | null) => void;
  
  assets: PlacedAsset[];
  addAsset: (asset: Omit<PlacedAsset, 'id'>) => void;
  updateAsset: (id: string, updater: (asset: PlacedAsset) => PlacedAsset) => void;
  removeAsset: (id: string) => void;
  removeAssetAt: (position: Vector3Data, radius: number) => void;
  _history: PlacedAsset[][];
  _future: PlacedAsset[][];
  undo: () => void;
  redo: () => void;
  
  grassHealth: number; // 0-100
  setGrassHealth: (health: number) => void;

  awakening: number; // 0-100 岛屿苏醒度（主线脊柱：缓慢、只升，持续健康才涨；驱动后续生长/奇观/碎片/辞）
  bumpAwakening: (delta: number) => void;

  deerCount: number;
  wolfCount: number;
  updateEcology: () => void;

  terrainData: {
    positions: Float32Array | null;
    types: Uint8Array | null;
    size: number;
    segments: number;
  };
  setTerrainData: (positions: Float32Array, types: Uint8Array, size: number, segments: number) => void;

  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;

  getSavedSlots: () => SaveSlot[];
  createSaveSlot: (name: string) => void;
  deleteSaveSlot: (id: string) => void;
  saveGame: () => void;
  loadGame: (id?: string, keepTitleScreen?: boolean) => void;
  clearAll: () => void;

  playerName: string;
  setPlayerName: (name: string) => void;
  playerAvatar: string;
  setPlayerAvatar: (avatar: string) => void;
  playerXP: number;
  playerLevel: number;
  addXP: (amount: number) => void;
  
  ecoPoints: number;
  setEcoPoints: (points: number) => void;
  spendEcoPoints: (amount: number) => boolean;

  unlockedAssets: string[];
  unlockAsset: (assetId: string, cost: number) => boolean;

  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  drivingBoatId: string | null;
  setDrivingBoatId: (id: string | null) => void;
  editingSignId: string | null;
  setEditingSignId: (id: string | null) => void;
  focusPoint: [number, number, number] | null;
  setFocusPoint: (point: [number, number, number] | null) => void;
  online: boolean; // 是否在归隐之岛(联机公共服务器)
  setOnline: (v: boolean) => void;
  mailboxOpen: boolean; // 点击岛上信箱物件打开
  setMailboxOpen: (v: boolean) => void;
  brushMode: BrushMode;
  brushSize: number;
  brushStrength: number;
  brushFalloff: BrushFalloff;
  brushPaintType: SurfaceType;
  setBrushMode: (m: BrushMode) => void;
  setBrushSize: (n: number) => void;
  setBrushStrength: (n: number) => void;
  setBrushFalloff: (f: BrushFalloff) => void;
  setBrushPaintType: (t: SurfaceType) => void;
  openPlayerPanel: boolean; // 用户面板开关（头像 / 左边栏按钮共用）
  setOpenPlayerPanel: (v: boolean) => void;
  panelInitialTab: string | null; // 打开用户面板时定位到的标签
  setPanelInitialTab: (t: string | null) => void;
  panelInitialSocialTab: string | null; // 打开社交标签时定位到的子标签（如 'chat'）
  setPanelInitialSocialTab: (t: string | null) => void;
  
  aiNarration: string | null;
  setAiNarration: (narration: string | null) => void;

  // 辞（岛灵）状态
  ci: {
    affinity: number;
    lastSpokenAt: number;
    memory: string[];
    bubble: string | null;
    bubbleAt: number;
  };
  ciSay: (line: string) => void;
  addAffinity: (n: number) => void;
  setCiBubble: (s: string | null) => void;
  clearCiBubble: () => void;

  // 叙事碎片：向神树祈愿偶得的小卡片
  collectedFragments: string[];
  pendingFragment: string | null; // 正在「起源」揭示中的碎片 id (触发 3D 树叶)
  setPendingFragment: (id: string | null) => void;
  awardFragment: () => void;
  dismissFragment: () => void;
  pray: () => void;
  
  cameraFocus: [number, number, number] | null;
  setCameraFocus: (target: [number, number, number] | null) => void;

  isObservatoryMode: boolean;
  setObservatoryMode: (active: boolean) => void;
  observatoryPos: [number, number, number] | null; // 当前观测的观星台世界坐标
  setObservatoryPos: (p: [number, number, number]) => void;
  // 星图：已连成解锁的星座 id（持久化），连成时弹出对应星卡
  unlockedConstellations: string[];
  revealedStarCardId: string | null; // 正在揭晓的星卡（星座 id），null=无
  unlockConstellation: (id: string) => void;
  dismissStarCard: () => void;

  lastPlacedSynergy: { type: string, position: Vector3Data, id: number } | null;
  setLastPlacedSynergy: (synergy: { type: string, position: Vector3Data, id: number } | null) => void;

  vfxQueue: VFX[];
  spawnVFX: (type: VFX['type'], position: Vector3Data) => void;
  removeVFX: (id: number) => void;

  // 生生不息 (Flourish) 策略模式
  mode: 'creative' | 'flourish';
  setMode: (m: 'creative' | 'flourish') => void;
  hand: FlourishCardId[];
  drawPile: FlourishCardId[];
  seasonTurn: number;
  pendingCard: FlourishCardId | null;
  lastChainLabel: string | null;
  startFlourish: () => void;
  selectCard: (id: FlourishCardId) => void;
  cancelCard: () => void;
  advanceSeason: () => void;

  // 拍照模式
  isPhotoMode: boolean;
  setPhotoMode: (active: boolean) => void;
  photoSettings: {
    focalLength: number;
    focusDistance: number;
    focusTarget: [number, number, number] | null;
    bokehScale: number;
    filter: 'default' | 'cinematic' | 'vintage' | 'cyberpunk' | 'blackwhite';
    watermark: boolean;
    watermarkText: string;
  };
  setPhotoSettings: (settings: Partial<GameState['photoSettings']>) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'TITLE',
  setScreen: (screen) => set({ screen }),

  isSplashDone: false,
  setIsSplashDone: (val) => set({ isSplashDone: val }),

  showWelcomeGuide: false,
  setShowWelcomeGuide: (val) => set({ showWelcomeGuide: val }),

  // Auth
  authUser: null,
  setAuthUser: (user) => {
    if (user && user.avatar && user.avatar.includes('robohash')) {
      user.avatar = DEFAULT_AVATAR;
    }
    set({ authUser: user });
  },
  clearAuthUser: () => set({ authUser: null, screen: 'LOGIN' as GameScreen }),

  // Toasts
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const toast: ToastItem = { id, message, type, createdAt: Date.now() };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  // Visiting
  visitingIsland: null,
  setVisitingIsland: (island) => set({ visitingIsland: island }),
  isVisiting: false,
  enterVisiting: (island) => {
    const st = get();
    if (!st.isVisiting && st.islandId) st.saveGame();
    const d = (island && island.data) || {};
    set({
      visitingIsland: island,
      isVisiting: true,
      screen: "PLAYING",
      timeOfDay: 6,
      weather: d.weather || "sunny",
      assets: Array.isArray(d.assets) ? d.assets : [],
      grassHealth: typeof d.grassHealth === "number" ? d.grassHealth : 100,
      deerCount: d.deerCount || 0,
      wolfCount: d.wolfCount || 0,
      terrainData: {
        ...st.terrainData,
        positions: d.terrainPositions ? new Float32Array(d.terrainPositions) : null,
        types: d.terrainTypes ? new Uint8Array(d.terrainTypes) : null
      }
    });
  },
  exitVisiting: () => {
    const st = get();
    set({ isVisiting: false, visitingIsland: null });
    if (st.islandId) st.loadGame(st.islandId, false);
  },

  // Unread
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),

  // Server island mapping
  serverIslandMap: {},
  setServerIslandMap: (map) => set({ serverIslandMap: map }),

  islandId: null,
  islandName: 'Wander Island',
  setIslandInfo: (id, name) => set({ islandId: id, islandName: name }),

  stats: { playtime: 0, itemsPlaced: 0 },
  incrementPlaytime: (delta) => set((state) => ({ stats: { ...state.stats, playtime: state.stats.playtime + delta } })),
  incrementItemsPlaced: () => set((state) => ({ stats: { ...state.stats, itemsPlaced: state.stats.itemsPlaced + 1 } })),

  timeOfDay: 6,
  setTimeOfDay: (time) => set({ timeOfDay: time }),
  isTimeScrubbing: false,
  setIsTimeScrubbing: (scrubbing) => set({ isTimeScrubbing: scrubbing }),
  hasMovedCamera: false,
  setHasMovedCamera: (moved) => set({ hasMovedCamera: moved }),
  cameraFollowId: null,
  setCameraFollowId: (id) => set({ cameraFollowId: id }),
  timeSpeed: 1,
  setTimeSpeed: (speed) => set({ timeSpeed: speed }),

  tutorialPanDone: false,
  setTutorialPanDone: (done) => set({ tutorialPanDone: done }),
  tutorialPanProgress: 0,
  setTutorialPanProgress: (p) => set({ tutorialPanProgress: p }),

  tutorialRotateDone: false,
  setTutorialRotateDone: (done) => set({ tutorialRotateDone: done }),
  tutorialRotateProgress: 0,
  setTutorialRotateProgress: (p) => set({ tutorialRotateProgress: p }),

  tutorialZoomDone: false,
  setTutorialZoomDone: (done) => set({ tutorialZoomDone: done }),
  tutorialZoomProgress: 0,
  setTutorialZoomProgress: (p) => set({ tutorialZoomProgress: p }),
  
  weather: 'sunny',
  setWeather: (weather) => set({ weather: weather }),
  forecast: ['cloudy', 'rainy', 'sunny'],
  forecastAlert: null,
  advanceDay: () => set((state) => {
    const types: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'foggy', 'snowy', 'stormy'];
    const nextForecast = [...state.forecast];
    const today = nextForecast.shift() || 'sunny';
    nextForecast.push(types[Math.floor(Math.random() * types.length)]);
    const alert = today !== state.weather
      ? { weather: today, forecast: nextForecast, line: pickForecastLine(today), at: Date.now() }
      : state.forecastAlert;
    return { weather: today, forecast: nextForecast, forecastAlert: alert };
  }),
  // 随机推进一档天气（不跨天），并让辞向玩家播报预报
  rollWeather: () => set((state) => {
    const types: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'foggy', 'snowy', 'stormy'];
    const nextForecast = [...state.forecast];
    const today = nextForecast.shift() || 'sunny';
    nextForecast.push(types[Math.floor(Math.random() * types.length)]);
    if (today === state.weather) return { forecast: nextForecast }; // 没变就不打扰
    return {
      weather: today,
      forecast: nextForecast,
      forecastAlert: { weather: today, forecast: nextForecast, line: pickForecastLine(today), at: Date.now() },
    };
  }),
  clearForecastAlert: () => set({ forecastAlert: null }),

  waveIntensity: 1.0,
  setWaveIntensity: (v) => set({ waveIntensity: v }),

  balloonColor: '#e11d48',
  setBalloonColor: (c) => set({ balloonColor: c }),
  balloonStyle: 'lowpoly',
  setBalloonStyle: (s) => set({ balloonStyle: s }),
  
  season: 'summer',
  setSeason: (season) => set({ season: season }),

  biome: 'default',
  setBiome: (biome) => set({ biome: biome }),
  titleTheme: 'white',
  setTitleTheme: (theme) => set({ titleTheme: theme }),
  
  selectedTool: 'none',
  setSelectedTool: (tool) => set({ selectedTool: tool, connectingPillarId: null }),
  connectingPillarId: null,
  setConnectingPillarId: (id) => set({ connectingPillarId: id }),
  
  playerName: 'wander',
  setPlayerName: (name) => set({ playerName: name }),
  playerAvatar: DEFAULT_AVATAR,
  setPlayerAvatar: (avatar) => set({ playerAvatar: avatar }),
  playerXP: getGlobalXP(),                 // 全局：跨所有小岛累加
  playerLevel: levelFromXP(getGlobalXP()),
  addXP: (amount) => {
     const newXP = addGlobalXP(amount);
     return set({ playerXP: newXP, playerLevel: levelFromXP(newXP) });
  },
  
  ecoPoints: 200, // Initial budget
  setEcoPoints: (points) => set({ ecoPoints: points }),
  spendEcoPoints: (amount) => {
     const state = get();
     if (state.ecoPoints >= amount) {
         set({ ecoPoints: state.ecoPoints - amount });
         return true;
     }
     return false;
  },

  unlockedAssets: [
    'treeA', 'treeB', 'rock', 'terrainUp', 'terrainDown', 'eraser',
    'deer', 'wolf', 'seagull', 'dolphin', 'fish', 'spring', 'pond', 'water_flow', 'waterfall', 'streetlamp', 'house', 'windmill',
    'lighthouse', 'platform', 'boat', 'bridge', 'rope', 'sub_island', 'birdhouse',
    'hoe', 'seed_wheat', 'seed_carrot', 'tent', 'campfire', 'fence', 'well', 'bench', 'balloon', 'balloon_ladder', 'balloon_bridge', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel', 'lantern_girl'
  ],
  unlockAsset: (assetId, cost) => {
      const state = get();
      if (state.ecoPoints >= cost && !state.unlockedAssets.includes(assetId)) {
          set({ 
              ecoPoints: state.ecoPoints - cost, 
              unlockedAssets: [...state.unlockedAssets, assetId] 
          });
          return true;
      }
      return false;
  },

  selectedEntityId: null,
  setSelectedEntityId: (id) => set({ selectedEntityId: id }),
  drivingBoatId: null,
  setDrivingBoatId: (id) => set({ drivingBoatId: id }),
  editingSignId: null,
  setEditingSignId: (id) => set({ editingSignId: id }),
  focusPoint: null,
  setFocusPoint: (p) => set({ focusPoint: p }),
  online: false,
  setOnline: (v) => set({ online: v }),
  mailboxOpen: false,
  setMailboxOpen: (v) => set({ mailboxOpen: v }),
  brushMode: 'raise',
  brushSize: 3.5,
  brushStrength: 0.5,
  setBrushMode: (m) => set({ brushMode: m }),
  setBrushSize: (n) => set({ brushSize: n }),
  setBrushStrength: (n) => set({ brushStrength: n }),
  brushFalloff: 'smooth',
  brushPaintType: 2,
  setBrushFalloff: (f) => set({ brushFalloff: f }),
  setBrushPaintType: (t) => set({ brushPaintType: t }),
  openPlayerPanel: false,
  setOpenPlayerPanel: (v) => set({ openPlayerPanel: v }),
  panelInitialTab: null,
  setPanelInitialTab: (t) => set({ panelInitialTab: t }),
  panelInitialSocialTab: null,
  setPanelInitialSocialTab: (t) => set({ panelInitialSocialTab: t }),
  
  aiNarration: null,
  setAiNarration: (narration) => set({ aiNarration: narration }),

  // ===== 辞（岛灵）状态 =====
  ci: {
    affinity: getCiAffinity(),
    lastSpokenAt: 0,
    memory: getCiMemory().map(m => m.text),
    bubble: null,
    bubbleAt: 0,
  },
  ciSay: (line) => {
    const state = get();
    const now = Date.now();
    // 10s 节流：距离上次说话不足 10s 则跳过，避免辞连发气泡话痨
    if (now - state.ci.lastSpokenAt < 10000) return;
    const newAffinity = addCiAffinity(1);
    addCiMemoryEntry({ text: line, at: now, type: 'event' });
    set({
      ci: {
        ...state.ci,
        bubble: line,
        bubbleAt: now,
        lastSpokenAt: now,
        affinity: newAffinity,
        memory: getCiMemory().map(m => m.text),
      }
    });
  },
  addAffinity: (n) => {
    const newAffinity = addCiAffinity(n);
    set((state) => ({ ci: { ...state.ci, affinity: newAffinity } }));
  },

  // ===== 叙事碎片 =====
  collectedFragments: [],
  pendingFragment: null,
  setPendingFragment: (id) => set({ pendingFragment: id }),
  awardFragment: () => {
    import('./game/fragments').then(({ pickFragment }) => {
      const frag = pickFragment(get().collectedFragments);
      set({ pendingFragment: frag.id });
    });
  },
  dismissFragment: () => {
    const id = get().pendingFragment;
    set(state => ({
      pendingFragment: null,
      collectedFragments: id && !state.collectedFragments.includes(id)
        ? [...state.collectedFragments, id]
        : state.collectedFragments,
    }));
  },
  pray: () => {
    const lines = [
      '你来许愿了……神树听见了，叶子落下来作回应。',
      '把心愿交给岛吧，它记性很好，从不弄丢谁的话。',
      '我替这棵树谢谢你——它已经很久没被人这样郑重地对待了。',
      '风停了一瞬。这一刻，整座岛都在听你。',
    ];
    const now = Date.now();
    // 绕过 ciSay 的 10s 节流，祈愿必有回应
    set((s) => ({ ci: { ...s.ci, bubble: lines[Math.floor(Math.random() * lines.length)], bubbleAt: now, lastSpokenAt: now } }));
    get().addAffinity(1);
    get().bumpAwakening(2);
    get().awardFragment();
  },
  setCiBubble: (s) => {
    set((state) => ({
      ci: { ...state.ci, bubble: s, bubbleAt: s ? Date.now() : state.ci.bubbleAt }
    }));
  },
  clearCiBubble: () => {
    set((state) => ({ ci: { ...state.ci, bubble: null } }));
  },

  cameraFocus: null,
  setCameraFocus: (target) => set({ cameraFocus: target }),

  isObservatoryMode: false,
  // 开镜时从 localStorage 刷新已解锁星座，保证跨地图/存档不丢进度
  setObservatoryMode: (active) => set(active ? { isObservatoryMode: true, unlockedConstellations: loadUnlocked() } : { isObservatoryMode: false }),
  observatoryPos: null,
  setObservatoryPos: (p) => set({ observatoryPos: p }),
  unlockedConstellations: loadUnlocked(),
  revealedStarCardId: null,
  unlockConstellation: (id) => {
    if (get().unlockedConstellations.includes(id)) return; // 已解锁不重复发卡
    const next = [...get().unlockedConstellations, id];
    saveUnlocked(next);
    set({ unlockedConstellations: next, revealedStarCardId: id });
  },
  dismissStarCard: () => set({ revealedStarCardId: null }),

  isPhotoMode: false,
  setPhotoMode: (active) => set({ isPhotoMode: active }),
  photoSettings: {
    focalLength: 0.02,
    focusDistance: 0.05,
    focusTarget: null,
    bokehScale: 8.0,
    filter: 'default',
    watermark: true,
    watermarkText: 'Wander Island',
  },
  setPhotoSettings: (settings) => set((state) => ({ photoSettings: { ...state.photoSettings, ...settings } })),

  lastPlacedSynergy: null,
  setLastPlacedSynergy: (synergy) => set({ lastPlacedSynergy: synergy }),

  vfxQueue: [],
  spawnVFX: (type, position) => set((state) => ({ 
      vfxQueue: [...state.vfxQueue, { id: Date.now() + Math.random(), type, position }] 
  })),
  removeVFX: (id) => set((state) => ({ 
      vfxQueue: state.vfxQueue.filter(v => v.id !== id) 
  })),

  assets: [],
  _history: [],
  _future: [],
  updateAsset: (id, updater) => set((state) => ({
    assets: state.assets.map((asset) => asset.id === id ? updater(asset) : asset)
  })),
  addAsset: (assetData) => {
    // 农田要求地面平整：脚下范围起伏过大则拒绝放置，提示先整平（避免平面农田穿模）
    if (assetData.type === 'farmland') {
      const { x, z } = assetData.position;
      const samples = [[0, 0], [1.1, 1.1], [-1.1, 1.1], [1.1, -1.1], [-1.1, -1.1]]
        .map(([ox, oz]) => getTerrainHeight(x + ox, z + oz));
      if (Math.max(...samples) - Math.min(...samples) > 0.5) {
        get().addToast('这块地高低不平，先用「平整地形」把它整平，再来开垦农田', 'info');
        return;
      }
    }
    set((state) => {
    const snappedAssetData = snapFloatingPlatformPlacement(assetData, state.assets);
    const asset: PlacedAsset = {
      ...snappedAssetData,
      id: Math.random().toString(36).substring(2, 9),
      plantedAt: (
        snappedAssetData.type === 'crop_wheat' || snappedAssetData.type === 'crop_carrot'
      ) ? state.stats.playtime : snappedAssetData.plantedAt
    };

    const newAssets = [...state.assets, asset];
    const deerCount = newAssets.filter(a => a.type === 'deer').length;
    const wolfCount = newAssets.filter(a => a.type === 'wolf').length;
    const newXP = addGlobalXP(10);          // 全局经验：放置任意物件 +10
    const newLevel = levelFromXP(newXP);

    // Trigger Shockwave for Synergy Assets
    let synergy = state.lastPlacedSynergy;
    if (asset.type === 'spring' || asset.type === 'windmill' || asset.type === 'treeA' || asset.type === 'treeB') {
        synergy = { type: asset.type, position: asset.position, id: Date.now() };
        AudioSystem.playSynergyChord();
    }
    
    // Auto-spawn visual effects for placed objects
    let newVfxQueue = [...state.vfxQueue];
    const waterAssets = ['pier', 'platform', 'boat', 'bridge_pillar', 'bridge', 'rope'];
    const landAssets = ['house', 'windmill', 'lighthouse', 'treeA', 'treeB', 'rock'];
    
    if (waterAssets.includes(asset.type)) {
        newVfxQueue.push({ id: Date.now() + Math.random(), type: 'splash', position: asset.position });
    } else if (landAssets.includes(asset.type)) {
        newVfxQueue.push({ id: Date.now() + Math.random(), type: 'dust', position: asset.position });
    }

    return {
      assets: newAssets,
      deerCount,
      wolfCount,
      playerXP: newXP,
      playerLevel: newLevel,
      lastPlacedSynergy: synergy,
      vfxQueue: newVfxQueue,
      stats: { ...state.stats, itemsPlaced: state.stats.itemsPlaced + 1 },
      _history: [...state._history, state.assets].slice(-40),
      _future: [],
    };
    });
  },
  removeAsset: (id) => set((state) => {
    const newAssets = state.assets.filter(a => a.id !== id);
    const deerCount = newAssets.filter(a => a.type === 'deer').length;
    const wolfCount = newAssets.filter(a => a.type === 'wolf').length;
    return { assets: newAssets, deerCount, wolfCount, _history: [...state._history, state.assets].slice(-40), _future: [] };
  }),
  removeAssetAt: (position, radius) => set((state) => {
    const newAssets = state.assets.filter(a => {
        const dx = a.position.x - position.x;
        const dz = a.position.z - position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        return dist > radius;
    });
    if (newAssets.length === state.assets.length) return {}; // 没擦到任何东西，不记历史
    const deerCount = newAssets.filter(a => a.type === 'deer').length;
    const wolfCount = newAssets.filter(a => a.type === 'wolf').length;
    return { assets: newAssets, deerCount, wolfCount, _history: [...state._history, state.assets].slice(-40), _future: [] };
  }),
  undo: () => set((state) => {
    if (!state._history.length) return {};
    const prev = state._history[state._history.length - 1];
    return {
      assets: prev,
      _history: state._history.slice(0, -1),
      _future: [...state._future, state.assets].slice(-40),
      deerCount: prev.filter(a => a.type === 'deer').length,
      wolfCount: prev.filter(a => a.type === 'wolf').length,
    };
  }),
  redo: () => set((state) => {
    if (!state._future.length) return {};
    const next = state._future[state._future.length - 1];
    return {
      assets: next,
      _future: state._future.slice(0, -1),
      _history: [...state._history, state.assets].slice(-40),
      deerCount: next.filter(a => a.type === 'deer').length,
      wolfCount: next.filter(a => a.type === 'wolf').length,
    };
  }),
  
  grassHealth: 100,
  setGrassHealth: (health) => set({ grassHealth: health }),

  awakening: 0,
  bumpAwakening: (delta) => set((s) => ({ awakening: Math.max(0, Math.min(100, s.awakening + delta)) })),

  deerCount: 0,
  wolfCount: 0,
  
  updateEcology: () => set((state) => {
    let newHealth = state.grassHealth;
    let currentAssets = [...state.assets];
    let dCount = state.deerCount;
    let wCount = state.wolfCount;
    
    const springs = currentAssets.filter(a => a.type === 'spring');
    const trees = currentAssets.filter(a => a.type === 'treeA' || a.type === 'treeB');
    const windmills = currentAssets.filter(a => a.type === 'windmill');
    
    // Zen Logic: Springs and Rain heal grass.
    newHealth += springs.length * 0.5 + 0.2; 
    if (state.weather === 'rainy') newHealth += 1.0;
    
    // Forest Synergy Logic: Find clusters of 3+ trees within 4 units.
    let forestClusters = 0;
    const checkedTrees = new Set<string>();
    
    for (const tree of trees) {
        if (checkedTrees.has(tree.id)) continue;
        let clusterSize = 1;
        const clusterPos = { x: tree.position.x, y: tree.position.y, z: tree.position.z };
        
        for (const other of trees) {
            if (other.id === tree.id || checkedTrees.has(other.id)) continue;
            const dx = tree.position.x - other.position.x;
            const dz = tree.position.z - other.position.z;
            if (dx*dx + dz*dz < 25) { // Radius 5
                clusterSize++;
                checkedTrees.add(other.id);
            }
        }
        
        if (clusterSize >= 3) {
            forestClusters++;
            // Automatically spawn a deer occasionally if population is low!
            if (dCount < (forestClusters * 2 + 2) && Math.random() < 0.05) {
                const deer: PlacedAsset = {
                    id: Math.random().toString(36).substring(2, 9),
                    type: 'deer',
                    position: { x: clusterPos.x + (Math.random()-0.5)*2, y: clusterPos.y, z: clusterPos.z + (Math.random()-0.5)*2 },
                    rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
                    scale: 0.8 + Math.random() * 0.4
                };
                currentAssets.push(deer);
                dCount++;
            }
        }
    }

    // Deer lightly consume grass if overpopulated, but won't die
    const overgrazingThreshold = 3 + springs.length * 2 + trees.length;
    if (dCount > overgrazingThreshold) {
      newHealth -= (dCount - overgrazingThreshold) * 0.5;
    }
    
    newHealth = Math.max(0, Math.min(100, newHealth));

    // Zen Economy Generation (Passive Eco-Points)
    let passiveEP = 0;
    passiveEP += trees.length * 1; // Trees generate EP automatically
    
    // Coastal Windmill Synergy
    for (const wm of windmills) {
        const distToCenter = Math.sqrt(wm.position.x * wm.position.x + wm.position.z * wm.position.z);
        if (distToCenter > 12) {
             passiveEP += 3; // Coastal winds give 3x EP
        } else {
             passiveEP += 1;
        }
    }

    // Weather synergy: Rain makes plants produce double EP!
    if (state.weather === 'rainy') passiveEP *= 2;
    
    // Reward for maintaining a healthy ecosystem
    if (newHealth > 80) passiveEP += 2;
    
    // Animals generate Zen EP just by existing happily
    if (dCount > 0 && dCount <= overgrazingThreshold) passiveEP += dCount * 2;
    if (wCount > 0) passiveEP += wCount * 5; 

    // Add generated EP to total
    const finalEP = Math.max(0, state.ecoPoints + passiveEP);
    
    // Update Procedural Audio Env Mix
    AudioSystem.updateEcologyState(springs.length, windmills.length, state.weather);

    // 苏醒度（主线脊柱）：持续健康 + 有水有树才缓慢累积；生态崩溃时轻微回落
    let newAwakening = state.awakening;
    if (newHealth > 80 && springs.length > 0 && trees.length > 0) newAwakening += 0.05;
    else if (newHealth < 20) newAwakening -= 0.02;
    newAwakening = Math.max(0, Math.min(100, newAwakening));

    return { grassHealth: newHealth, assets: currentAssets, deerCount: dCount, wolfCount: wCount, ecoPoints: finalEP, awakening: newAwakening };
  }),

  terrainData: {
      positions: null,
      types: null,
      size: 40,
      segments: 64
  },
  setTerrainData: (positions, types, size, segments) => set({ terrainData: { positions, types, size, segments } }),
  isDrawing: false,
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  
  getSavedSlots: () => {
    // 不再伪造写死的 default_01 demo；默认岛由 ensureHomeSlot 用 preset-demo 落地。
    try {
      const indexStr = localStorage.getItem('eco_saves_index');
      return indexStr ? JSON.parse(indexStr) : [];
    } catch {
      return [];
    }
  },

  createSaveSlot: (name) => {
    const id = Date.now().toString();
    const newSlot: SaveSlot = {
      id,
      name,
      lastPlayed: Date.now(),
      ecoPoints: 200,
      playtime: 0
    };
    
    const slots = get().getSavedSlots();
    slots.push(newSlot);
    localStorage.setItem('eco_saves_index', JSON.stringify(slots));
    
    get().clearAll();
    set({ islandId: id, islandName: name, screen: 'PLAYING' });
    get().saveGame();
  },

  deleteSaveSlot: (id) => {
    const slots = get().getSavedSlots().filter(s => s.id !== id);
    localStorage.setItem('eco_saves_index', JSON.stringify(slots));
    localStorage.removeItem(`eco_save_${id}`);
  },

  saveGame: () => {
    const state = get();
    if (!state.islandId) return;

    try {
      const saveData = {
        timeOfDay: state.timeOfDay,
        weather: state.weather,
        assets: state.assets,
        grassHealth: state.grassHealth,
        deerCount: state.deerCount,
        wolfCount: state.wolfCount,
        playerName: state.playerName,
        playerAvatar: state.playerAvatar,
        playerXP: state.playerXP,
        playerLevel: state.playerLevel,
        ecoPoints: state.ecoPoints,
        awakening: state.awakening,
        unlockedAssets: state.unlockedAssets,
        stats: state.stats,
        terrainPositions: state.terrainData.positions ? Array.from(state.terrainData.positions) : null,
        terrainTypes: state.terrainData.types ? Array.from(state.terrainData.types) : null
      };
      localStorage.setItem(`eco_save_${state.islandId}`, JSON.stringify(saveData));

      // Update index
      const slots = state.getSavedSlots();
      const slotIndex = slots.findIndex(s => s.id === state.islandId);
      if (slotIndex >= 0) {
        slots[slotIndex].lastPlayed = Date.now();
        slots[slotIndex].ecoPoints = state.ecoPoints;
        slots[slotIndex].playtime = state.stats.playtime;
        localStorage.setItem('eco_saves_index', JSON.stringify(slots));
      }
    } catch (e) {
      console.error("Failed to save game", e);
    }
  },

  loadGame: (id?: string, keepTitleScreen: boolean = false) => {
    try {
      const targetId = id || get().islandId;
      if (!targetId) return;
      
      const slots = get().getSavedSlots();
      const slot = slots.find(s => s.id === targetId);
      if (!slot) return;

      const saved = localStorage.getItem(`eco_save_${targetId}`);
      if (saved) {
        const data = JSON.parse(saved);
        set({
          screen: keepTitleScreen ? 'TITLE' : 'PLAYING',
          islandId: targetId,
          islandName: slot.name,
          timeOfDay: 6, // Forced to 6 AM
          weather: data.weather,
          assets: data.assets,
          grassHealth: data.grassHealth,
          deerCount: data.deerCount,
          wolfCount: data.wolfCount,
          playerName: data.playerName || 'wander',
          playerAvatar: (data.playerAvatar && data.playerAvatar.includes('robohash')) ? DEFAULT_AVATAR : (data.playerAvatar || DEFAULT_AVATAR),
          playerXP: getGlobalXP(),          // 全局等级：加载任何小岛都保持联合进度，不被单岛存档覆盖
          playerLevel: levelFromXP(getGlobalXP()),
          ecoPoints: data.ecoPoints !== undefined ? data.ecoPoints : 200,
          awakening: data.awakening ?? 0,
          unlockedAssets: Array.from(new Set([
            ...(data.unlockedAssets || []),
            'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock', 'terrainUp', 'terrainDown', 'eraser',
            'deer', 'wolf', 'seagull', 'dolphin', 'fish', 'spring', 'pond', 'water_flow', 'waterfall', 'streetlamp', 'house', 'windmill',
            'lighthouse', 'platform', 'boat', 'bridge', 'rope', 'sub_island', 'birdhouse',
            'hoe', 'seed_wheat', 'seed_carrot', 'tent', 'campfire', 'fence', 'well', 'bench', 'balloon', 'balloon_ladder', 'balloon_bridge', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel', 'lantern_girl'
          ])),
          stats: data.stats || { playtime: 0, itemsPlaced: data.assets?.length || 0 },
          terrainData: {
             ...get().terrainData,
             positions: data.terrainPositions ? new Float32Array(data.terrainPositions) : null,
             types: data.terrainTypes ? new Uint8Array(data.terrainTypes) : null
          }
        });
      }
    } catch (e) {
      console.error("Failed to load game", e);
    }
  },

  clearAll: () => set({ 
      assets: [], 
      deerCount: 0, 
      wolfCount: 0, 
      timeOfDay: 6, 
      weather: 'sunny',
      grassHealth: 100,
      ecoPoints: 200,
      awakening: 0,
      stats: { playtime: 0, itemsPlaced: 0 },
      unlockedAssets: [
          'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock', 'terrainUp', 'terrainDown', 'eraser',
          'deer', 'wolf', 'seagull', 'dolphin', 'fish', 'spring', 'pond', 'water_flow', 'waterfall', 'streetlamp', 'house', 'windmill',
          'lighthouse', 'platform', 'boat', 'bridge', 'rope', 'sub_island', 'birdhouse',
          'hoe', 'seed_wheat', 'seed_carrot', 'tent', 'campfire', 'fence', 'well', 'bench', 'balloon', 'balloon_ladder', 'balloon_bridge', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel', 'lantern_girl'
      ],
      terrainData: { ...get().terrainData, positions: null, types: null }
  }),

  // ===== 生生不息 (Flourish) 策略模式 =====
  mode: 'creative',
  setMode: (m) => set({ mode: m }),
  hand: [],
  drawPile: [],
  seasonTurn: 1,
  pendingCard: null,
  lastChainLabel: null,

  startFlourish: () => {
    const pile = shuffle(STARTING_DECK);
    const hand: FlourishCardId[] = [];
    while (hand.length < HAND_SIZE && pile.length > 0) hand.push(pile.pop()!);
    set({
      mode: 'flourish',
      drawPile: pile,
      hand,
      seasonTurn: 1,
      pendingCard: null,
      lastChainLabel: null,
      selectedTool: 'none',
      ecoPoints: Math.max(get().ecoPoints, 60),
    });
  },

  selectCard: (id) => {
    const card = FLOURISH_CARDS[id];
    if (!card) return;
    if (get().ecoPoints < card.cost) {
      get().addToast(`Eco 不足，需要 ${card.cost}`, 'info');
      return;
    }
    set({ pendingCard: id, selectedTool: card.assetType as ToolType, connectingPillarId: null });
  },

  cancelCard: () => set({ pendingCard: null, selectedTool: 'none' }),

  commitCardPlacement: (pos) => {
    const state = get();
    const id = state.pendingCard;
    if (!id) return false;
    const card = FLOURISH_CARDS[id];
    if (state.ecoPoints < card.cost) return false;

    // 用放置前的 assets 评估邻居共生（新物体尚未加入）
    const sym = evaluateSymbiosis(card.assetType, pos, state.assets);

    // 复用 addAsset：会处理 XP / VFX / 协同音效
    state.addAsset({
      type: card.assetType,
      position: { x: pos.x, y: 0, z: pos.z },
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      scale: 0.9,
    });

    // 结算 Eco：扣成本 + 加共生奖励；从手牌移除一张
    const net = sym.ecoBonus - card.cost;
    const handCopy = [...get().hand];
    const idx = handCopy.indexOf(id);
    if (idx >= 0) handCopy.splice(idx, 1);

    set({
      ecoPoints: Math.max(0, get().ecoPoints + net),
      hand: handCopy,
      pendingCard: null,
      selectedTool: 'none',
      lastChainLabel: sym.label || null,
    });

    if (sym.label) {
      get().addToast(sym.label, 'info');
      AudioSystem.playSynergyChord();
    }
    return true;
  },

  advanceSeason: () => {
    get().updateEcology(); // 生态演化 + 被动 EP
    get().advanceDay();    // 推进天气

    const pile = [...get().drawPile];
    const hand = [...get().hand];
    while (hand.length < HAND_SIZE) {
      if (pile.length === 0) pile.push(...shuffle(STARTING_DECK)); // 无限经营：牌库循环
      hand.push(pile.pop()!);
    }
    set({
      seasonTurn: get().seasonTurn + 1,
      ecoPoints: get().ecoPoints + SEASON_BASE_ECO,
      drawPile: pile,
      hand,
    });
  },
}));
