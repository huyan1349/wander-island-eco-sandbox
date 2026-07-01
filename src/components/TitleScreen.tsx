import React, { Suspense, useState, useEffect, useRef } from 'react';
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
import { lazyNamed } from '../lib/lazyNamed';
import type { SettingsTab } from './SettingsModal';

const PlayerPanel = lazyNamed(() => import('./PlayerPanel'), 'PlayerPanel');
const SettingsModal = lazyNamed(() => import('./SettingsModal'), 'SettingsModal');
const PrivacyPolicyModal = lazyNamed(() => import('./PrivacyPolicyModal'), 'PrivacyPolicyModal');
const CreditsModal = lazyNamed(() => import('./CreditsModal'), 'CreditsModal');

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
    // 若已播放过电影感开场仪式，则跳过标题页 splash，避免重复情绪铺陈
    const openingSeen = readStoredBool('wander-opening-seen', false);
    const [activeModal, setActiveModal] = useState<ModalType>('NONE');
    const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('audio');
    const [splashPhase, setSplashPhase] = useState<'AUTHOR' | 'TITLE' | 'DONE'>(hasSeenSplash || initialSkipIntro || openingSeen ? 'DONE' : 'AUTHOR');
    const [splashVisible, setSplashVisible] = useState(false);
    const [splashOverlayVisible, setSplashOverlayVisible] = useState(!(hasSeenSplash || initialSkipIntro || openingSeen));

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
            <div className={`absolute flex flex-col items-end gap-1 ${isTouch ? 'top-8 right-12 touch-safe-top touch-safe-right' : 'top-16 right-24'}`}>
                <span className="text-sm font-bold hand-drawn-title text-slate-700">Wander Island</span>
                <span className="text-xs font-bold text-slate-600">流浪岛 . v2.3.0 Touch</span>
                {authUser && (
                  <div className="mt-3 pointer-events-auto">
                    {/* 统一玩家界面：与正式游戏内同一套 PlayerPanel */}
                    <Suspense fallback={null}>
                        <PlayerPanel />
                    </Suspense>
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
                        onClick={() => { AudioSystem.playClick(); setSettingsInitialTab('audio'); setActiveModal('SETTINGS'); }}
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
                    <Suspense fallback={null}>

                    {/* SETTINGS MODAL */}
                    {activeModal === 'SETTINGS' && (
                        <SettingsModal
                            onClose={() => setActiveModal('NONE')}
                            masterVol={masterVol}
                            bgmVol={bgmVol}
                            handleMasterVol={handleMasterVol}
                            handleBgmVol={handleBgmVol}
                            qualityPreset={qualityPreset}
                            setQuality={setQuality}
                            titleTheme={titleTheme}
                            setTitleTheme={setTitleTheme}
                            ambientDetail={ambientDetail}
                            toggleAmbientDetail={toggleAmbientDetail}
                            reducedMotion={reducedMotion}
                            toggleReducedMotion={toggleReducedMotion}
                            skipIntro={skipIntro}
                            toggleSkipIntro={toggleSkipIntro}
                            authUser={authUser}
                            islandName={islandName}
                            playerLevel={playerLevel}
                            playerXP={playerXP}
                            stats={stats}
                            resetTitlePreferences={resetTitlePreferences}
                            isClearingData={isClearingData}
                            clearAllData={clearAllData}
                            setActiveModal={(modal) => setActiveModal(modal as ModalType)}
                            initialTab={settingsInitialTab}
                        />
                    )}

                    {/* CREDITS MODAL */}
                    {activeModal === 'CREDITS' && (
                        <CreditsModal
                            onClose={() => setActiveModal('NONE')}
                            isTouch={isTouch}
                            onOpenDevelopment={() => {
                                setSettingsInitialTab('development');
                                setActiveModal('SETTINGS');
                            }}
                        />
                    )}
                    {/* PRIVACY POLICY MODAL */}
                    {activeModal === 'PRIVACY' && (
                        <PrivacyPolicyModal onClose={() => { setActiveModal('NONE'); }} />
                    )}

                    </Suspense>

                </div>
            )}


        </div>
        </>
    );
};
