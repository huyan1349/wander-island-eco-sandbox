import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import {
    X,
    Globe,
    Wifi,
    User,
    Camera,
    Edit2,
    Mail,
    BookOpen,
    Compass,
    LogOut,
    Volume2,
    Music2,
    Monitor,
    Palette,
    Gauge,
    Shield,
    Trash2,
    Sparkles,
    Check,
    Waves,
    RotateCcw,
} from 'lucide-react';
import { AudioSystem } from '../lib/audio';
import { api } from '../lib/api';
import { disconnectSocket } from '../lib/socket';
import { PlayerPanel } from './PlayerPanel';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

type ModalType = 'NONE' | 'SETTINGS' | 'CREDITS' | 'PROFILE' | 'MAILBOX' | 'VISITORS' | 'PLAZA' | 'PRIVACY';
type QualityPreset = 'performance' | 'balanced' | 'cinematic';

let hasSeenSplash = false;

const readStoredBool = (key: string, fallback: boolean) => {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value === 'true';
    } catch {
        return fallback;
    }
};

const readStoredString = <T extends string>(key: string, fallback: T, values: readonly T[]) => {
    try {
        const value = localStorage.getItem(key) as T | null;
        return value && values.includes(value) ? value : fallback;
    } catch {
        return fallback;
    }
};

export const TitleScreen: React.FC = () => {
    const setScreen = useGameStore(state => state.setScreen);
    const titleTheme = useGameStore(state => state.titleTheme);
    const setTitleTheme = useGameStore(state => state.setTitleTheme);
    const authUser = useGameStore(state => state.authUser);
    const setAuthUser = useGameStore(state => state.setAuthUser);
    const clearAuthUser = useGameStore(state => state.clearAuthUser);
    const playerLevel = useGameStore(state => state.playerLevel);
    const playerXP = useGameStore(state => state.playerXP);
    const ecoPoints = useGameStore(state => state.ecoPoints);
    const stats = useGameStore(state => state.stats);
    const islandName = useGameStore(state => state.islandName);

    const initialSkipIntro = readStoredBool('wander_title_skip_intro', false);
    const [activeModal, setActiveModal] = useState<ModalType>('NONE');
    const [splashPhase, setSplashPhase] = useState<'AUTHOR' | 'TITLE' | 'DONE'>(hasSeenSplash || initialSkipIntro ? 'DONE' : 'AUTHOR');
    const [splashVisible, setSplashVisible] = useState(false);
    const [splashOverlayVisible, setSplashOverlayVisible] = useState(!(hasSeenSplash || initialSkipIntro));

    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [isEditingMotto, setIsEditingMotto] = useState(false);
    const [tempMotto, setTempMotto] = useState('');
    const [unreadMailCount, setUnreadMailCount] = useState(0);

    const [masterVol, setMasterVol] = useState(0.6);
    const [bgmVol, setBgmVol] = useState(0.5);
    const [qualityPreset, setQualityPreset] = useState<QualityPreset>(() => readStoredString<QualityPreset>('wander_title_quality', 'balanced', ['performance', 'balanced', 'cinematic']));
    const [skipIntro, setSkipIntro] = useState(initialSkipIntro);
    const [reducedMotion, setReducedMotion] = useState(() => readStoredBool('wander_title_reduce_motion', false));
    const [ambientDetail, setAmbientDetail] = useState(() => readStoredBool('wander_title_ambient_detail', true));
    const [isClearingData, setIsClearingData] = useState(false);

    const deleteIndexedDb = (name: string) => new Promise<void>((resolve) => {
        try {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
        } catch {
            resolve();
        }
    });

    const clearAllData = async () => {
        setIsClearingData(true);
        AudioSystem.stopAllNow();

        // 保存登录态
        const token = api.getToken();
        const authUserStr = localStorage.getItem('auth_user');

        // 清除所有本地存储
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}

        // 恢复登录态
        if (token) api.setToken(token);
        if (authUserStr) try { localStorage.setItem('auth_user', authUserStr); } catch {}

        // 清除 cookies、caches、service workers、IndexedDB
        document.cookie.split(';').forEach((c) => {
            const name = c.split('=')[0]?.trim();
            if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
        try {
            const keys = await window.caches?.keys?.();
            if (keys) await Promise.allSettled(keys.map((k) => caches.delete(k)));
        } catch {}
        try {
            const regs = await navigator.serviceWorker?.getRegistrations?.();
            if (regs) await Promise.allSettled(regs.map((r) => r.unregister()));
        } catch {}
        try {
            const idb = window.indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> };
            const dbs = await idb.databases?.();
            if (dbs) await Promise.allSettled(dbs.map((db) => db.name ? deleteIndexedDb(db.name) : Promise.resolve()));
        } catch {}

        // 刷新页面彻底重置
        window.location.reload();
    };

    // 监听游戏内打开隐私政策的请求
    useEffect(() => {
        const handler = () => setActiveModal('PRIVACY');
        window.addEventListener('wander:show-privacy', handler);
        return () => window.removeEventListener('wander:show-privacy', handler);
    }, []);

    // 已登录玩家进入标题时的「欢迎回来」通知
    const [welcomeBack, setWelcomeBack] = useState(false);
    const welcomeShownRef = useRef(false);
    useEffect(() => {
        if (splashPhase === 'DONE' && authUser && !welcomeShownRef.current) {
            welcomeShownRef.current = true;
            const t1 = setTimeout(() => { setWelcomeBack(true); AudioSystem.playPop(); }, 400);
            const t2 = setTimeout(() => setWelcomeBack(false), 5000);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [splashPhase, authUser]);

    // 触屏检测
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        const hasCoarse = window.matchMedia('(pointer: coarse)').matches;
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        setIsTouch(hasCoarse || hasTouch);
    }, []);

    useEffect(() => {
        if (authUser) {
            api.getUnreadMailCount().then(res => setUnreadMailCount(res.count)).catch(() => {});
        }
    }, [authUser]);

    React.useEffect(() => {
        if (splashPhase === 'DONE') {
            hasSeenSplash = true;
            return;
        }
        setSplashVisible(true);
        const t1 = setTimeout(() => setSplashVisible(false), 2500);
        const t2 = setTimeout(() => {
            if (splashPhase === 'AUTHOR') {
                setSplashPhase('TITLE');
            } else if (splashPhase === 'TITLE') {
                setSplashPhase('DONE');
                useGameStore.getState().setIsSplashDone(true);
                setTimeout(() => setSplashOverlayVisible(false), 2000);
            }
        }, 4000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [splashPhase]);

    useEffect(() => {
        try {
            const savedMaster = localStorage.getItem('wander_master_volume');
            const savedBgm = localStorage.getItem('wander_bgm_volume');
            if (savedMaster !== null) {
                const v = Math.max(0, Math.min(1, parseFloat(savedMaster)));
                setMasterVol(v);
                AudioSystem.setMasterVolume(v);
            }
            if (savedBgm !== null) {
                const v = Math.max(0, Math.min(1, parseFloat(savedBgm)));
                setBgmVol(v);
                AudioSystem.setBGMVolume(v);
            }
        } catch {}
    }, []);

    const handleMasterVol = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        setMasterVol(v);
        AudioSystem.setMasterVolume(v);
        try { localStorage.setItem('wander_master_volume', String(v)); } catch {}
    };

    const handleBgmVol = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        setBgmVol(v);
        AudioSystem.setBGMVolume(v);
        try { localStorage.setItem('wander_bgm_volume', String(v)); } catch {}
    };

    const setQuality = (preset: QualityPreset) => {
        AudioSystem.playTap();
        setQualityPreset(preset);
        try { localStorage.setItem('wander_title_quality', preset); } catch {}
    };

    const toggleSkipIntro = () => {
        AudioSystem.playTap();
        setSkipIntro((prev) => {
            const next = !prev;
            try { localStorage.setItem('wander_title_skip_intro', String(next)); } catch {}
            if (next) {
                hasSeenSplash = true;
                setSplashPhase('DONE');
                setSplashOverlayVisible(false);
            }
            return next;
        });
    };

    const toggleReducedMotion = () => {
        AudioSystem.playTap();
        setReducedMotion((prev) => {
            const next = !prev;
            try { localStorage.setItem('wander_title_reduce_motion', String(next)); } catch {}
            return next;
        });
    };

    const toggleAmbientDetail = () => {
        AudioSystem.playTap();
        setAmbientDetail((prev) => {
            const next = !prev;
            try { localStorage.setItem('wander_title_ambient_detail', String(next)); } catch {}
            return next;
        });
    };

    const resetTitlePreferences = () => {
        AudioSystem.playClose();
        setMasterVol(0.6);
        setBgmVol(0.5);
        setQualityPreset('balanced');
        setSkipIntro(false);
        setReducedMotion(false);
        setAmbientDetail(true);
        AudioSystem.setMasterVolume(0.6);
        AudioSystem.setBGMVolume(0.5);
        try {
            localStorage.removeItem('wander_master_volume');
            localStorage.removeItem('wander_bgm_volume');
            localStorage.removeItem('wander_title_quality');
            localStorage.removeItem('wander_title_skip_intro');
            localStorage.removeItem('wander_title_reduce_motion');
            localStorage.removeItem('wander_title_ambient_detail');
        } catch {}
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return;
        api.updateProfile({ avatarFile: file })
            .then(res => setAuthUser(res.user))
            .catch(err => console.error('Avatar upload failed:', err));
    };

    const handleSaveName = async () => {
        if (tempName.trim()) {
            try {
                const res = await api.updateProfile({ username: tempName.trim() });
                setAuthUser(res.user);
            } catch {}
        }
        setIsEditingName(false);
    };

    const handleSaveMotto = async () => {
        try {
            const res = await api.updateProfile({ motto: tempMotto });
            setAuthUser(res.user);
        } catch {}
        setIsEditingMotto(false);
    };

    const handleLogout = () => {
        api.setToken(null);
        disconnectSocket();
        clearAuthUser();
        setActiveModal('NONE');
    };

    return (
        <>
            {/* Splash Overlay */}
            {splashOverlayVisible && (
                <div className={`absolute inset-0 z-[100] flex items-center justify-center pointer-events-auto transition-all duration-[2000ms] ease-out ${splashPhase === 'DONE' ? 'opacity-0 bg-transparent backdrop-blur-none' : 'opacity-100 bg-slate-950/40 backdrop-blur-md'}`}>
                    <div
                        className="flex flex-col items-center gap-4 transition-all duration-[2000ms] ease-out"
                        style={{
                            opacity: splashVisible ? 1 : 0,
                            filter: splashVisible ? 'blur(0px)' : 'blur(12px)',
                            transform: splashVisible ? 'scale(1)' : 'scale(1.05)'
                        }}
                    >
                        {splashPhase === 'AUTHOR' && (
                            <>
                                <img
                                    src="/title/island-outline.svg"
                                    alt=""
                                    width={56}
                                    height={56}
                                    fetchPriority="high"
                                    className="w-14 h-14 opacity-90 drop-shadow-xl"
                                />
                                <span className="text-slate-300 text-sm tracking-[0.4em] uppercase font-bold">A Game By</span>
                                <h2 className="text-white text-4xl font-bold tracking-[0.3em] hand-drawn-title drop-shadow-lg text-center">HUYAN<br />and XYH</h2>
                            </>
                        )}
                        {splashPhase === 'TITLE' && (
                            <>
                                <img
                                    src="/title/island-outline.svg"
                                    alt=""
                                    className="w-16 h-16 opacity-95 drop-shadow-2xl"
                                />
                                <h1 className="text-white text-[3.5rem] font-bold tracking-[0.2em] hand-drawn-title drop-shadow-2xl">WANDER ISLAND</h1>
                                <span className="text-slate-300 text-xl tracking-[0.5em] hand-drawn-title">流 浪 岛</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 欢迎回来 通知（已登录玩家，开场动画后弹出） */}
            {authUser && splashPhase === 'DONE' && (
                <div
                    className="absolute top-10 left-1/2 z-[90] pointer-events-none transition-all duration-500"
                    style={{ opacity: welcomeBack ? 1 : 0, transform: welcomeBack ? 'translate(-50%, 0)' : 'translate(-50%, -16px)' }}
                >
                    <div className="hand-drawn-panel px-5 py-3 flex items-center gap-3 shadow-lg">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 border-2 border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                            {authUser.avatar ? <img src={authUser.avatar} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-slate-700" />}
                        </div>
                        <div className="leading-tight pr-1">
                            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-emerald-600">欢迎回来</p>
                            <p className="text-base font-bold text-slate-800">{authUser.username}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Title Menu */}
            <div className={`absolute inset-0 z-50 flex pointer-events-none transition-opacity duration-1000 delay-1000 ${splashPhase === 'DONE' ? 'opacity-100' : 'opacity-0'} ${isTouch ? 'p-6' : 'p-16'}`}>

            {/* Top Right Version / Info */}
            <div className={`absolute flex flex-col items-end gap-1 ${isTouch ? 'top-6 right-6 touch-safe-top touch-safe-right' : 'top-16 right-16'}`}>
                <span className="text-sm font-bold hand-drawn-title text-slate-700">Wander Island</span>
                <span className="text-xs font-bold text-slate-600">流浪岛 . v2.2.0 Touch</span>
                {authUser && (
                  <div className="mt-3 pointer-events-auto">
                    {/* 统一玩家界面：与正式游戏内同一套 PlayerPanel */}
                    <PlayerPanel />
                  </div>
                )}
            </div>

            {/* Left-Aligned Main Layout */}
            <div className="flex flex-col justify-between h-full w-full max-w-3xl">

                {/* Titles */}
                <div className={`${isTouch ? 'mt-8' : 'mt-16'} animate-slide-up`} style={{ opacity: 0 }}>
                    <h1 className={`${isTouch ? 'text-[3rem] leading-[0.8]' : 'text-[5rem] leading-[0.8]'} font-bold hand-drawn-title tracking-[0.1em] ` + (titleTheme === 'white' ? "text-white/90" : "text-slate-900")}>
                        WANDER
                    </h1>
                    <h1 className={`${isTouch ? 'text-[2.25rem] leading-none' : 'text-[3.75rem] leading-none'} font-bold hand-drawn-title tracking-[0.2em] ` + (titleTheme === 'white' ? "text-white/70" : "text-slate-900/60")}>
                        ISLAND
                    </h1>
                    <div className="flex items-center gap-3 mt-8 opacity-80">
                        <img
                            src="/title/island-outline.svg"
                            alt=""
                            className={`${isTouch ? 'w-6 h-6' : 'w-8 h-8'} opacity-90 drop-shadow-lg shrink-0`}
                        />
                        <span className={`${isTouch ? 'text-lg' : 'text-xl'} font-bold tracking-[0.2em] hand-drawn-title ` + (titleTheme === 'white' ? "text-white/80" : "text-slate-400")}>流浪岛</span>
                    </div>
                </div>

                {/* Cinematic Chinese Menu */}
                <div className={`pointer-events-auto animate-slide-up ${isTouch ? 'mb-8' : 'mb-16'} flex flex-col items-start gap-4 pl-4 mt-8 w-full ${isTouch ? 'max-w-full' : 'max-w-md'}`}>
                    {!authUser && (
                        <div className="flex items-center gap-2 -mb-1 pl-1 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 border border-slate-800" />
                            <span className={`text-sm font-bold tracking-wide ${titleTheme === 'white' ? 'text-white/80' : 'text-slate-500'}`}>
                                首次来到漫游岛？登录领取你的居民证 ↓
                            </span>
                        </div>
                    )}
                    <button
                        onClick={() => { AudioSystem.playConfirm(); authUser ? setScreen('SAVE_SELECT') : setScreen('LOGIN'); }}
                        className={`hand-drawn-btn flex items-center justify-center gap-3 w-full ${isTouch ? 'py-4 text-lg' : 'py-3 text-lg'} ${!authUser ? 'hand-drawn-btn-active' : ''}`}
                    >
                        <Globe size={isTouch ? 24 : 20} />
                        {authUser ? '联机模式' : '登录 · 开启漫游'}
                        {authUser && <span className="text-sm font-normal text-emerald-600 ml-1">({authUser.username})</span>}
                    </button>
                    <button
                        onClick={() => { AudioSystem.playConfirm(); setScreen('SAVE_SELECT'); }}
                        className={`group flex justify-center items-center hand-drawn-btn hand-drawn-ghost ${isTouch ? 'w-full py-4' : 'w-56 px-5 py-3'} -rotate-2`}
                    >
                        <span className={`${isTouch ? 'text-xl' : 'text-xl'} font-bold group-hover:text-slate-900 transition-colors ` + (titleTheme === 'white' ? "text-white/90" : "text-slate-400")}>
                            开始旅程
                        </span>
                    </button>

                    <button
                        onClick={() => { AudioSystem.playClick(); setActiveModal('SETTINGS'); }}
                        className={`group flex justify-center items-center hand-drawn-btn hand-drawn-ghost ${isTouch ? 'w-full py-4' : 'w-56 px-5 py-3'} rotate-1`}
                    >
                        <span className={`${isTouch ? 'text-xl' : 'text-xl'} font-bold group-hover:text-slate-900 transition-colors ` + (titleTheme === 'white' ? "text-white/90" : "text-slate-400")}>
                            游戏设置
                        </span>
                    </button>

                    <button
                        onClick={() => { AudioSystem.playClick(); setActiveModal('CREDITS'); }}
                        className={`group flex justify-center items-center hand-drawn-btn hand-drawn-ghost ${isTouch ? 'w-full py-4' : 'w-56 px-5 py-3'} -rotate-1`}
                    >
                        <span className={`${isTouch ? 'text-xl' : 'text-xl'} font-bold group-hover:text-slate-900 transition-colors ` + (titleTheme === 'white' ? "text-white/90" : "text-slate-400")}>
                            制作组
                        </span>
                    </button>
                </div>
            </div>

            {/* Copyright, Logo & Watermark - Bottom Right */}
            <div className={`absolute bottom-6 right-8 flex items-end gap-4 pointer-events-auto transition-opacity duration-1000 delay-[1500ms] ${splashPhase === 'DONE' ? 'opacity-80' : 'opacity-0'}`}>
                <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-sm font-bold tracking-[0.2em] hand-drawn-title ${titleTheme === 'white' ? "text-white/60" : "text-slate-400/80"}`}>
                        BY HUYAN<br />and XYH
                    </span>
                    <span className={`text-[10px] font-bold tracking-[0.25em] ${titleTheme === 'white' ? "text-white/60" : "text-slate-500"}`}>
                        © {new Date().getFullYear()} 启元开物
                    </span>
                </div>
                <svg width="36" height="36" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" className={titleTheme === 'white' ? "text-white" : "text-slate-800"}>
                    <path d="M15 90 L45 80 L45 10 L15 20 Z" />
                    <path d="M45 10 L85 20 L85 90 L70 86.25 L70 36.25 L55 32.5 L55 82.5 L45 80 Z" />
                </svg>
            </div>

            {/* Modals Overlay */}
            {activeModal !== 'NONE' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-md pointer-events-auto animate-in fade-in duration-500">

                    {/* SETTINGS MODAL */}
                    {activeModal === 'SETTINGS' && (
                        <div className={`hand-drawn-panel relative animate-slide-up shadow-[16px_16px_0_rgba(0,0,0,0.4)] bg-[#fdfcf8] ${isTouch ? 'touch-modal-full touch-safe-bottom p-6' : 'w-[920px] h-[75vh]'}`} onClick={(e) => e.stopPropagation()}>
                            <div className="absolute inset-0 bg-grid-paper opacity-40 mix-blend-multiply pointer-events-none" style={{ borderRadius: 'inherit' }} />
                            
                            <button onClick={() => { AudioSystem.playClose(); setActiveModal('NONE'); }} className="hand-drawn-close-btn" title="合上设置">
                                <X size={26} strokeWidth={3} />
                            </button>

                            <div className="relative z-10 w-full h-full flex flex-col overflow-hidden" style={{ borderRadius: 'inherit' }}>
                                <div className="flex justify-between items-start gap-6 border-b-[3px] border-slate-800 px-8 py-6 bg-[#fbf7ec] shrink-0 relative">
                                    <div className="absolute -bottom-2 right-12 w-24 h-6 bg-amber-500/20 rotate-[-2deg] mix-blend-multiply pointer-events-none" />
                                    <div>
                                        <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.35em] uppercase text-emerald-700 mb-2">
                                            <Sparkles size={14} className="animate-pulse" />
                                            System Atelier
                                        </div>
                                        <h2 className="text-4xl hand-drawn-title text-slate-900">游戏设置</h2>
                                        <p className="text-sm font-bold text-slate-500 mt-2">标题页、声音、画面和本地数据都在这里整理。</p>
                                    </div>
                                </div>

                                <div className={`flex-1 grid gap-6 overflow-y-auto custom-scrollbar p-8 ${isTouch ? 'grid-cols-1' : 'grid-cols-[1.25fr_0.75fr]'}`}>
                                <div className="flex flex-col gap-6">
                                    <section className="hand-drawn-panel relative bg-[#fdfcf8] p-6 shadow-[4px_4px_0_#2d3436] border-[2px] border-slate-800" style={{ transform: 'rotate(-0.5deg)' }}>
                                        <div className="absolute -top-3 left-6 w-10 h-4 bg-sky-400/30 rotate-[3deg] pointer-events-none" />
                                        <div className="flex items-center gap-2 mb-5 opacity-80">
                                            <Volume2 size={18} className="text-slate-800" />
                                            <h3 className="text-lg font-black tracking-widest text-slate-900">声音</h3>
                                        </div>
                                        <div className="flex flex-col gap-5">
                                            <SettingSlider icon={<Volume2 size={16} />} label="主音量" value={masterVol} color="#fdcb6e" onChange={handleMasterVol} />
                                            <SettingSlider icon={<Music2 size={16} />} label="音乐音量" value={bgmVol} color="#74b9ff" onChange={handleBgmVol} />
                                        </div>
                                    </section>

                                    <section className="hand-drawn-panel relative bg-[#fdfcf8] p-6 shadow-[4px_4px_0_#2d3436] border-[2px] border-slate-800" style={{ transform: 'rotate(0.5deg)' }}>
                                        <div className="absolute -top-2 right-10 w-8 h-3 bg-amber-400/30 rotate-[-4deg] pointer-events-none" />
                                        <div className="flex items-center gap-2 mb-5 opacity-80">
                                            <Monitor size={18} className="text-slate-800" />
                                            <h3 className="text-lg font-black tracking-widest text-slate-900">画面</h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
                                            {([
                                                ['performance', '性能优先', '减少压力，适合发热或卡顿时'],
                                                ['balanced', '平衡', '推荐，保留大部分氛围效果'],
                                                ['cinematic', '电影感', '更浓的标题氛围与视觉层次'],
                                            ] as const).map(([id, label, desc]) => (
                                                <button
                                                    key={id}
                                                    onClick={() => { AudioSystem.playTap(); setQuality(id); }}
                                                    className={`relative border-[2px] p-4 text-left transition-transform hover:-translate-y-1 ${qualityPreset === id ? 'border-slate-800 bg-[#fff0bd] shadow-[3px_3px_0_#2d3436]' : 'border-slate-300 bg-white hover:border-slate-800'}`} style={{ borderRadius: '8px 2px 8px 2px' }}
                                                >
                                                    {qualityPreset === id && <Check size={16} className="absolute right-3 top-3 text-emerald-700 stroke-[3]" />}
                                                    <p className="text-sm font-black text-slate-900 tracking-wide">{label}</p>
                                                    <p className="mt-2 text-[11px] leading-relaxed font-bold text-slate-500">{desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="hand-drawn-panel relative bg-[#fdfcf8] p-6 shadow-[4px_4px_0_#2d3436] border-[2px] border-slate-800" style={{ transform: 'rotate(-0.3deg)' }}>
                                        <div className="absolute top-10 left-1 w-2 h-10 bg-emerald-400/20 rotate-[12deg] pointer-events-none" />
                                        <div className="flex items-center gap-2 mb-5 opacity-80">
                                            <Palette size={18} className="text-slate-800" />
                                            <h3 className="text-lg font-black tracking-widest text-slate-900">标题页偏好</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                                            <button onClick={() => { AudioSystem.playTap(); setTitleTheme('white'); }} className={`border-[2px] p-4 text-left font-bold transition-transform hover:-translate-y-1 ${titleTheme === 'white' ? 'border-slate-800 bg-white shadow-[3px_3px_0_#2d3436]' : 'border-slate-300 bg-[#fdfcf8] hover:border-slate-800'}`} style={{ borderRadius: '3px 8px 3px 8px' }}>
                                                <span className="block text-sm font-black text-slate-900 tracking-wide">纸白标题</span>
                                                <span className="mt-1 block text-[11px] text-slate-500">更轻、更干净</span>
                                            </button>
                                            <button onClick={() => { AudioSystem.playTap(); setTitleTheme('blue'); }} className={`border-[2px] p-4 text-left font-bold transition-transform hover:-translate-y-1 ${titleTheme === 'blue' ? 'border-slate-800 bg-slate-800 text-white shadow-[3px_3px_0_#2d3436]' : 'border-slate-300 bg-[#fdfcf8] hover:border-slate-800 text-slate-900'}`} style={{ borderRadius: '8px 3px 8px 3px' }}>
                                                <span className="block text-sm font-black tracking-wide">深蓝标题</span>
                                                <span className={`mt-1 block text-[11px] ${titleTheme === 'blue' ? 'text-slate-300' : 'text-slate-500'}`}>更沉静、更电影</span>
                                            </button>
                                            <SettingToggle icon={<Waves size={16} />} label="保留标题动态氛围" desc="控制标题页雾感、漂浮感等视觉细节偏好" checked={ambientDetail} onClick={toggleAmbientDetail} />
                                            <SettingToggle icon={<Gauge size={16} />} label="降低动态效果" desc="适合晕动、低电量或录屏时使用" checked={reducedMotion} onClick={toggleReducedMotion} />
                                            <SettingToggle icon={<Compass size={16} />} label="跳过开场署名" desc="之后打开标题页会直接进入主菜单" checked={skipIntro} onClick={toggleSkipIntro} />
                                        </div>
                                    </section>
                                </div>

                                <aside className="flex flex-col gap-6">
                                    <section className="hand-drawn-panel relative bg-[#eef7f1] p-6 shadow-[4px_4px_0_#2d3436] border-[2px] border-slate-800" style={{ transform: 'rotate(1deg)' }}>
                                        {/* Pushpin */}
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2px] border-slate-800 shadow-[1px_1px_0_rgba(0,0,0,0.5)] z-10" />
                                        <div className="flex items-center gap-2 mb-4 opacity-80 mt-2">
                                            <User size={18} className="text-slate-800" />
                                            <h3 className="text-lg font-black tracking-widest text-slate-900">当前状态</h3>
                                        </div>
                                        <div className="flex flex-col gap-3 text-[13px] font-bold text-slate-700">
                                            <div className="flex justify-between gap-3 border-b-2 border-dashed border-slate-800/20 pb-2"><span>账号</span><span className="text-slate-900">{authUser?.username || '未登录'}</span></div>
                                            <div className="flex justify-between gap-3 border-b-2 border-dashed border-slate-800/20 pb-2"><span>岛屿</span><span className="text-slate-900 truncate max-w-[160px]">{islandName}</span></div>
                                            <div className="flex justify-between gap-3 border-b-2 border-dashed border-slate-800/20 pb-2"><span>等级</span><span className="font-mono text-slate-900">Lv.{playerLevel}</span></div>
                                            <div className="flex justify-between gap-3 border-b-2 border-dashed border-slate-800/20 pb-2"><span>经验</span><span className="font-mono text-slate-900">{playerXP}</span></div>
                                            <div className="flex justify-between gap-3"><span>游玩</span><span className="font-mono text-slate-900">{Math.floor(stats.playtime / 60)}m</span></div>
                                        </div>
                                    </section>

                                    <section className="hand-drawn-panel relative bg-[#fffaf0] p-6 shadow-[4px_4px_0_#2d3436] border-[2px] border-slate-800" style={{ transform: 'rotate(-1deg)' }}>
                                        <div className="flex items-center gap-2 mb-4 opacity-80">
                                            <Shield size={18} className="text-slate-800" />
                                            <h3 className="text-lg font-black tracking-widest text-slate-900">数据与隐私</h3>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => { AudioSystem.playClick(); setActiveModal('PRIVACY'); }}
                                                className="hand-drawn-btn bg-white px-5 py-3 text-sm text-slate-700 font-bold flex items-center justify-center gap-2 border-[2px] border-slate-800"
                                            >
                                                <BookOpen size={16} />
                                                查看隐私政策
                                            </button>
                                            <button
                                                onClick={resetTitlePreferences}
                                                className="hand-drawn-btn bg-white px-5 py-3 text-sm text-slate-700 font-bold flex items-center justify-center gap-2 border-[2px] border-slate-800"
                                            >
                                                <RotateCcw size={16} />
                                                重置标题页设置
                                            </button>
                                            <button
                                                disabled={isClearingData}
                                                onClick={async () => {
                                                    AudioSystem.playClick();
                                                    if (!confirm('确定清除所有数据？将清空本地存档与进度，页面将自动刷新回到初始状态。')) return;
                                                    await clearAllData();
                                                }}
                                                className="hand-drawn-btn px-5 py-3 text-sm text-red-700 font-bold bg-red-50 border-[2px] border-red-800 shadow-[3px_3px_0_#991b1b] hover:-translate-y-0.5 transition-transform disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={16} />
                                                {isClearingData ? '正在清除...' : '清除本地数据'}
                                            </button>
                                        </div>
                                    </section>

                                    <section className="hand-drawn-panel relative bg-slate-900 p-6 text-white shadow-[4px_4px_0_#2d3436] border-[2px] border-slate-800" style={{ transform: 'rotate(0.5deg)' }}>
                                        <p className="text-[10px] font-black tracking-[0.3em] uppercase text-emerald-300 mb-2">Current Profile</p>
                                        <p className="text-2xl hand-drawn-title truncate">{authUser?.username || 'wander'}</p>
                                        <p className="mt-3 text-[11px] font-bold leading-relaxed text-slate-400">这些设置会保存在本机浏览器里，不影响服务器账号数据。</p>
                                    </section>
                                </aside>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CREDITS MODAL */}
                    {activeModal === 'CREDITS' && (
                        <div className={`hand-drawn-panel relative p-12 flex flex-col items-center gap-10 animate-slide-up text-center shadow-[16px_16px_0_rgba(0,0,0,0.4)] bg-[#fdfcf8] ${isTouch ? 'touch-modal-full touch-safe-bottom overflow-y-auto' : 'w-[500px] h-[85vh] my-8'}`} onClick={(e) => e.stopPropagation()}>
                            <div className="absolute inset-0 bg-grid-paper opacity-40 mix-blend-multiply pointer-events-none" style={{ borderRadius: 'inherit' }} />
                            
                            <button onClick={() => { AudioSystem.playClose(); setActiveModal('NONE'); }} className="hand-drawn-close-btn" title="合上制作人员名单">
                                <X size={26} strokeWidth={3} />
                            </button>
                            
                            <div className="relative z-10 w-full h-full overflow-y-auto custom-scrollbar flex flex-col items-center">
                                <h2 className="text-5xl hand-drawn-title mb-4 -rotate-2 mt-8">WANDER ISLAND</h2>

                            <div className="flex flex-col gap-8 w-full">
                                <div className="flex flex-col gap-4 bg-[linear-gradient(135deg,#fff1b8_0%,#ffe08a_55%,#ffd66b_100%)] border-2 border-slate-800 p-5 -rotate-1 shadow-[6px_6px_0_#2d3436] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/25 blur-2xl pointer-events-none" />
                                    <div className="flex flex-col gap-1 relative">
                                        <span className="text-[11px] font-black tracking-[0.28em] uppercase text-slate-500">Independent Creator</span>
                                        <span className="text-sm font-bold text-slate-700">独立开发 / 游戏策划</span>
                                    </div>
                                    <div className="relative flex items-end justify-between gap-4 border-t-2 border-slate-800/20 pt-3">
                                        <div className="flex flex-col">
                                            <span className="text-3xl font-black tracking-wide text-slate-900 leading-none">huyan</span>
                                            <span className="text-xs font-bold tracking-[0.22em] text-slate-600 mt-1">SOLO DEV</span>
                                        </div>
                                        <div className="w-11 h-11 rounded-full border-2 border-slate-800/60 bg-white/50 overflow-hidden shrink-0 shadow-sm">
                                            <img
                                                src="/title/huyan-avatar.png"
                                                alt="huyan avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative flex flex-col gap-2 pt-1">
                                        <span className="text-[10px] font-black tracking-[0.24em] uppercase text-slate-500">Links</span>
                                    <a
                                        href="https://github.com/huyan1349"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-bold text-slate-800 hover:text-emerald-700 transition-colors break-all underline decoration-slate-500/40 underline-offset-4"
                                    >
                                        GitHub: github.com/huyan1349
                                    </a>
                                    <a
                                        href="mailto:huyanxius@gmail.com"
                                        className="text-sm font-bold text-slate-800 hover:text-emerald-700 transition-colors break-all underline decoration-slate-500/40 underline-offset-4"
                                    >
                                        Contact: huyanxius@gmail.com
                                    </a>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 bg-[#74b9ff] border-2 border-slate-800 p-4 rotate-1 shadow-[4px_4px_0_#2d3436]">
                                    <span className="text-sm font-bold text-slate-800">特别鸣谢</span>
                                    <span className="text-2xl font-bold text-slate-900">xyh</span>
                                    <div className="flex flex-col gap-1 mt-1 border-t-2 border-slate-800/20 pt-3">
                                        <span className="text-sm font-bold text-slate-900">Google AI Studio</span>
                                        <span className="text-sm font-bold text-slate-900">Antigravity</span>
                                        <span className="text-sm font-bold text-slate-900">Claude Code</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 bg-emerald-100 border-2 border-slate-800 p-4 -rotate-1 shadow-[4px_4px_0_#2d3436]">
                                    <span className="text-sm font-bold text-slate-600">启元开物</span>
                                    <a href="https://qiyuankaiwu.com" target="_blank" rel="noreferrer" className="text-lg font-bold text-slate-800 hover:text-emerald-600 transition-colors">qiyuankaiwu.com</a>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 w-full">
                                <span className="text-lg font-bold text-slate-800 underline decoration-wavy decoration-emerald-400">在孤岛中寻找生态的呼吸</span>
                            </div>
                            </div>
                        </div>
                    )}
                    {/* PRIVACY POLICY MODAL */}
                    {activeModal === 'PRIVACY' && (
                        <PrivacyPolicyModal onClose={() => { setActiveModal('NONE'); }} />
                    )}


                </div>
            )}


        </div>
        </>
    );
};

function SettingSlider({
    icon,
    label,
    value,
    color,
    onChange,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-black text-slate-800">{icon}{label}</span>
                <span className="font-mono text-xs font-black text-slate-500">{Math.round(value * 100)}%</span>
            </div>
            <div className="relative w-full h-5 flex items-center">
                <div className="absolute h-3 border-2 border-slate-800 bg-white rounded-full w-full pointer-events-none overflow-hidden">
                    <div className="h-full border-r-2 border-slate-800" style={{ width: `${value * 100}%`, background: color }} />
                </div>
                <input type="range" min="0" max="1" step="0.05" value={value} onChange={onChange} className="w-full opacity-0 cursor-pointer absolute inset-0 h-full" />
            </div>
        </div>
    );
}

function SettingToggle({
    icon,
    label,
    desc,
    checked,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    desc: string;
    checked: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`col-span-1 rounded-xl border-2 p-4 text-left transition-all ${checked ? 'border-slate-900 bg-[#dff7ef] shadow-[3px_3px_0_#2d3436]' : 'border-slate-300 bg-white/60 hover:border-slate-600'}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-black text-slate-900">{icon}{label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed font-bold text-slate-500">{desc}</p>
                </div>
                <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-slate-800 p-0.5 transition-colors ${checked ? 'bg-emerald-400' : 'bg-slate-200'}`}>
                    <span className={`h-3 w-3 rounded-full bg-slate-900 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
            </div>
        </button>
    );
}
