import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { X, Globe, Wifi, User, Camera, Edit2, Mail, BookOpen, Compass, LogOut } from 'lucide-react';
import { AudioSystem } from '../lib/audio';
import { api } from '../lib/api';
import { disconnectSocket } from '../lib/socket';
import { PlayerPanel } from './PlayerPanel';

type ModalType = 'NONE' | 'SETTINGS' | 'CREDITS' | 'PROFILE' | 'MAILBOX' | 'VISITORS' | 'PLAZA';

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

    const [activeModal, setActiveModal] = useState<ModalType>('NONE');
    const [splashPhase, setSplashPhase] = useState<'AUTHOR' | 'TITLE' | 'DONE'>('AUTHOR');
    const [splashVisible, setSplashVisible] = useState(false);
    const [splashOverlayVisible, setSplashOverlayVisible] = useState(true);

    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [isEditingMotto, setIsEditingMotto] = useState(false);
    const [tempMotto, setTempMotto] = useState('');
    const [unreadMailCount, setUnreadMailCount] = useState(0);

    const [masterVol, setMasterVol] = useState(0.6);
    const [bgmVol, setBgmVol] = useState(0.5);

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
        if (splashPhase === 'DONE') return;
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

    const handleMasterVol = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        setMasterVol(v);
        AudioSystem.setMasterVolume(v);
    };

    const handleBgmVol = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        setBgmVol(v);
        AudioSystem.setBGMVolume(v);
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
                        <div className={`hand-drawn-panel p-12 flex flex-col gap-10 animate-slide-up ring-1 ring-slate-800/10 ${isTouch ? 'touch-modal-full touch-safe-bottom overflow-y-auto' : 'w-[600px]'}`}>
                            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-6">
                                <h2 className="text-3xl hand-drawn-title">游戏设置</h2>
                                <button onClick={() => { AudioSystem.playClose(); setActiveModal('NONE'); }} className={`hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200 ${isTouch ? 'w-12 h-12' : ''}`}>
                                    <X size={24} strokeWidth={3} className="text-slate-800" />
                                </button>
                            </div>

                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col gap-4">
                                    <span className="text-lg font-bold text-slate-800">主音量</span>
                                    <div className="relative w-full h-4 flex items-center">
                                        <div className="absolute h-3 border-2 border-slate-800 bg-white rounded-full w-full pointer-events-none overflow-hidden">
                                            <div className="h-full bg-[#fdcb6e] border-r-2 border-slate-800" style={{ width: `${masterVol * 100}%` }} />
                                        </div>
                                        <input type="range" min="0" max="1" step="0.05" value={masterVol} onChange={handleMasterVol} className="w-full opacity-0 cursor-pointer absolute inset-0 h-full" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <span className="text-lg font-bold text-slate-800">音乐音量 (BGM)</span>
                                    <div className="relative w-full h-4 flex items-center">
                                        <div className="absolute h-3 border-2 border-slate-800 bg-white rounded-full w-full pointer-events-none overflow-hidden">
                                            <div className="h-full bg-[#74b9ff] border-r-2 border-slate-800" style={{ width: `${bgmVol * 100}%` }} />
                                        </div>
                                        <input type="range" min="0" max="1" step="0.05" value={bgmVol} onChange={handleBgmVol} className="w-full opacity-0 cursor-pointer absolute inset-0 h-full" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <span className="text-lg font-bold text-slate-800">画质预设</span>
                                    <div className="flex gap-4">
                                        <button className="hand-drawn-btn px-6 py-2 text-sm text-slate-800 font-bold">性能优先</button>
                                        <button className="hand-drawn-btn-active px-6 py-2 text-sm text-slate-800 font-bold">平衡</button>
                                        <button className="hand-drawn-btn px-6 py-2 text-sm text-slate-800 font-bold">极致画质</button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <span className="text-lg font-bold text-slate-800">主页配色</span>
                                    <div className="flex gap-4">
                                        <button onClick={() => { AudioSystem.playTap(); setTitleTheme('white'); }} className={`hand-drawn-btn px-6 py-2 text-sm text-slate-800 font-bold ${titleTheme === 'white' ? 'hand-drawn-btn-active' : ''}`}>纸白 (White)</button>
                                        <button onClick={() => { AudioSystem.playTap(); setTitleTheme('blue'); }} className={`hand-drawn-btn px-6 py-2 text-sm text-slate-800 font-bold ${titleTheme === 'blue' ? 'hand-drawn-btn-active' : ''}`}>深蓝 (Blue)</button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <span className="text-lg font-bold text-slate-800">数据管理</span>
                                    <button
                                        onClick={() => {
                                            AudioSystem.playClick();
                                            if (confirm('确定清除所有浏览器数据？这将重置加载界面状态，刷新后需要重新加载资源。')) {
                                                localStorage.clear();
                                                location.reload();
                                            }
                                        }}
                                        className="hand-drawn-btn px-6 py-2 text-sm text-red-700 font-bold border-red-300 hover:bg-red-50"
                                    >
                                        清除所有浏览器数据
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CREDITS MODAL */}
                    {activeModal === 'CREDITS' && (
                        <div className={`hand-drawn-panel p-12 flex flex-col items-center gap-10 animate-slide-up text-center ring-1 ring-slate-800/10 ${isTouch ? 'touch-modal-full touch-safe-bottom overflow-y-auto' : 'w-[500px]'}`}>
                            <div className="w-full flex justify-end">
                                <button onClick={() => { AudioSystem.playClose(); setActiveModal('NONE'); }} className={`hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200 ${isTouch ? 'w-12 h-12' : ''}`}>
                                    <X size={24} strokeWidth={3} className="text-slate-800" />
                                </button>
                            </div>

                            <h2 className="text-5xl hand-drawn-title mb-4 -rotate-2">WANDER ISLAND</h2>

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
                    )}


                </div>
            )}
        </div>
        </>
    );
};
