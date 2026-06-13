import { useEffect, useRef, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { TitleScreen } from "./components/TitleScreen";
import { SaveSelectScreen } from "./components/SaveSelectScreen";
import { useGameStore, ToolType } from "./store";
import {
  TreePine,
  TreeDeciduous,
  Mountain,
  MountainSnow,
  Rabbit, // using rabbit icon as a placeholder for deer if no deer icon exists
  Dog, // using dog for wolf
  Bird,
  Fish,
  Mailbox,
  Droplets,
  ArrowUp,
  ArrowDown,
  Eraser,
  MousePointer2,
  Star,
  Castle,
  Telescope,
  LifeBuoy,
  Sun,
  CloudRain,
  Snowflake,
  Lamp,
  Eye,
  EyeOff,
  Home,
  Warehouse,
  Wind,
  TowerControl,
  Square,
  Ship,
  Link,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Globe,
  Waves,
  Save,
  Download,
  Trash2,
  Settings,
  Hammer,
  Bot,
  Sparkles,
  Lock,
  Box,
  Columns,
  Route,
  Anchor,
  AlignEndHorizontal,
  Shovel,
  Wheat,
  Carrot,
  Tent,
  Flame,
  Fence,
  Droplet,
  Armchair,
  Leaf,
  SunMedium,
  User,
  Cloud,
  Maximize2
} from "lucide-react";

import { PlayerPanel } from "./components/PlayerPanel";
import { LoginScreen } from "./components/LoginScreen";
import { SocialPanel } from "./components/SocialPanel";
import { Toast } from "./components/Toast";
import { VisitOverlay } from "./components/VisitOverlay";
import { TimeWeatherSystem } from "./components/systems/TimeWeatherSystem";
import { SolarMeridian } from "./components/ui/SolarMeridian";
import { WeatherForecast } from "./components/ui/WeatherForecast";
import { api } from "./lib/api";
import { connectSocket, onUserOnline, onUserOffline, onFriendRequest, onIslandVisitData, onIslandVisitError } from "./lib/socket";
import { AudioSystem } from "./lib/audio";

export default function App() {
  const screen = useGameStore(state => state.screen);
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const setTimeOfDay = useGameStore(state => state.setTimeOfDay);
  const weather = useGameStore(state => state.weather);
  const setWeather = useGameStore(state => state.setWeather);
  const season = useGameStore(state => state.season);
  const setSeason = useGameStore(state => state.setSeason);
  const biome = useGameStore(state => state.biome);
  const setBiome = useGameStore(state => state.setBiome);
  const waveIntensity = useGameStore(state => state.waveIntensity);
  const setWaveIntensity = useGameStore(state => state.setWaveIntensity);
  const balloonColor = useGameStore(state => state.balloonColor);
  const setBalloonColor = useGameStore(state => state.setBalloonColor);
  const selectedTool = useGameStore(state => state.selectedTool);
  const setSelectedTool = useGameStore(state => state.setSelectedTool);
  const assets = useGameStore(state => state.assets);

  const grassHealth = useGameStore(state => state.grassHealth);
  const deerCount = useGameStore(state => state.deerCount);
  const wolfCount = useGameStore(state => state.wolfCount);
  const updateEcology = useGameStore(state => state.updateEcology);
  const saveGame = useGameStore(state => state.saveGame);
  const clearAll = useGameStore(state => state.clearAll);
  const aiNarration = useGameStore(state => state.aiNarration);
  const setAiNarration = useGameStore(state => state.setAiNarration);
  const ecoPoints = useGameStore(state => state.ecoPoints);
  const unlockedAssets = useGameStore(state => state.unlockedAssets);
  const unlockAsset = useGameStore(state => state.unlockAsset);
  const assetCount = useGameStore(state => state.assets.length);
  const springCount = useGameStore(state => state.assets.filter(a => a.type === 'spring').length);
  const windmillCount = useGameStore(state => state.assets.filter(a => a.type === 'windmill').length);

  const authUser = useGameStore(state => state.authUser);
  const setAuthUser = useGameStore(state => state.setAuthUser);
  const addToast = useGameStore(state => state.addToast);
  const visitingIsland = useGameStore(state => state.visitingIsland);
  const setVisitingIsland = useGameStore(state => state.setVisitingIsland);
  const setUnreadCount = useGameStore(state => state.setUnreadCount);
  const serverIslandMap = useGameStore(state => state.serverIslandMap);
  const setServerIslandMap = useGameStore(state => state.setServerIslandMap);
  const islandId = useGameStore(state => state.islandId);

  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [userInput, setUserInput] = useState("");

  const fetchAiNarration = async () => {
    if (isGeneratingAi) return;
    setIsGeneratingAi(true);
    const messageToSend = userInput;
    setUserInput("");
    
    try {
      const response = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           timeOfDay,
           weather,
           grassHealth,
           deerCount,
           wolfCount,
           assetsCount: assetCount,
           userMessage: messageToSend
        })
      });
      if (response.ok) {
         const data = await response.json();
         setAiNarration(data.narration);
      }
    } catch (e) {
      console.error("Failed to fetch AI narration:", e);
    }
    setIsGeneratingAi(false);
  };

  useEffect(() => {
    // Load and play BGM immediately
    const initAudio = async () => {
      AudioSystem.init();
    };
    initAudio();

    // Load Save 1 as Title Screen Background if it exists
    const slots = useGameStore.getState().getSavedSlots();
    if (slots.length > 0) {
        useGameStore.getState().loadGame(slots[0].id, true);
    }
  }, []);

  // Auto-login from saved token
  useEffect(() => {
    const token = api.getToken();
    if (token && !authUser) {
      api.getMe().then((res) => {
        setAuthUser(res.user);
        connectSocket(token);
      }).catch(() => {
        api.setToken(null);
      });
    }
  }, []);

  // Socket event listeners for toasts
  useEffect(() => {
    if (!authUser) return;

    const unsubOnline = onUserOnline((data: any) => {
      addToast(`${data.username} 上线了`, 'online');
    });
    const unsubOffline = onUserOffline((data: any) => {
      addToast(`${data.username} 离开了`, 'offline');
    });
    const unsubFriendReq = onFriendRequest((data: any) => {
      addToast(`${data.fromName} 请求添加你为好友`, 'friend_request');
    });
    const unsubVisitData = onIslandVisitData((data: any) => {
      setVisitingIsland({
        islandId: data.islandId,
        islandName: data.islandName,
        ownerName: data.ownerName,
        data: data.data
      });
    });
    const unsubVisitError = onIslandVisitError((data: any) => {
      addToast(data.error || '串门失败', 'info');
    });

    return () => {
      unsubOnline();
      unsubOffline();
      unsubFriendReq();
      unsubVisitData();
      unsubVisitError();
    };
  }, [authUser]);

  useEffect(() => {
     AudioSystem.updateEcologyState(
         springCount,
         windmillCount,
         weather
     );
  }, [springCount, windmillCount, weather]);

  // Auto-save logic
  useEffect(() => {
      const interval = setInterval(() => {
          saveGame();
      }, 30000);
      return () => clearInterval(interval);
  }, []);

  // Unread count polling
  useEffect(() => {
    if (!authUser || screen !== 'PLAYING') return;

    const fetchUnread = async () => {
      try {
        const res = await api.getUnreadCount();
        const total = res.unread?.reduce((sum: number, u: any) => sum + (u.count || 0), 0) || 0;
        setUnreadCount(total);
      } catch {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [authUser, screen]);

  // Sync island to server on save (when logged in)
  useEffect(() => {
    if (!authUser || !islandId) return;

    const syncInterval = setInterval(() => {
      const state = useGameStore.getState();
      if (state.authUser && state.islandId) {
        const serverId = state.serverIslandMap[state.islandId];
        if (serverId) {
          const saveData = {
            timeOfDay: state.timeOfDay,
            weather: state.weather,
            assets: state.assets,
            grassHealth: state.grassHealth,
            deerCount: state.deerCount,
            wolfCount: state.wolfCount,
            ecoPoints: state.ecoPoints,
            stats: state.stats
          };
          api.updateIsland(serverId, { data: saveData }).catch(() => {});
        }
      }
    }, 60000); // Sync every 60 seconds

    return () => clearInterval(syncInterval);
  }, [authUser, islandId]);

  const [isImmersive, setIsImmersive] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [envMenuOpen, setEnvMenuOpen] = useState(false);
  const lastToolRef = useRef<ToolType>('none');
  const lastCategoryRef = useRef<string | null>(null);

  // 触屏检测 + tooltip 状态
  const [isTouch, setIsTouch] = useState(false);
  const [touchTooltip, setTouchTooltip] = useState<string | null>(null);
  const touchTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hasCoarse = window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouch(hasCoarse || hasTouch);
  }, []);

  const showTouchTooltip = (label: string) => {
    if (!isTouch) return;
    setTouchTooltip(label);
    if (touchTooltipTimer.current) clearTimeout(touchTooltipTimer.current);
    touchTooltipTimer.current = setTimeout(() => setTouchTooltip(null), 1500);
  };

  const incrementPlaytime = useGameStore(state => state.incrementPlaytime);

  // Playtime loop
  useEffect(() => {
      if (screen !== 'PLAYING') return;
      const interval = setInterval(() => {
          incrementPlaytime(1);
      }, 1000); 
      return () => clearInterval(interval);
  }, [screen, incrementPlaytime]);

  // Ecology loop
  useEffect(() => {
    const interval = setInterval(() => {
      updateEcology();
    }, 2000); // Every 2 seconds update ecology
    return () => clearInterval(interval);
  }, [updateEcology]);

  useEffect(() => {
    if (selectedTool !== 'none') {
      lastToolRef.current = selectedTool;
      lastCategoryRef.current = activeCategory;
    }
  }, [selectedTool, activeCategory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch(e.key.toLowerCase()) {
         case 'tab': {
             e.preventDefault();
             if (selectedTool === 'none') {
               const toolToRestore = lastToolRef.current !== 'none' ? lastToolRef.current : 'treeA';
               setSelectedTool(toolToRestore);
               setActiveCategory(lastCategoryRef.current ?? '环境');
             } else {
               lastToolRef.current = selectedTool;
               lastCategoryRef.current = activeCategory;
               setSelectedTool('none');
               setActiveCategory('环境');
             }
             break;
         }
         case 'escape': 
             setIsImmersive(false);
             setSelectedTool('none');
             setActiveCategory(null);
             break;
         case 'e': 
             setSelectedTool('eraser'); 
             setActiveCategory('Environment');
             break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCategory, selectedTool, setSelectedTool]);

  const categories = [
    {
      name: "环境",
      icon: TreePine,
      tools: [
        { id: "none", icon: MousePointer2, label: "选择 / 观察", cost: 0 },
        { id: "eraser", icon: Eraser, label: "橡皮擦", cost: 0 },
        { id: "treeA", icon: TreePine, label: "松树", cost: 0 },
        { id: "treeB", icon: TreeDeciduous, label: "秋季树", cost: 0 },
        { id: "rock", icon: Mountain, label: "岩石", cost: 0 },
        { id: "spring", icon: Droplets, label: "生命之泉", cost: 1500 },
        { id: "streetlamp", icon: Lamp, label: "路灯", cost: 200 },
      ]
    },
    {
      name: "地形",
      icon: Mountain,
      tools: [
        { id: "terrainUp", icon: ArrowUp, label: "隆起地形", cost: 0 },
        { id: "terrainDown", icon: ArrowDown, label: "降低地形", cost: 0 },
        { id: "pave", icon: Hammer, label: "铺设石板路", cost: 0 },
      ]
    },
    {
      name: "生态",
      icon: Rabbit,
      tools: [
        { id: "deer", icon: Rabbit, label: "鹿", cost: 300 },
        { id: "wolf", icon: Dog, label: "狼", cost: 800 },
        { id: "seagull", icon: Bird, label: "海鸥", cost: 100 },
        { id: "dolphin", icon: Waves, label: "海豚", cost: 500 },
        { id: "fish", icon: Fish, label: "荧光鱼群", cost: 150 },
        { id: "spirit_tree", icon: Star, label: "远古神树", cost: 1000 },
      ]
    },
    {
      name: "建筑",
      icon: Home,
      tools: [
        { id: "house", icon: Home, label: "温馨小屋", cost: 500 },
        { id: "windmill", icon: Wind, label: "风车", cost: 1000 },
        { id: "lighthouse", icon: TowerControl, label: "灯塔", cost: 2000 },
        { id: "tent", icon: Tent, label: "帐篷", cost: 100 },
        { id: "campfire", icon: Flame, label: "营火", cost: 50 },
        { id: "fence", icon: Fence, label: "木栅栏", cost: 20 },
        { id: "well", icon: Droplet, label: "水井", cost: 150 },
        { id: "bench", icon: Armchair, label: "长椅", cost: 40 },
        { id: "observatory", icon: Telescope, label: "观星台", cost: 1500 },
        { id: "ruins_arch", icon: Castle, label: "遗迹石门", cost: 2000 },
        { id: "waterwheel", icon: LifeBuoy, label: "巨型水车", cost: 1800 },
      ]
    },
    {
      name: "农业",
      icon: Wheat,
      tools: [
        { id: "hoe", icon: Shovel, label: "开垦农田", cost: 10 },
        { id: "seed_wheat", icon: Wheat, label: "播种小麦", cost: 5 },
        { id: "seed_carrot", icon: Carrot, label: "播种胡萝卜", cost: 5 },
      ]
    },
    {
      name: "海洋工程",
      icon: Waves,
      tools: [
        { id: "platform", icon: Anchor, label: "海上浮板", cost: 50 },
        { id: "pier", icon: AlignEndHorizontal, label: "固定码头", cost: 60 },
        { id: "sub_island", icon: MountainSnow, label: "人造副岛", cost: 3000 },
        { id: "boat", icon: Ship, label: "小船", cost: 80 },
        { id: "bridge_pillar", icon: Columns, label: "打桩/地基", cost: 100 },
        { id: "bridge", icon: Route, label: "架设悬索桥", cost: 150 },
        { id: "rope", icon: Link, label: "小船系绳", cost: 30 },
        { id: "birdhouse", icon: Mailbox, label: "海鸥亭", cost: 50 },
      ]
    },
    {
      name: "天空",
      icon: Cloud,
      tools: [
        { id: "balloon", icon: Cloud, label: "热气球(系绳)", cost: 120 },
        { id: "balloon_ladder", icon: Cloud, label: "热气球(软梯)", cost: 150 },
        { id: "balloon_bridge", icon: Cloud, label: "热气球(吊桥)", cost: 200 },
      ]
    },
    {
      name: "系统",
      icon: Settings,
      tools: [
        { id: "save", icon: Save, label: "保存岛屿", cost: 0 },
        { id: "load", icon: Download, label: "读取岛屿", cost: 0 },
        { id: "clear", icon: Trash2, label: "清空岛屿", cost: 0 },
      ]
    }
  ];

  const activeCatObj = categories.find(c => c.name === activeCategory);

  const handleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    }
  };

  return (
    <div className="w-full h-screen relative bg-slate-950 overflow-hidden font-sans text-slate-100 flex">
      {/* Center Canvas */}
      <div className={`absolute inset-0 z-0 transition-all duration-1000 ${screen !== 'PLAYING' ? 'blur-none brightness-100' : 'blur-none brightness-100'}`}>
        <GameCanvas />
      </div>

      {screen === 'TITLE' && <TitleScreen />}
      {screen === 'LOGIN' && <LoginScreen />}
      {screen === 'SAVE_SELECT' && <SaveSelectScreen />}

      {screen === 'PLAYING' && (
        <>
          {/* Top Left Header & HUD */}
      {!isImmersive && (
        <div className={`absolute z-50 flex flex-col items-start gap-2 transition-opacity duration-300 ${isTouch ? 'top-3 left-3 touch-safe-top touch-safe-left' : 'top-6 left-6 gap-4'}`}>
           {/* Profile / Avatar (Top Left) */}
           <PlayerPanel />

           {/* Tool Column (Below Avatar) */}
           <div className={`flex ${isTouch ? 'flex-row gap-2' : 'flex-col gap-4'}`}>
             <button
                onClick={() => { setIsImmersive(!isImmersive); showTouchTooltip(isImmersive ? '退出沉浸模式' : '沉浸模式'); }}
                className={`group relative flex items-center justify-center hand-drawn-btn shrink-0 ${isTouch ? 'w-11 h-11' : 'w-12 h-12'}`}
             >
                {isImmersive ? <EyeOff size={isTouch ? 20 : 24} className="text-slate-800" /> : <Eye size={isTouch ? 20 : 24} className="text-slate-800" />}
                {!isTouch && (
                <span className="absolute -right-24 top-1/2 -translate-y-1/2 hand-drawn-panel text-slate-800 text-xs font-bold py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {isImmersive ? "退出沉浸模式" : "沉浸模式"}
                </span>
                )}
             </button>

             <button
                onClick={() => { setEnvMenuOpen(!envMenuOpen); showTouchTooltip('生态面板'); }}
                className={`group relative flex items-center justify-center hand-drawn-btn shrink-0 ${isTouch ? 'w-11 h-11' : 'w-12 h-12'} ${envMenuOpen ? 'hand-drawn-btn-active' : ''}`}
             >
                <Globe size={isTouch ? 20 : 24} className={envMenuOpen ? 'text-amber-700' : 'text-slate-800'} />
                {!isTouch && (
                <span className="absolute -right-20 top-1/2 -translate-y-1/2 hand-drawn-panel text-slate-800 text-xs font-bold py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    生态面板
                </span>
                )}
             </button>

             <SocialPanel />

             {/* 全屏按钮 - 仅触屏显示 */}
             {isTouch && (
               <button
                  onClick={() => { handleFullscreen(); showTouchTooltip('全屏'); }}
                  className="group relative flex items-center justify-center hand-drawn-btn shrink-0 w-11 h-11"
               >
                  <Maximize2 size={20} className="text-slate-800" />
               </button>
             )}
           </div>
        </div>
      )}
        
      {/* Global UI Overlays */}
      {!isImmersive && (
        <>
          <TimeWeatherSystem />
          <SolarMeridian />
          <WeatherForecast />
        </>
      )}

      {/* High-End Cinematic Standby / Immersive Mode */}
      {isImmersive && (
        <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-12 animate-in fade-in duration-1000 mix-blend-overlay">
           
           {/* Top Row: Title & Exit */}
           <div className="flex justify-between items-start">
               <div className="flex flex-col gap-2">
                   <h1 className="text-3xl font-light tracking-[0.5em] text-white uppercase drop-shadow-md">Wander Island</h1>
                   <div className="flex items-center gap-4">
                       <span className="w-12 h-px bg-white/50" />
                       <span className="font-mono text-[10px] tracking-[0.3em] text-white/50 uppercase">Standby Mode</span>
                   </div>
               </div>
               
               <button 
                  onClick={() => setIsImmersive(false)}
                  className="pointer-events-auto flex items-center gap-3 text-white/40 hover:text-white transition-colors group"
               >
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity">Wake Up</span>
                  <EyeOff size={20} className="font-light" />
               </button>
           </div>

           {/* Center Reticle / Viewfinder marks */}
           <div className="absolute inset-0 flex items-center justify-center opacity-20">
               <div className="w-16 h-16 border border-white/30 rounded-full" />
               <div className="absolute w-24 h-px bg-white/30" />
               <div className="absolute w-px h-24 bg-white/30" />
           </div>

           {/* Bottom Row: Telemetry Data */}
           <div className="flex justify-between items-end">
               
               {/* Left: Environment Telemetry */}
               <div className="flex flex-col gap-3 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase">
                   <div className="flex items-center gap-4">
                       <span className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
                       <span>T-CYCLE: {Math.floor(timeOfDay).toString().padStart(2, '0')}:00</span>
                   </div>
                   <div className="flex items-center gap-4">
                       <span className="w-1 h-1 bg-blue-400 rounded-full" />
                       <span>ATMOSPHERE: {weather}</span>
                   </div>
                   <div className="flex items-center gap-4">
                       <span className="w-1 h-1 bg-emerald-400 rounded-full" />
                   <span>GEO-INDEX: {assetCount} OBJS</span>
                   </div>
               </div>

               {/* Right: Bio Telemetry */}
               <div className="flex flex-col items-end gap-3 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase">
                   <div className="flex items-center gap-4">
                       <span>BIO-COVERAGE: {Math.floor(grassHealth)}%</span>
                       <div className="w-24 h-[1px] bg-white/20 relative">
                           <div className="absolute top-0 left-0 h-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" style={{ width: `${grassHealth}%` }} />
                       </div>
                   </div>
                   <div className="flex items-center gap-4">
                       <span>FAUNA: {deerCount} HRB / {wolfCount} CRN</span>
                       <div className="w-24 h-[1px] bg-white/20" />
                   </div>
               </div>

           </div>
        </div>
      )}

      {/* Liquid Glass Bottom Dock - Tools & Categories */}
      {!isImmersive && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none ${isTouch ? 'bottom-3 touch-safe-bottom' : 'bottom-8 gap-4'}`}>
          
          {/* Touch tooltip banner */}
          {touchTooltip && isTouch && (
            <div className="hand-drawn-panel px-4 py-2 text-sm font-bold text-slate-800 animate-in fade-in duration-200 pointer-events-none">
              {touchTooltip}
            </div>
          )}

          {/* Balloon color picker */}
          {String(selectedTool).startsWith('balloon') && (
            <div className="hand-drawn-panel px-3 py-2 flex gap-2 items-center pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-300">
              <span className="text-xs text-slate-700 font-bold mr-1">气球颜色</span>
              {['#e11d48', '#f97316', '#facc15', '#10b981', '#2563eb', '#7c3aed', '#ec4899'].map(c => (
                <button
                  key={c}
                  onClick={() => setBalloonColor(c)}
                  className={`rounded-full border-2 transition-transform ${balloonColor === c ? 'border-slate-800 scale-125' : 'border-white/60'} ${isTouch ? 'w-10 h-10' : 'w-8 h-8'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          {/* Active Category Tools */}
          {activeCategory && activeCatObj && (
            <div className={`hand-drawn-panel px-2 py-2 pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-300 ${isTouch ? 'touch-tools-scroll' : 'flex gap-2'}`}>
              {activeCatObj.tools.map((t) => {
                const Icon = t.icon;
                const isActive = selectedTool === t.id;
                const isSystemTool = t.id === 'save' || t.id === 'load' || t.id === 'clear';
                const isUnlocked = t.cost === 0 || isSystemTool || unlockedAssets.includes(t.id);
                const canAfford = ecoPoints >= t.cost;

                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (!isUnlocked) {
                         if (canAfford && confirm(`解锁 ${t.label} 需要 ${t.cost} EP？`)) {
                             unlockAsset(t.id, t.cost);
                         }
                         return;
                      }
                      if (t.id === 'save') { saveGame(); alert('岛屿已保存！'); }
                      else if (t.id === 'load') { useGameStore.getState().loadGame(); alert('岛屿已加载！'); }
                      else if (t.id === 'clear') { if (confirm('确定清空岛屿？')) clearAll(); }
                      else setSelectedTool(t.id as ToolType);
                      showTouchTooltip(t.label);
                    }}
                    className={`hand-drawn-btn relative flex items-center justify-center group shrink-0
                      ${isTouch ? 'w-12 h-12' : 'w-12 h-12'}
                      ${!isUnlocked ? "opacity-50" : (isActive ? "hand-drawn-btn-active" : "")}
                    `}
                  >
                    <Icon size={isActive ? (isTouch ? 22 : 22) : (isTouch ? 20 : 20)} className={isActive ? "text-amber-700" : "text-slate-800"} />
                    {!isUnlocked && <Lock size={10} className="absolute bottom-1 right-1 text-amber-400 drop-shadow-md" />}
                    
                    {!isTouch && (
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 hand-drawn-panel text-[12px] font-bold py-1 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {t.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Category Dock — 手机端可横向滚动 */}
          <div className={`hand-drawn-panel px-2 py-2 flex gap-2 pointer-events-auto ${isTouch ? 'touch-tools-scroll max-w-[95vw]' : 'px-4 py-3 gap-4'}`}>
            {categories.map((c) => {
              const CategoryIcon = c.icon;
              const isActive = activeCategory === c.name;
              
              return (
                <button
                  key={c.name}
                  onClick={() => {
                    setActiveCategory(isActive ? null : c.name);
                    showTouchTooltip(c.name);
                  }}
                  className={`hand-drawn-btn relative group shrink-0
                    ${isTouch ? 'w-12 h-12' : 'p-3'}
                    ${isActive ? "hand-drawn-btn-active" : ""}
                  `}
                >
                  <CategoryIcon size={isTouch ? 22 : 24} className={isActive ? "text-amber-700" : "text-slate-800"} />
                  
                  {!isTouch && (
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 hand-drawn-panel text-[12px] font-bold py-1 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {c.name}
                    </span>
                  )}
                  
                  {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-700 rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Right Panel - Ecology Menu Content */}
      {!isImmersive && (
        <div className={`absolute flex flex-col items-end z-50 pointer-events-none ${isTouch ? 'touch-panel-full touch-safe-bottom touch-safe-right inset-0' : 'right-6 top-6 bottom-6 w-80'}`}>
          {/* Collapsible Ecology Menu */}
          {envMenuOpen && (
            <div className={`hand-drawn-panel p-5 pointer-events-auto flex flex-col gap-5 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 ${isTouch ? 'w-full h-full max-h-full rounded-none' : 'w-72 max-h-[70vh]'}`}>

            {/* 手机端关闭按钮 */}
            {isTouch && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-800 tracking-wider">生态面板</span>
                <button onClick={() => setEnvMenuOpen(false)} className="hand-drawn-btn w-10 h-10 flex items-center justify-center">
                  <EyeOff size={18} className="text-slate-800" />
                </button>
              </div>
            )}
            
            {/* Environment Stats */}
            <div className="flex flex-col gap-2">
               <div className="flex items-center justify-between">
                 <span className="text-xs text-slate-700 font-bold">植被健康度</span>
                 <span className="text-[10px] font-bold text-slate-600 tracking-wider">{Math.floor(grassHealth)}%</span>
               </div>
               <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${grassHealth > 50 ? "bg-emerald-500" : grassHealth > 20 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${grassHealth}%` }} />
               </div>
               
               <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-slate-600" title="小鹿数量">
                    <Rabbit size={14} />
                    <span className="text-[10px] font-bold">{deerCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600" title="野狼数量">
                    <Dog size={14} />
                    <span className="text-[10px] font-bold">{wolfCount}</span>
                  </div>
               </div>
            </div>

            <div className="w-full h-px bg-slate-200" />

            {/* Time */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                 <span className="text-xs text-slate-700 font-bold">时间</span>
                 <span className="font-mono text-xs font-bold text-slate-800">{Math.floor(timeOfDay).toString().padStart(2, '0')}:00</span>
              </div>
              <input
                type="range" min="0" max="24" step="0.5"
                value={timeOfDay} onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer mt-1"
              />
            </div>

            <div className="w-full h-px bg-slate-200" />

            {/* Weather */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-700 font-bold">天气</span>
              <div className={`grid grid-cols-3 gap-2 ${isTouch ? 'gap-3' : ''}`}>
                {(["sunny","晴天"], ["rainy","雨天"], ["snowy","雪天"], ["cloudy","多云"], ["foggy","浓雾"], ["stormy","雷暴"] as const).map(([w, label]) => (
                  <button key={w} onClick={() => setWeather(w)} className={`rounded text-xs transition-colors ${isTouch ? 'py-3' : 'py-1.5'} ${weather === w ? 'hand-drawn-btn-active' : 'hand-drawn-btn'}`}>{label}</button>
                ))}
              </div>
            </div>
            {/* Wave Intensity */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-700 font-bold">海浪强度</span>
                <span className="text-xs text-slate-500">{waveIntensity.toFixed(1)}</span>
              </div>
              <input
                type="range" min="0" max="2" step="0.1"
                value={waveIntensity} onChange={(e) => setWaveIntensity(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer mt-1"
              />
            </div>

            {/* Season */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-700 font-bold">季节</span>
              <div className={`grid grid-cols-2 gap-2 ${isTouch ? 'gap-3' : ''}`}>
                {(["spring","春季"], ["summer","夏季"], ["autumn","秋季"], ["winter","冬季"] as const).map(([s, label]) => (
                  <button key={s} onClick={() => setSeason(s)} className={`rounded text-xs transition-colors ${isTouch ? 'py-3' : 'py-1.5'} ${season === s ? 'hand-drawn-btn-active' : 'hand-drawn-btn'}`}>{label}</button>
                ))}
              </div>
            </div>

            {/* Biome */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-700 font-bold">地貌</span>
              <div className={`grid grid-cols-3 gap-2 ${isTouch ? 'gap-3' : ''}`}>
                {(["default","经典"], ["forest","森林"], ["desert","沙漠"], ["tundra","冰封"], ["volcanic","火山"] as const).map(([b, label]) => (
                  <button key={b} onClick={() => setBiome(b)} className={`rounded text-xs font-medium transition-colors ${isTouch ? 'py-3' : 'py-1.5'} ${biome === b ? 'hand-drawn-btn-active' : 'hand-drawn-btn'}`}>{label}</button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* AI Narration Float */}
        {aiNarration && (
          <div className="hand-drawn-panel p-4 max-w-xs pointer-events-auto mt-4 animate-in slide-in-from-right-4 fade-in">
             <div className="flex items-center gap-2 mb-2">
                <Bot size={16} className="text-indigo-600" />
                <span className="text-xs font-black tracking-widest uppercase text-indigo-700">Island Spirit</span>
             </div>
             <p className="text-sm font-light text-slate-800 leading-relaxed italic">"{aiNarration}"</p>
          </div>
        )}

        <div className="pointer-events-auto mt-auto flex justify-end">
            <div className="relative group flex items-center mt-2">
             <input 
               type="text" 
               value={userInput}
               onChange={(e) => setUserInput(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') fetchAiNarration(); }}
               placeholder="Ask the spirit..." 
               className="w-0 group-hover:w-48 focus:w-48 transition-all duration-500 hand-drawn-panel px-0 group-hover:px-4 focus:px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
             />
             <button 
               onClick={fetchAiNarration}
               disabled={isGeneratingAi}
               className="hand-drawn-btn w-10 h-10 flex items-center justify-center -ml-4 z-10"
               title="Talk to AI"
             >
                {isGeneratingAi ? <Sparkles size={16} className="animate-spin text-indigo-500" /> : <Sparkles size={16} className="text-indigo-500" />}
             </button>
           </div>
        </div>
      </div>
      )}
      </>
      )}
      {screen === 'PLAYING' && <Toast />}
      {visitingIsland && <VisitOverlay />}
    </div>
  );
}
