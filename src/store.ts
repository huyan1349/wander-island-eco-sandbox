import { create } from 'zustand';
import { AudioSystem } from './lib/audio';
import { FlourishCardId, FLOURISH_CARDS, STARTING_DECK, HAND_SIZE, SEASON_BASE_ECO, evaluateSymbiosis, shuffle } from './game/flourish';

export type ToolType = 'none' | 'treeA' | 'treeB' | 'rock' | 'deer' | 'wolf' | 'seagull' | 'dolphin' | 'fish' | 'spring' | 'streetlamp' | 'terrainUp' | 'terrainDown' | 'eraser' | 'house' | 'windmill' | 'lighthouse' | 'platform' | 'pier' | 'boat' | 'bridge' | 'bridge_pillar' | 'rope' | 'pave' | 'sub_island' | 'birdhouse' | 'hoe' | 'seed_wheat' | 'seed_carrot' | 'tent' | 'campfire' | 'fence' | 'well' | 'bench' | 'balloon' | 'balloon_ladder' | 'balloon_bridge' | 'spirit_tree' | 'observatory' | 'ruins_arch' | 'waterwheel' | 'cherry_tree' | 'bamboo' | 'pine_tree' | 'willow_tree' | 'bush' | 'sign' | 'mailbox';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'snowy' | 'stormy';

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface PlacedAsset {
  id: string;
  type: 'treeA' | 'treeB' | 'rock' | 'deer' | 'wolf' | 'seagull' | 'dolphin' | 'fish' | 'spring' | 'streetlamp' | 'house' | 'windmill' | 'lighthouse' | 'platform' | 'pier' | 'boat' | 'bridge' | 'bridge_pillar' | 'rope' | 'sub_island' | 'birdhouse' | 'hoe' | 'farmland' | 'crop_wheat' | 'crop_carrot' | 'tent' | 'campfire' | 'fence' | 'well' | 'bench' | 'balloon' | 'balloon_ladder' | 'balloon_bridge' | 'spirit_tree' | 'observatory' | 'ruins_arch' | 'waterwheel' | 'cherry_tree' | 'bamboo' | 'pine_tree' | 'willow_tree' | 'bush' | 'sign' | 'mailbox';
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
  memberNo?: number;
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
  
  weather: WeatherType;
  setWeather: (weather: WeatherType) => void;
  forecast: WeatherType[];
  advanceDay: () => void;

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
  editingSignId: string | null;
  setEditingSignId: (id: string | null) => void;
  online: boolean; // 是否在归隐之岛(联机公共服务器)
  setOnline: (v: boolean) => void;
  mailboxOpen: boolean; // 点击岛上信箱物件打开
  setMailboxOpen: (v: boolean) => void;
  
  aiNarration: string | null;
  setAiNarration: (narration: string | null) => void;

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
  commitCardPlacement: (pos: { x: number; z: number }) => boolean;
  advanceSeason: () => void;
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
  setAuthUser: (user) => set({ authUser: user }),
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
  timeSpeed: 1,
  setTimeSpeed: (speed) => set({ timeSpeed: speed }),
  
  weather: 'sunny',
  setWeather: (weather) => set({ weather: weather }),
  forecast: ['cloudy', 'rainy', 'sunny'],
  advanceDay: () => set((state) => {
    const types: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'foggy', 'snowy', 'stormy'];
    const nextForecast = [...state.forecast];
    const today = nextForecast.shift() || 'sunny';
    nextForecast.push(types[Math.floor(Math.random() * types.length)]);
    return { weather: today, forecast: nextForecast };
  }),

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
  
  playerName: 'huyan',
  setPlayerName: (name) => set({ playerName: name }),
  playerAvatar: 'https://api.dicebear.com/7.x/micah/svg?seed=Felix&backgroundColor=fcf8ec',
  setPlayerAvatar: (avatar) => set({ playerAvatar: avatar }),
  playerXP: 0,
  playerLevel: 1,
  addXP: (amount) => set((state) => {
     const newXP = state.playerXP + amount;
     const newLevel = Math.floor(newXP / 100) + 1;
     return { playerXP: newXP, playerLevel: newLevel };
  }),
  
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
    'deer', 'wolf', 'seagull', 'dolphin', 'fish', 'spring', 'streetlamp', 'house', 'windmill', 
    'lighthouse', 'platform', 'boat', 'bridge', 'rope', 'sub_island', 'birdhouse',
    'hoe', 'seed_wheat', 'seed_carrot', 'tent', 'campfire', 'fence', 'well', 'bench', 'balloon', 'balloon_ladder', 'balloon_bridge', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'
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
  editingSignId: null,
  setEditingSignId: (id) => set({ editingSignId: id }),
  online: false,
  setOnline: (v) => set({ online: v }),
  mailboxOpen: false,
  setMailboxOpen: (v) => set({ mailboxOpen: v }),
  
  aiNarration: null,
  setAiNarration: (narration) => set({ aiNarration: narration }),

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
  addAsset: (assetData) => set((state) => {
    const asset: PlacedAsset = {
      ...assetData,
      id: Math.random().toString(36).substring(2, 9),
      plantedAt: (
        assetData.type === 'crop_wheat' || assetData.type === 'crop_carrot'
      ) ? state.stats.playtime : assetData.plantedAt
    };

    const newAssets = [...state.assets, asset];
    const deerCount = newAssets.filter(a => a.type === 'deer').length;
    const wolfCount = newAssets.filter(a => a.type === 'wolf').length;
    const newXP = state.playerXP + 10;
    const newLevel = Math.floor(newXP / 100) + 1;
    
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
  }),
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
    
    return { grassHealth: newHealth, assets: currentAssets, deerCount: dCount, wolfCount: wCount, ecoPoints: finalEP };
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
    try {
      const indexStr = localStorage.getItem('eco_saves_index');
      if (indexStr) {
          return JSON.parse(indexStr);
      } else {
          // Initialize pre-baked Save 1
          const defaultSlot = {
              id: 'default_01',
              name: 'Wander Island (Demo)',
              lastPlayed: Date.now(),
              ecoPoints: 5000,
              playtime: 3600
          };
          
          const defaultData = {
              timeOfDay: 6,
              weather: 'sunny',
              assets: [
                  { id: 'a1', type: 'house', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1.2 },
                  { id: 'a2', type: 'windmill', position: { x: 8, y: 0, z: -8 }, rotation: { x: 0, y: 0.8, z: 0 }, scale: 1.2 },
                  { id: 'a3', type: 'lighthouse', position: { x: -12, y: 0, z: 12 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1.5 },
                  { id: 'a4', type: 'spring', position: { x: -4, y: 0, z: -4 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 },
                  { id: 't1', type: 'treeA', position: { x: -5, y: 0, z: -5 }, rotation: { x: 0, y: 1, z: 0 }, scale: 1.1 },
                  { id: 't2', type: 'treeB', position: { x: -3, y: 0, z: -7 }, rotation: { x: 0, y: 2, z: 0 }, scale: 0.9 },
                  { id: 't3', type: 'treeA', position: { x: -6, y: 0, z: -3 }, rotation: { x: 0, y: 3, z: 0 }, scale: 1.3 },
                  { id: 't4', type: 'treeB', position: { x: 4, y: 0, z: 5 }, rotation: { x: 0, y: 4, z: 0 }, scale: 1 },
                  { id: 't5', type: 'treeA', position: { x: 5, y: 0, z: 3 }, rotation: { x: 0, y: 5, z: 0 }, scale: 0.8 },
                  { id: 't6', type: 'treeB', position: { x: 3, y: 0, z: 7 }, rotation: { x: 0, y: 6, z: 0 }, scale: 1.2 },
                  { id: 'r1', type: 'rock', position: { x: 8, y: 0, z: 2 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1.4 },
                  { id: 'd1', type: 'deer', position: { x: -2, y: 0, z: 5 }, rotation: { x: 0, y: 1, z: 0 }, scale: 1 },
                  { id: 'd2', type: 'deer', position: { x: 2, y: 0, z: 6 }, rotation: { x: 0, y: 2, z: 0 }, scale: 1 },
                  { id: 'w1', type: 'wolf', position: { x: -8, y: 0, z: 8 }, rotation: { x: 0, y: -1, z: 0 }, scale: 1 },
              ],
              grassHealth: 100,
              deerCount: 2,
              wolfCount: 1,
              playerName: 'huyan',
              playerAvatar: 'https://api.dicebear.com/7.x/micah/svg?seed=Felix&backgroundColor=fcf8ec',
              playerXP: 500,
              playerLevel: 5,
              ecoPoints: 5000,
              stats: { playtime: 3600, itemsPlaced: 14 }
          };
          
          localStorage.setItem('eco_saves_index', JSON.stringify([defaultSlot]));
          localStorage.setItem(`eco_save_${defaultSlot.id}`, JSON.stringify(defaultData));
          
          return [defaultSlot];
      }
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
          playerName: data.playerName || 'huyan',
          playerAvatar: data.playerAvatar || 'https://api.dicebear.com/7.x/micah/svg?seed=Felix&backgroundColor=fcf8ec',
          playerXP: data.playerXP || 0,
          playerLevel: data.playerLevel || 1,
          ecoPoints: data.ecoPoints !== undefined ? data.ecoPoints : 200,
          unlockedAssets: Array.from(new Set([
            ...(data.unlockedAssets || []),
            'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock', 'terrainUp', 'terrainDown', 'eraser',
            'deer', 'wolf', 'seagull', 'dolphin', 'fish', 'spring', 'streetlamp', 'house', 'windmill', 
            'lighthouse', 'platform', 'boat', 'bridge', 'rope', 'sub_island', 'birdhouse',
            'hoe', 'seed_wheat', 'seed_carrot', 'tent', 'campfire', 'fence', 'well', 'bench', 'balloon', 'balloon_ladder', 'balloon_bridge', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'
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
      stats: { playtime: 0, itemsPlaced: 0 },
      unlockedAssets: [
          'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock', 'terrainUp', 'terrainDown', 'eraser',
          'deer', 'wolf', 'seagull', 'dolphin', 'fish', 'spring', 'streetlamp', 'house', 'windmill', 
          'lighthouse', 'platform', 'boat', 'bridge', 'rope', 'sub_island', 'birdhouse',
          'hoe', 'seed_wheat', 'seed_carrot', 'tent', 'campfire', 'fence', 'well', 'bench', 'balloon', 'balloon_ladder', 'balloon_bridge', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'
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
