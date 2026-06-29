import { useEffect, useRef, useState, lazy, Suspense } from "react";
// 懒加载 3D 场景（Three.js/r3f/drei）—— 拆出独立 chunk，大幅减小首屏主包
const GameCanvas = lazy(() => import("./components/GameCanvas").then(m => ({ default: m.GameCanvas })));
import { TitleScreen } from "./components/TitleScreen";
import { SaveSelectScreen } from "./components/SaveSelectScreen";
import { LoadingScreen, hasVisitedBefore } from "./components/LoadingScreen";
import { BUILD_CATEGORIES, MODE_TOOLS, WEATHER_OPTIONS } from "./config/toolCatalog";
import { useGameStore, ToolType } from "./store";
import {
  Eye,
  EyeOff,
  Globe,
  Dog,
  Rabbit,
  Trash2,
  Lock,
  Maximize2,
  Undo2,
  Redo2,
  TreePalm,
  Sun,
  Camera
} from "lucide-react";

import { PlayerPanel } from "./components/PlayerPanel";
import { LoginScreen } from "./components/LoginScreen";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { WelcomeGuide } from "./components/WelcomeGuide";
import { SoundLayer } from "./components/SoundLayer";
import { SignEditorModal } from "./components/SignEditorModal";
import { TelescopeOverlay } from "./components/game/TelescopeOverlay";
import { AchievementSystem } from "./components/AchievementSystem";
import { HermitOnline } from "./components/HermitOnline";
import { MailboxModal } from "./components/MailboxModal";
import { emitHermitRemove } from "./lib/socket";
import { SocialPanel } from "./components/SocialPanel";
import { Toast } from "./components/Toast";
import { FlourishHUD } from "./components/FlourishHUD";
import { GiftModal } from "./components/GiftModal";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { VisitOverlay } from "./components/VisitOverlay";
import { CiSpirit } from "./components/CiSpirit";
import { CiForecastAlert } from "./components/ui/CiForecastAlert";
import { IslandStatusPanel } from "./components/IslandStatusPanel";
import {
  useAudioBootstrap,
  useAutoFullscreen,
  useAuthBootstrap,
  useAutosave,
  useCloudIslandSync,
  useEcologyAudioSync,
  useEcologyLoop,
  useGiftClaimQuery,
  usePlaytimeLoop,
  usePresenceAndVisitEvents,
  useRestoreTitleBackground,
  useRuinsAwakening,
  useScreenBgm,
  useUnreadCountPolling,
  useUndoRedoHotkeys,
} from "./hooks/useAppLifecycle";
import { useCiProactive } from "./hooks/useCiProactive";
import { TimeWeatherSystem } from "./components/systems/TimeWeatherSystem";
import { SolarMeridian } from "./components/ui/SolarMeridian";
import { WeatherForecast } from "./components/ui/WeatherForecast";
import { PhotoModeOverlay } from "./components/ui/PhotoModeOverlay";
import { AudioSystem } from "./lib/audio";
import { BRUSH_MODES, SURFACE_LABELS } from "./utils/terrainBrush";
import type { BrushFalloff, SurfaceType } from "./utils/terrainBrush";
import { SkySystem } from './components/SkySystem';
import { TelescopeIcon } from './components/Assets';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const screen = useGameStore(state => state.screen);
  const showWelcomeGuide = useGameStore(state => state.showWelcomeGuide);
  const online = useGameStore(state => state.online);
  const mailboxOpen = useGameStore(state => state.mailboxOpen);
  const setMailboxOpen = useGameStore(state => state.setMailboxOpen);
  const mode = useGameStore(state => state.mode);

  // 辞的主动性：监听游戏事件驱动辞冒泡
  useCiProactive();
  const canUndo = useGameStore(state => state._history.length > 0);
  const canRedo = useGameStore(state => state._future.length > 0);
  const undo = useGameStore(state => state.undo);
  const redo = useGameStore(state => state.redo);
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const setTimeOfDay = useGameStore(state => state.setTimeOfDay);
  const setIsTimeScrubbing = useGameStore(state => state.setIsTimeScrubbing);
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
  
  const ciBubble = useGameStore(state => state.ci.bubble);
  const selectedTool = useGameStore(state => state.selectedTool);
  const setSelectedTool = useGameStore(state => state.setSelectedTool);
  const selectedEntityId = useGameStore(state => state.selectedEntityId);
  const setSelectedEntityId = useGameStore(state => state.setSelectedEntityId);
  const removeAsset = useGameStore(state => state.removeAsset);
  const isObservatoryMode = useGameStore(state => state.isObservatoryMode);
  const grassHealth = useGameStore(state => state.grassHealth);
  const deerCount = useGameStore(state => state.deerCount);
  const wolfCount = useGameStore(state => state.wolfCount);
  const updateEcology = useGameStore(state => state.updateEcology);
  const saveGame = useGameStore(state => state.saveGame);
  const aiNarration = useGameStore(state => state.aiNarration);
  const setAiNarration = useGameStore(state => state.setAiNarration);
  const ecoPoints = useGameStore(state => state.ecoPoints);
  const unlockedAssets = useGameStore(state => state.unlockedAssets);
  const unlockAsset = useGameStore(state => state.unlockAsset);
  const assetCount = useGameStore(state => state.assets.length);
  const springCount = useGameStore(state => {
    let count = 0;
    for (const asset of state.assets) {
      if (asset.type === 'spring') count++;
    }
    return count;
  });
  const windmillCount = useGameStore(state => {
    let count = 0;
    for (const asset of state.assets) {
      if (asset.type === 'windmill') count++;
    }
    return count;
  });

  const authUser = useGameStore(state => state.authUser);
  const setAuthUser = useGameStore(state => state.setAuthUser);
  const addToast = useGameStore(state => state.addToast);
  const visitingIsland = useGameStore(state => state.visitingIsland);
  const setVisitingIsland = useGameStore(state => state.setVisitingIsland);
  const setUnreadCount = useGameStore(state => state.setUnreadCount);
  const serverIslandMap = useGameStore(state => state.serverIslandMap);
  const setServerIslandMap = useGameStore(state => state.setServerIslandMap);
  const islandId = useGameStore(state => state.islandId);
  const isPhotoMode = useGameStore(state => state.isPhotoMode);

  const [isImmersive, setIsImmersive] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [timer3D, setTimer3D] = useState(false);
  const [autoRotateOn, setAutoRotateOn] = useState(true);
  const [giftClaimId, setGiftClaimId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [envMenuOpen, setEnvMenuOpen] = useState(false);
  const [isIslandStatusOpen, setIsIslandStatusOpen] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [hasSeenSailingTutorial, setHasSeenSailingTutorial] = useState(() => {
    try {
      return localStorage.getItem('hasSeenSailingTutorial') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [showSailingTutorial, setShowSailingTutorial] = useState(false);

  const [appLoaded, setAppLoaded] = useState(() => hasVisitedBefore());
  const lastToolRef = useRef<ToolType>('none');
  const lastCategoryRef = useRef<string | null>(null);

  // 触屏检测 + tooltip 状态
  const [isTouch, setIsTouch] = useState(false);
  const [touchTooltip, setTouchTooltip] = useState<string | null>(null);
  const touchTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetToPreload = () => {
      setAppLoaded(false);
      setIsImmersive(false);
      setIsFloating(false);
      setTimer3D(false);
      setAutoRotateOn(true);
      setGiftClaimId(null);
      setActiveCategory(null);
      setEnvMenuOpen(false);
    };
    window.addEventListener('wander:reset-app', resetToPreload);
    return () => window.removeEventListener('wander:reset-app', resetToPreload);
  }, []);

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


  useRestoreTitleBackground();
  useGiftClaimQuery(setGiftClaimId);
  useAuthBootstrap(authUser, setAuthUser);
  usePresenceAndVisitEvents(authUser, addToast, setVisitingIsland);
  useEcologyAudioSync(springCount, windmillCount, weather);
  useAutosave(saveGame);
  useUnreadCountPolling(authUser, screen, setUnreadCount);
  useCloudIslandSync(authUser, islandId);
  useAudioBootstrap(appLoaded);
  useScreenBgm(screen);
  useAutoFullscreen(screen);
  useUndoRedoHotkeys(screen);
  usePlaytimeLoop(screen, incrementPlaytime);
  useEcologyLoop(updateEcology);
  useRuinsAwakening(screen);

  useEffect(() => {
    if (selectedTool !== 'none') {
      lastToolRef.current = selectedTool;
      lastCategoryRef.current = activeCategory;
    }
  }, [selectedTool, activeCategory]);

  useEffect(() => {
    if (selectedTool !== 'eraser' && selectedEntityId) {
      setSelectedEntityId(null);
    }
  }, [selectedTool, selectedEntityId, setSelectedEntityId]);

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
             if (useGameStore.getState().drivingBoatId) {
                 useGameStore.getState().setDrivingBoatId(null);
             }
             setIsImmersive(false);
             setSelectedTool('none');
             setActiveCategory(null);
             useGameStore.getState().setDrivingBoatId(null);
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

  const brushMode = useGameStore(s => s.brushMode);
  const brushSize = useGameStore(s => s.brushSize);
  const brushStrength = useGameStore(s => s.brushStrength);
  const brushFalloff = useGameStore(s => s.brushFalloff);
  const brushPaintType = useGameStore(s => s.brushPaintType);
  const drivingBoatId = useGameStore(s => s.drivingBoatId);
  const setDrivingBoatId = useGameStore(s => s.setDrivingBoatId);

  useEffect(() => {
    if (drivingBoatId && !hasSeenSailingTutorial) {
        setShowSailingTutorial(true);
    } else {
        setShowSailingTutorial(false);
    }
  }, [drivingBoatId, hasSeenSailingTutorial]);

  const activeCatObj = BUILD_CATEGORIES.find(c => c.name === activeCategory);

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
    <div
      className="w-full h-screen relative bg-slate-950 overflow-hidden font-sans text-slate-100 flex"
      style={isFloating ? { position: 'fixed', top: 16, right: 16, width: '100vw', height: '100vh', transform: 'scale(0.32)', transformOrigin: 'top right', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 100 } : undefined}
    >
      {/* 全局交互音效层（hover / click） */}
      <SoundLayer />

      {/* Loading Screen — shows before everything else */}
      {!appLoaded && <LoadingScreen onReady={() => setAppLoaded(true)} />}

      {/* Center Canvas（懒加载，载入前用渐变占位避免黑屏） */}
      <div className={`absolute inset-0 z-0 transition-all duration-1000 ${screen !== 'PLAYING' ? 'blur-none brightness-100' : 'blur-none brightness-100'}`}>
        <Suspense fallback={<div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#bfe3f5 0%,#e8f6ff 55%,#dff3e6 100%)' }} />}>
          <GameCanvas immersive={isImmersive} timer3D={timer3D} autoRotateOn={autoRotateOn} />
        </Suspense>
      </div>

      {appLoaded && screen === 'TITLE' && <TitleScreen />}
      {appLoaded && screen === 'LOGIN' && <LoginScreen />}
      {appLoaded && screen === 'ONBOARD' && <OnboardingFlow />}
      <AnimatePresence>
        {appLoaded && screen === 'SAVE_SELECT' && <SaveSelectScreen key="save-select" />}
      </AnimatePresence>

      {screen === 'PLAYING' && selectedTool === 'eraser' && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-50 ${isTouch ? 'bottom-28' : 'bottom-10'}`}>
          {selectedEntityId ? (
            <button
              onClick={() => {
                if (useGameStore.getState().online) {
                  const a = useGameStore.getState().assets.find(x => x.id === selectedEntityId);
                  if (a) emitHermitRemove(a.position.x, a.position.z, 0.6);
                }
                removeAsset(selectedEntityId);
                setSelectedEntityId(null);
                AudioSystem.playPop();
              }}
              className="hand-drawn-btn-active px-5 py-3 rounded-2xl text-sm font-bold tracking-widest text-red-700 bg-white/95 shadow-lg backdrop-blur flex items-center gap-2"
            >
              <Trash2 size={16} />
              确认擦除当前物体
            </button>
          ) : (
            <div className="px-4 py-2 rounded-2xl bg-white/90 shadow-md text-xs font-bold tracking-widest text-slate-700">
              先点选一个物体，再确认擦除
            </div>
          )}
        </div>
      )}

      {screen === 'PLAYING' && !isObservatoryMode && !isPhotoMode && (
        <>
          {/* Top Left Header & HUD */}
      {!isImmersive && (
        <div 
          className={`absolute z-50 flex flex-col items-start gap-2 transition-opacity duration-300 ${isTouch ? 'top-3 left-3 touch-safe-top touch-safe-left' : 'top-6 left-6 gap-4'}`}
          onMouseLeave={() => !isTouch && document.getElementById('left-bar-hit-area')?.dispatchEvent(new MouseEvent('mouseleave'))}
        >
           {/* Profile / Avatar (Top Left) */}
           <PlayerPanel />

           {/* Tool Column (Below Avatar) - Hover to reveal */}
           <motion.div 
             className="relative group/left"
             initial="hidden"
             whileHover="visible"
             animate={ciBubble ? "visible" : "hidden"}
           >
              {/* Hit Area for left edge */}
              <div id="left-bar-hit-area" className="absolute -left-6 -top-2 w-20 h-[50vh] pointer-events-auto" />
              
              <div className={`flex ${isTouch ? 'flex-row gap-2' : 'flex-col gap-4'} pointer-events-none group-hover/left:pointer-events-auto`}>
                 {/* 小岛面板 */}
                 <motion.button
                    variants={{
                      hidden: { opacity: 0, x: -50, scale: 0.8 },
                      visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25, delay: 0.05 } }
                    }}
                    id="guide-islandhub"
                    onClick={() => { AudioSystem.playClick(); setIsIslandStatusOpen(true); showTouchTooltip('小岛面板'); }}
                    className={`group relative flex items-center justify-center hand-drawn-btn shrink-0 hover:scale-110 active:scale-95 ${isTouch ? 'w-11 h-11' : 'w-12 h-12'}`}
                 >
                    <TreePalm size={isTouch ? 20 : 24} className="text-slate-800 group-hover:text-emerald-600 transition-colors" />
                    {!isTouch && (
                    <span className="absolute -right-24 top-1/2 -translate-y-1/2 hand-drawn-panel text-slate-800 text-xs font-bold py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        小岛面板
                    </span>
                    )}
                 </motion.button>

                 <motion.button
                    variants={{
                      hidden: { opacity: 0, x: -50, scale: 0.8 },
                      visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25, delay: 0.1 } }
                    }}
                    id="guide-immersive"
                    onClick={() => { setIsImmersive(!isImmersive); showTouchTooltip(isImmersive ? '退出沉浸模式' : '沉浸模式'); }}
                    className={`group relative flex items-center justify-center hand-drawn-btn shrink-0 hover:scale-110 active:scale-95 ${isTouch ? 'w-11 h-11' : 'w-12 h-12'}`}
                 >
                    {isImmersive ? <EyeOff size={isTouch ? 20 : 24} className="text-slate-800" /> : <Eye size={isTouch ? 20 : 24} className="text-slate-800" />}
                    {!isTouch && (
                    <span className="absolute -right-24 top-1/2 -translate-y-1/2 hand-drawn-panel text-slate-800 text-xs font-bold py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {isImmersive ? "退出沉浸模式" : "沉浸模式"}
                    </span>
                    )}
                 </motion.button>

                 <motion.button
                    variants={{
                      hidden: { opacity: 0, x: -50, scale: 0.8 },
                      visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25, delay: 0.15 } }
                    }}
                    onClick={() => { setEnvMenuOpen(!envMenuOpen); showTouchTooltip('生态面板'); }}
                    className={`group relative flex items-center justify-center hand-drawn-btn shrink-0 hover:scale-110 active:scale-95 ${isTouch ? 'w-11 h-11' : 'w-12 h-12'} ${envMenuOpen ? 'hand-drawn-btn-active' : ''}`}
                 >
                    <Globe size={isTouch ? 20 : 24} className={envMenuOpen ? 'text-amber-700' : 'text-slate-800'} />
                    {!isTouch && (
                    <span className="absolute -right-20 top-1/2 -translate-y-1/2 hand-drawn-panel text-slate-800 text-xs font-bold py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        生态面板
                    </span>
                    )}
                 </motion.button>

                 <motion.div
                    variants={{
                      hidden: { opacity: 0, x: -50, scale: 0.8 },
                      visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25, delay: 0.2 } }
                    }}
                 >
                    <SocialPanel />
                 </motion.div>

                 <motion.div
                    variants={{
                      hidden: { opacity: 0, x: -50, scale: 0.8 },
                      visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25, delay: 0.22 } }
                    }}
                    className="relative group shrink-0"
                 >
                    <CiSpirit />
                    {!isTouch && (
                      <span className="absolute -right-24 top-1/2 -translate-y-1/2 hand-drawn-panel text-slate-800 text-xs font-bold py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          织潮者辞
                      </span>
                    )}
                 </motion.div>

                 {/* 全屏按钮 - 仅触屏显示 */}
                 {isTouch && (
                   <motion.button
                      variants={{
                        hidden: { opacity: 0, x: -50, scale: 0.8 },
                        visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25, delay: 0.25 } }
                      }}
                      onClick={() => { handleFullscreen(); showTouchTooltip('全屏'); }}
                      className="group relative flex items-center justify-center hand-drawn-btn shrink-0 w-11 h-11 hover:scale-110 active:scale-95"
                   >
                      <Maximize2 size={20} className="text-slate-800" />
                   </motion.button>
                 )}
              </div>
           </motion.div>
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
               
               <div className="flex items-center gap-6">
                 <button
                    onClick={() => setTimer3D((v) => !v)}
                    className="pointer-events-auto flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                 >
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase">{timer3D ? 'Center Clock' : 'Clock On Island'}</span>
                 </button>
                 <button
                    onClick={() => setAutoRotateOn((v) => !v)}
                    className="pointer-events-auto flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                 >
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase">{autoRotateOn ? 'Rotation On' : 'Rotation Off'}</span>
                 </button>
                 <button
                    onClick={() => setIsFloating((f) => !f)}
                    className="pointer-events-auto flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                 >
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase">{isFloating ? 'Restore' : 'Float'}</span>
                    <Maximize2 size={18} className="font-light" />
                 </button>
                 <button
                    onClick={() => { setIsImmersive(false); setIsFloating(false); }}
                    className="pointer-events-auto flex items-center gap-3 text-white/40 hover:text-white transition-colors group"
                 >
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity">Wake Up</span>
                    <EyeOff size={20} className="font-light" />
                 </button>
               </div>
           </div>

           {/* 专注番茄钟（中央显示；切到 3D 时改由岛上 Html 渲染）*/}
           {!timer3D && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <PomodoroTimer />
           </div>
           )}

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
      {!isImmersive && !isObservatoryMode && !isPhotoMode && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center justify-end pointer-events-none pb-4">
          <div 
            id="tool-dock" 
            className={`relative flex flex-col items-center gap-3 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isTouch ? 'touch-safe-bottom' : 'gap-4'}`}
            onMouseLeave={() => !isTouch && setActiveCategory(null)}
          >

          {/* Touch tooltip banner */}
          {touchTooltip && isTouch && (
            <div className="hand-drawn-panel px-4 py-2 text-sm font-bold text-slate-800 animate-in fade-in duration-200 pointer-events-none">
              {touchTooltip}
            </div>
          )}

          {/* Balloon color picker */}
          {String(selectedTool).startsWith('balloon') && (
            <div className="hand-drawn-panel px-3 py-2 flex gap-2 items-center pointer-events-auto relative before:absolute before:-bottom-6 before:left-0 before:w-full before:h-6 before:content-[''] animate-in slide-in-from-bottom-8 fade-in duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
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
          <AnimatePresence>
            {activeCategory && activeCatObj && (
              <motion.div
                key="submenu"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`hand-drawn-panel px-2 py-2 pointer-events-auto relative before:absolute before:-bottom-8 before:left-0 before:w-full before:h-8 before:content-[''] ${isTouch ? 'touch-tools-scroll' : 'flex gap-2'}`}
              >
                {activeCatObj.tools.map((t) => {
                  const Icon = t.icon;
                  const isActive = selectedTool === t.id;
                  const isUnlocked = mode === 'creative' ? true : (t.cost === 0 || unlockedAssets.includes(t.id));
                  const canAfford = ecoPoints >= t.cost;

                  return (
                    <button
                      key={t.id}
                      id={`guide-tool-${t.id}`}
                      onClick={() => {
                        if (!isUnlocked) {
                           if (canAfford && confirm(`解锁 ${t.label} 需要 ${t.cost} EP？`)) {
                               unlockAsset(t.id, t.cost);
                           }
                           return;
                        }
                        setSelectedTool(t.id as ToolType);
                        if (t.id === 'terrainUp') useGameStore.getState().setBrushMode('raise');
                        if (t.id === 'terrainDown') useGameStore.getState().setBrushMode('lower');
                        showTouchTooltip(t.label);
                      }}
                      className={`hand-drawn-btn relative flex items-center justify-center group/btn shrink-0 hover:scale-110 active:scale-95 transition-transform
                        ${isTouch ? 'w-12 h-12' : 'w-12 h-12'}
                        ${!isUnlocked ? "opacity-50" : (isActive ? "hand-drawn-btn-active" : "")}
                      `}
                    >
                      <Icon size={isActive ? (isTouch ? 22 : 22) : (isTouch ? 20 : 20)} className={isActive ? "text-amber-700" : "text-slate-800"} />
                      {!isUnlocked && <Lock size={10} className="absolute bottom-1 right-1 text-amber-400 drop-shadow-md" />}
                      
                      {!isTouch && (
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 hand-drawn-panel text-[12px] font-bold py-1 px-3 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          {t.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Dock：常驻模式区 + 分类区（合并为单一面板，避免错位） */}
          <div className="hand-drawn-panel flex items-center gap-2 pointer-events-auto max-w-[97vw] px-3 py-2">

          {/* 撤销 / 重做 */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { AudioSystem.playTap(); undo(); }}
              disabled={!canUndo}
              title="撤销 (Ctrl+Z)"
              className={`hand-drawn-btn relative shrink-0 w-12 h-12 ${!canUndo ? 'opacity-40' : ''}`}
            >
              <Undo2 size={20} className="text-slate-800 mx-auto" />
            </button>
            <button
              onClick={() => { AudioSystem.playTap(); redo(); }}
              disabled={!canRedo}
              title="重做 (Ctrl+Shift+Z)"
              className={`hand-drawn-btn relative shrink-0 w-12 h-12 ${!canRedo ? 'opacity-40' : ''}`}
            >
              <Redo2 size={20} className="text-slate-800 mx-auto" />
            </button>
          </div>

          {/* 常驻模式：选择 / 橡皮擦（始终显示） */}
          <div id="guide-modes" className="flex gap-2 shrink-0">
            {MODE_TOOLS.map((m) => {
              const ModeIcon = m.icon;
              const isActive = selectedTool === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { setSelectedTool(m.id as ToolType); showTouchTooltip(m.label); }}
                  className={`hand-drawn-btn relative group/btn shrink-0 ${isTouch ? 'w-12 h-12' : 'w-12 h-12'} ${isActive ? 'hand-drawn-btn-active' : ''}`}
                >
                  <ModeIcon size={isTouch ? 22 : 24} className={isActive ? 'text-amber-700' : 'text-slate-800'} />
                  {!isTouch && (
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 hand-drawn-panel text-[12px] font-bold py-1 px-3 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {m.label}
                    </span>
                  )}
                </button>
              );
            })}
            {/* 专业拍照模式按钮 */}
            <button
              onClick={() => { AudioSystem.playClick(); useGameStore.getState().setPhotoMode(true); showTouchTooltip('专业相机'); }}
              className={`hand-drawn-btn relative group/btn shrink-0 ${isTouch ? 'w-12 h-12' : 'w-12 h-12'}`}
            >
              <Camera size={isTouch ? 22 : 24} className="text-slate-800" />
              {!isTouch && (
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 hand-drawn-panel text-[12px] font-bold py-1 px-3 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  专业相机
                </span>
              )}
            </button>
          </div>

          {/* 分隔线 */}
          <div className="w-px self-stretch bg-slate-800/15 mx-1 my-1" />

          {/* Main Category Dock — 手机端可横向滚动 */}
          <div id="guide-build" className={`flex gap-2 ${isTouch ? 'touch-tools-scroll' : 'gap-3'}`}>
            {BUILD_CATEGORIES.map((c) => {
              const CategoryIcon = c.icon;
              const isActive = activeCategory === c.name;
              
              return (
                <button
                  key={c.name}
                  id={`guide-cat-${c.name}`}
                  onClick={() => {
                    setActiveCategory(isActive ? null : c.name);
                    showTouchTooltip(c.name);
                  }}
                  onMouseEnter={() => {
                    if (!isTouch && !isActive) {
                      setActiveCategory(c.name);
                      showTouchTooltip(c.name);
                    }
                  }}
                  className={`hand-drawn-btn relative group/cat shrink-0
                    ${isTouch ? 'w-12 h-12' : 'p-3'}
                    ${isActive ? "hand-drawn-btn-active" : ""}
                  `}
                >
                  <CategoryIcon size={isTouch ? 22 : 24} className={isActive ? "text-amber-700" : "text-slate-800"} />
                  
                  {!isTouch && (
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 hand-drawn-panel text-[12px] font-bold py-1 px-3 opacity-0 group-hover/cat:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {c.name}
                    </span>
                  )}
                  
                  {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-700 rounded-full" />}
                </button>
              );
            })}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Right Side Tools - Save, Settings, etc */}
      {!isImmersive && !isObservatoryMode && !isPhotoMode && (
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
            <div id="guide-sundial" className="relative h-12 flex flex-col justify-end bg-[#f1f5f9] border-t border-slate-200">
                <div className="absolute top-1 left-2 flex items-center gap-1.5 opacity-80 pointer-events-none">
                 <Sun size={12} className="text-amber-500" />
                 <span className="font-mono text-xs font-bold text-slate-800">{Math.floor(timeOfDay).toString().padStart(2, '0')}:00</span>
              </div>
              <input
                type="range" min="0" max="24" step="0.5"
                value={timeOfDay} onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                onPointerDown={() => setIsTimeScrubbing(true)}
                onPointerUp={() => setIsTimeScrubbing(false)}
                onPointerCancel={() => setIsTimeScrubbing(false)}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer mt-1"
              />
            </div>

            <div className="w-full h-px bg-slate-200" />

            {/* Weather */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-700 font-bold">天气</span>
              <div className={`grid grid-cols-3 gap-2 ${isTouch ? 'gap-3' : ''}`}>
                {WEATHER_OPTIONS.map(([w, label]) => (
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
                {([["spring","春季"], ["summer","夏季"], ["autumn","秋季"], ["winter","冬季"]] as const).map(([s, label]) => (
                  <button key={s} onClick={() => setSeason(s)} className={`rounded text-xs transition-colors ${isTouch ? 'py-3' : 'py-1.5'} ${season === s ? 'hand-drawn-btn-active' : 'hand-drawn-btn'}`}>{label}</button>
                ))}
              </div>
            </div>

            {/* Biome */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-700 font-bold">地貌</span>
              <div className={`grid grid-cols-3 gap-2 ${isTouch ? 'gap-3' : ''}`}>
                {([["default","经典"], ["forest","森林"], ["desert","沙漠"], ["tundra","冰封"], ["volcanic","火山"]] as const).map(([b, label]) => (
                  <button key={b} onClick={() => setBiome(b)} className={`rounded text-xs font-medium transition-colors ${isTouch ? 'py-3' : 'py-1.5'} ${biome === b ? 'hand-drawn-btn-active' : 'hand-drawn-btn'}`}>{label}</button>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
      )}
      </>
      )}
      {screen === 'PLAYING' && (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-44 z-50 pointer-events-auto flex flex-col items-center gap-1.5">
          {/* 上行：笔刷模式 */}
          <div className="hand-drawn-panel px-3 py-2 flex items-center gap-2">
            {BRUSH_MODES.map(m => (
              <button key={m.id}
                onClick={() => { AudioSystem.playTap(); useGameStore.getState().setBrushMode(m.id); }}
                className={`hand-drawn-btn px-3 py-1.5 text-xs font-bold whitespace-nowrap ${brushMode === m.id ? 'hand-drawn-btn-active' : ''}`}>
                {m.label}
              </button>
            ))}
          </div>
          {/* 下行：参数（材质色块 / 羽化 / 大小 / 力度） */}
          <div className="hand-drawn-panel px-3 py-2 flex items-center gap-3">
            {/* 材质色块（仅 paint 模式） */}
            {brushMode === 'paint' && (
              <div className="flex items-center gap-1">
                {([2, 3, 4, 1, 5] as SurfaceType[]).map(st => (
                  <button key={st}
                    onClick={() => useGameStore.getState().setBrushPaintType(st)}
                    className={`hand-drawn-btn px-2 py-1 text-[10px] font-bold ${brushPaintType === st ? 'hand-drawn-btn-active' : ''}`}>
                    {SURFACE_LABELS[st]}
                  </button>
                ))}
                <div className="w-px h-5 bg-slate-300 mx-1" />
              </div>
            )}
            {/* 羽化 */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500">羽化</span>
              {(['smooth', 'linear', 'sharp'] as BrushFalloff[]).map(f => (
                <button key={f}
                  onClick={() => useGameStore.getState().setBrushFalloff(f)}
                  className={`hand-drawn-btn px-2 py-1 text-[10px] font-bold ${brushFalloff === f ? 'hand-drawn-btn-active' : ''}`}>
                  {f === 'smooth' ? '柔' : f === 'linear' ? '线' : '锐'}
                </button>
              ))}
            </div>
            {/* 分隔线 */}
            <div className="w-px h-5 bg-slate-300" />
            {/* 大小 */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500">大小</span>
              <input type="range" min={0.5} max={10} step={0.5} value={brushSize}
                onChange={e => useGameStore.getState().setBrushSize(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer" />
              <span className="text-[10px] text-slate-400 w-5 text-right">{brushSize}</span>
            </div>
            {/* 力度 */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500">力度</span>
              <input type="range" min={0.05} max={1} step={0.05} value={brushStrength}
                onChange={e => useGameStore.getState().setBrushStrength(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer" />
              <span className="text-[10px] text-slate-400 w-5 text-right">{brushStrength.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Photo Mode UI needs to be outside the hidden block above */}
      {screen === 'PLAYING' && <PhotoModeOverlay />}

      {screen === 'PLAYING' && <Toast />}
      {screen === 'PLAYING' && showWelcomeGuide && <WelcomeGuide />}
      {screen === 'PLAYING' && !isImmersive && <CiForecastAlert />}
      {screen === 'PLAYING' && <SignEditorModal />}
      {screen === 'PLAYING' && <AchievementSystem />}
      {screen === 'PLAYING' && online && <HermitOnline />}
      {screen === 'PLAYING' && mailboxOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm" onClick={() => setMailboxOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <MailboxModal onClose={() => setMailboxOpen(false)} />
          </div>
        </div>
      )}

      {/* --- Driving Overlay UI --- */}
      {drivingBoatId && screen === 'PLAYING' && !showSailingTutorial && !isObservatoryMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center justify-center z-50">
           <button 
             className="group relative bg-[#fcf8ec] hover:bg-[#ff7675] border-[3px] border-slate-800 p-2.5 rounded-full shadow-[4px_4px_0_rgba(30,41,59,1)] hover:shadow-[2px_2px_0_rgba(30,41,59,1)] hover:translate-x-[2px] hover:translate-y-[2px] rotate-[-2deg] hover:rotate-[0deg] transition-all pointer-events-auto cursor-pointer"
             onClick={() => { setDrivingBoatId(null); AudioSystem.playPop(); }}
             title="点击退出航行 (Esc)"
           >
             {/* Default Sailing Icon */}
             <svg className="text-slate-800 group-hover:hidden transition-colors" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/></svg>
             {/* Hover Exit Icon */}
             <svg className="text-slate-900 hidden group-hover:block transition-colors" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>
        </div>
      )}

      {/* --- Observatory Overlay UI --- */}
      {isObservatoryMode && screen === 'PLAYING' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-50 pointer-events-none">
           <button
             className="group relative bg-[#fcf8ec] hover:bg-[#ff7675] border-[3px] border-slate-800 p-2.5 rounded-full shadow-[4px_4px_0_rgba(30,41,59,1)] hover:shadow-[2px_2px_0_rgba(30,41,59,1)] hover:translate-x-[2px] hover:translate-y-[2px] rotate-[-2deg] hover:rotate-[0deg] transition-all pointer-events-auto cursor-pointer"
             onClick={() => { useGameStore.getState().setObservatoryMode(false); AudioSystem.playPop(); }}
             title="点击退出观测 (Esc)"
           >
             <div className="group-hover:hidden text-slate-800"><TelescopeIcon /></div>
             {/* Hover Exit Icon */}
             <svg className="text-slate-900 hidden group-hover:block transition-colors" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>
        </div>
      )}

      {/* 望远镜目镜覆层：镜筒 / 准星 / 变焦 / 星图进度 / 揭晓星卡 */}
      <TelescopeOverlay />

      {/* --- Sailing Tutorial Dialog (First Time Only) --- */}
      {showSailingTutorial && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto">
             <div className="bg-[#fcf8ec] border-[3px] border-slate-800 p-8 shadow-[8px_8px_0_rgba(30,41,59,1)] rotate-[-1deg] flex flex-col items-center max-w-sm">
                <svg className="mb-4 text-slate-800" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/></svg>
                
                <h2 className="text-2xl font-black text-slate-800 mb-6 font-['ZCOOL_KuaiLe',cursive]" style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>航行提示</h2>
                
                <div className="flex flex-col gap-4 text-slate-700 font-bold mb-8 text-center text-lg">
                    <p>使用 <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded border border-blue-300 shadow-sm mx-1">W A S D</span> 控制方向</p>
                    <p>按住 <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-300 shadow-sm mx-1">Shift</span> 开启破浪冲刺</p>
                    <p>按下 <span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded border border-slate-400 shadow-sm mx-1">Esc</span> 随时退出航行</p>
                </div>
                
                <button 
                  className="px-8 py-3 bg-[#10b981] hover:bg-[#059669] text-white font-black text-xl border-[3px] border-slate-800 shadow-[4px_4px_0_rgba(30,41,59,1)] hover:shadow-[2px_2px_0_rgba(30,41,59,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-['ZCOOL_KuaiLe',cursive]"
                  style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}
                  onClick={() => {
                      try {
                          localStorage.setItem('hasSeenSailingTutorial', 'true');
                      } catch (e) {}
                      setHasSeenSailingTutorial(true);
                      setShowSailingTutorial(false);
                      AudioSystem.playPop();
                  }}
                >
                  我知道了
                </button>
             </div>
          </div>
      )}

      <FlourishHUD />
      {giftClaimId && (
        <GiftModal mode="claim" giftId={giftClaimId} onClose={() => { setGiftClaimId(null); history.replaceState({}, '', location.pathname); }} />
      )}
      {isIslandStatusOpen && <IslandStatusPanel onClose={() => setIsIslandStatusOpen(false)} />}
      {visitingIsland && <VisitOverlay />}
    </div>
  );
}
