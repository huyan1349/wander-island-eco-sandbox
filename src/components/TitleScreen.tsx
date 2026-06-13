import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { X, Globe, Wifi, User, Camera, Edit2, Mail, BookOpen, Compass, LogOut } from 'lucide-react';
import { AudioSystem } from '../lib/audio';
import { api } from '../lib/api';
import { disconnectSocket } from '../lib/socket';
import { MailboxModal } from './MailboxModal';
import { VisitorBookModal } from './VisitorBookModal';
import { SocialPlaza } from './SocialPlaza';

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
                                <span className="text-slate-300 text-sm tracking-[0.4em] uppercase font-bold">A Game By</span>
                                <h2 className="text-white text-4xl font-bold tracking-[0.3em] hand-drawn-title drop-shadow-lg">HUYAN</h2>
                            </>
                        )}
                        {splashPhase === 'TITLE' && (
                            <>
                                <h1 className="text-white text-[6rem] font-bold tracking-[0.2em] hand-drawn-title drop-shadow-2xl">WANDER ISLAND</h1>
                                <span className="text-slate-300 text-2xl tracking-[0.5em] hand-drawn-title">流 浪 岛</span>
                            </>
                        )}
                    </div>
                    {/* Splash Overlay Logo */}
                    {splashPhase === 'TITLE' && (
                        <div 
                            className="absolute bottom-12 left-0 w-full flex flex-col items-center justify-center gap-4 transition-all duration-[2000ms] ease-out pointer-events-none"
                            style={{ 
                                opacity: splashVisible ? 0.8 : 0,
                                filter: splashVisible ? 'blur(0px)' : 'blur(12px)',
                                transform: splashVisible ? 'scale(1)' : 'scale(1.05)'
                            }}
                        >
                            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="5" strokeLinejoin="round" className="drop-shadow-lg">
                                <path d="M15 90 L45 80 L45 10 L15 20 Z" />
                                <path d="M45 10 L85 20 L85 90 L70 86.25 L70 36.25 L55 32.5 L55 82.5 L45 80 Z" />
                            </svg>
                            <span className="text-white/80 text-xs font-bold tracking-[0.3em] drop-shadow-md">
                                启元开物
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Title Menu */}
            <div className={`absolute inset-0 z-50 flex pointer-events-none transition-opacity duration-1000 delay-1000 ${splashPhase === 'DONE' ? 'opacity-100' : 'opacity-0'} ${isTouch ? 'p-6' : 'p-16'}`}>

            {/* Top Right Version / Info */}
            <div className={`absolute flex flex-col items-end gap-1 ${isTouch ? 'top-6 right-6 touch-safe-top touch-safe-right' : 'top-16 right-16'}`}>
                <span className="text-sm font-bold hand-drawn-title text-slate-700">Wander Island</span>
                <span className="text-xs font-bold text-slate-600">流浪岛 . v2.2.0 Touch</span>
                {authUser && (
                  <div
                    onClick={() => setActiveModal('PROFILE')}
                    className="group flex items-center gap-4 hand-drawn-btn hand-drawn-ghost p-3 pr-6 mt-3 pointer-events-auto cursor-pointer"
                  >
                    <div className="relative group">
                      <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center border-2 border-slate-800 shadow-inner overflow-hidden">
                        {authUser.avatar ? (
                          <img src={authUser.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-slate-700" />
                        )}
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse" title="在线" />
                    </div>
                    <div className="flex flex-col gap-1 min-w-[80px]">
                      <span className="text-sm font-bold text-white group-hover:text-slate-900 transition-colors tracking-wide">
                        {authUser.username}
                      </span>
                    </div>
                  </div>
                )}
            </div>

            {/* Left-Aligned Main Layout */}
            <div className="flex flex-col justify-between h-full w-full max-w-3xl">

                {/* Titles */}
                <div className={`${isTouch ? 'mt-10' : 'mt-20'} animate-slide-up`} style={{ opacity: 0 }}>
                    <h1 className={`${isTouch ? 'text-[4rem] leading-[0.8]' : 'text-[8rem] leading-[0.8]'} font-bold hand-drawn-title tracking-[0.1em] ` + (titleTheme === 'white' ? "text-white/90" : "text-slate-900")}>
                        WANDER
                    </h1>
                    <h1 className={`${isTouch ? 'text-[3rem] leading-none' : 'text-[6rem] leading-none'} font-bold hand-drawn-title tracking-[0.2em] ` + (titleTheme === 'white' ? "text-white/70" : "text-slate-900/60")}>
                        ISLAND
                    </h1>
                    <div className="flex items-center gap-6 mt-12 opacity-80 pl-2">
                        <div className="h-px w-12" />
                        <span className={`${isTouch ? 'text-xl' : 'text-2xl'} font-bold tracking-[0.2em] hand-drawn-title ` + (titleTheme === 'white' ? "text-white/80" : "text-slate-400")}>流浪岛</span>
                    </div>
                </div>

                {/* Cinematic Chinese Menu */}
                <div className={`pointer-events-auto animate-slide-up ${isTouch ? 'mb-8' : 'mb-20'} flex flex-col items-start gap-6 pl-4 mt-12 w-full ${isTouch ? 'max-w-full' : 'max-w-md'}`}>
                    <button
                        onClick={() => authUser ? setScreen('SAVE_SELECT') : setScreen('LOGIN')}
                        className={`hand-drawn-btn flex items-center justify-center gap-3 w-full ${isTouch ? 'py-5 text-xl' : 'py-4 text-xl'}`}
                    >
                        <Globe size={isTouch ? 28 : 24} />
                        联机模式
                        {authUser && <span className="text-sm font-normal text-emerald-600 ml-1">({authUser.username})</span>}
                    </button>
                    <button
                        onClick={() => setScreen('SAVE_SELECT')}
                        className={`group flex justify-center items-center hand-drawn-btn hand-drawn-ghost ${isTouch ? 'w-full py-5' : 'w-64 px-6 py-4'} -rotate-2`}
                    >
                        <span className={`${isTouch ? 'text-2xl' : 'text-2xl'} font-bold group-hover:text-slate-900 transition-colors ` + (titleTheme === 'white' ? "text-white/90" : "text-slate-400")}>
                            开始旅程
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveModal('SETTINGS')}
                        className={`group flex justify-center items-center hand-drawn-btn hand-drawn-ghost ${isTouch ? 'w-full py-5' : 'w-64 px-6 py-4'} rotate-1`}
                    >
                        <span className={`${isTouch ? 'text-2xl' : 'text-2xl'} font-bold group-hover:text-slate-900 transition-colors ` + (titleTheme === 'white' ? "text-white/90" : "text-slate-400")}>
                            游戏设置
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveModal('CREDITS')}
                        className={`group flex justify-center items-center hand-drawn-btn hand-drawn-ghost ${isTouch ? 'w-full py-5' : 'w-64 px-6 py-4'} -rotate-1`}
                    >
                        <span className={`${isTouch ? 'text-2xl' : 'text-2xl'} font-bold group-hover:text-slate-900 transition-colors ` + (titleTheme === 'white' ? "text-white/90" : "text-slate-400")}>
                            制作组
                        </span>
                    </button>
                </div>
            </div>

            {/* Copyright, Logo & Watermark - Bottom Right */}
            <div className={`absolute bottom-6 right-8 flex items-end gap-4 pointer-events-auto transition-opacity duration-1000 delay-[1500ms] ${splashPhase === 'DONE' ? 'opacity-80' : 'opacity-0'}`}>
                <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-sm font-bold tracking-[0.2em] hand-drawn-title ${titleTheme === 'white' ? "text-white/60" : "text-slate-400/80"}`}>
                        By HUYAN
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
                                <button onClick={() => setActiveModal('NONE')} className={`hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200 ${isTouch ? 'w-12 h-12' : ''}`}>
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
                                        <button onClick={() => setTitleTheme('white')} className={`hand-drawn-btn px-6 py-2 text-sm text-slate-800 font-bold ${titleTheme === 'white' ? 'hand-drawn-btn-active' : ''}`}>纸白 (White)</button>
                                        <button onClick={() => setTitleTheme('blue')} className={`hand-drawn-btn px-6 py-2 text-sm text-slate-800 font-bold ${titleTheme === 'blue' ? 'hand-drawn-btn-active' : ''}`}>深蓝 (Blue)</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CREDITS MODAL */}
                    {activeModal === 'CREDITS' && (
                        <div className={`hand-drawn-panel p-12 flex flex-col items-center gap-10 animate-slide-up text-center ring-1 ring-slate-800/10 ${isTouch ? 'touch-modal-full touch-safe-bottom overflow-y-auto' : 'w-[500px]'}`}>
                            <div className="w-full flex justify-end">
                                <button onClick={() => setActiveModal('NONE')} className={`hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200 ${isTouch ? 'w-12 h-12' : ''}`}>
                                    <X size={24} strokeWidth={3} className="text-slate-800" />
                                </button>
                            </div>

                            <h2 className="text-5xl hand-drawn-title mb-4 -rotate-2">WANDER ISLAND</h2>

                            <div className="flex flex-col gap-8 w-full">
                                <div className="flex flex-col gap-2 bg-[#ffeaa7] border-2 border-slate-800 p-4 -rotate-1 shadow-[4px_4px_0_#2d3436]">
                                    <span className="text-sm font-bold text-slate-600">核心开发 & 策划</span>
                                    <span className="text-2xl font-bold text-slate-800">huyan</span>
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

                    {/* PROFILE MODAL - Islander Card */}
                    {activeModal === 'PROFILE' && authUser && (
                        <div className={`hand-drawn-panel max-h-[90vh] p-0 flex flex-col animate-slide-up ring-1 overflow-hidden ${isTouch ? 'touch-modal-full touch-safe-bottom' : 'w-[750px]'}`}>
                            {/* Header */}
                            <div className="flex justify-between items-center border-b-2 border-slate-800 p-8 pb-6">
                                <h2 className="text-3xl hand-drawn-title -rotate-1">岛民卡</h2>
                                <button onClick={() => setActiveModal('NONE')} className={`hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200 ${isTouch ? 'w-12 h-12' : ''}`}>
                                    <X size={24} strokeWidth={3} className="text-slate-800" />
                                </button>
                            </div>

                            <div className="p-8 pt-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                                {/* Avatar + Name + Motto */}
                                <div className="flex items-start gap-6">
                                    {/* Avatar with upload */}
                                    <div className="relative group shrink-0">
                                        <div className="w-28 h-28 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center border-3 border-slate-800 shadow-inner overflow-hidden">
                                            {authUser.avatar ? (
                                                <img src={authUser.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={40} className="text-slate-700" />
                                            )}
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse" />
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <Camera size={28} className="text-white" />
                                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                                        </label>
                                    </div>

                                    <div className="flex-1 flex flex-col gap-3">
                                        {/* Name (editable) */}
                                        {isEditingName ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={tempName}
                                                    onChange={(e) => setTempName(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                                                    className="hand-drawn-panel px-4 py-2 text-lg font-bold text-slate-800 tracking-wide"
                                                    style={{ borderWidth: '2px' }}
                                                    autoFocus
                                                />
                                                <button onClick={handleSaveName} className="hand-drawn-btn p-2 text-emerald-600">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => setIsEditingName(false)} className="hand-drawn-btn p-2 text-red-400">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-3xl font-bold text-slate-800 tracking-wide">{authUser.username}</h3>
                                                <button onClick={() => { setTempName(authUser.username); setIsEditingName(true); }} className="hand-drawn-btn p-1.5 text-slate-400 hover:text-slate-700">
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Motto / 座右铭 */}
                                        {isEditingMotto ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={tempMotto}
                                                    onChange={(e) => setTempMotto(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMotto(); }}
                                                    placeholder="写点什么..."
                                                    maxLength={30}
                                                    className="hand-drawn-panel px-4 py-2 text-sm text-slate-600 italic"
                                                    style={{ borderWidth: '2px' }}
                                                    autoFocus
                                                />
                                                <button onClick={handleSaveMotto} className="hand-drawn-btn p-1.5 text-emerald-600">
                                                    <Edit2 size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl px-4 py-2 -rotate-1 cursor-pointer hover:bg-amber-100 transition-colors"
                                                onClick={() => { setTempMotto(authUser.motto || ''); setIsEditingMotto(true); }}
                                            >
                                                <p className="text-sm italic text-slate-600" style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>
                                                    {authUser.motto || '点击设置座右铭...'}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <Wifi size={12} className="text-emerald-500" />
                                                <span className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase">在线</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-mono tracking-wider">ID: {authUser.id.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full h-px bg-slate-200" />

                                {/* Stats Grid - 4 columns */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="hand-drawn-panel p-4 text-center" style={{ borderWidth: '2px' }}>
                                        <p className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">等级</p>
                                        <p className="text-2xl font-bold text-emerald-500">{playerLevel}</p>
                                    </div>
                                    <div className="hand-drawn-panel p-4 text-center" style={{ borderWidth: '2px' }}>
                                        <p className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">生态点</p>
                                        <p className="text-2xl font-bold text-cyan-500">{ecoPoints}</p>
                                    </div>
                                    <div className="hand-drawn-panel p-4 text-center" style={{ borderWidth: '2px' }}>
                                        <p className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">游戏时长</p>
                                        <p className="text-2xl font-bold text-amber-500">{Math.floor(stats.playtime / 60)}<span className="text-xs font-normal">min</span></p>
                                    </div>
                                    <div className="hand-drawn-panel p-4 text-center" style={{ borderWidth: '2px' }}>
                                        <p className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">访客</p>
                                        <p className="text-2xl font-bold text-violet-500">{authUser.visitorCount || 0}</p>
                                    </div>
                                </div>

                                {/* Island Info */}
                                <div className="hand-drawn-panel p-5 bg-gradient-to-r from-emerald-50 to-cyan-50" style={{ borderWidth: '2px' }}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Globe size={18} className="text-emerald-600" />
                                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">我的岛屿</p>
                                    </div>
                                    <p className="text-xl font-bold text-slate-800 tracking-wide">{islandName}</p>
                                    <p className="text-xs text-slate-400 mt-1">已放置 {stats.itemsPlaced} 个物体</p>
                                </div>

                                {/* Quick Access Buttons */}
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setActiveModal('MAILBOX')}
                                        className="hand-drawn-btn p-4 flex flex-col items-center gap-2 relative"
                                    >
                                        <Mail size={24} className="text-amber-600" />
                                        <span className="text-xs font-bold text-slate-700 tracking-wider">信箱</span>
                                        {unreadMailCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-slate-800">
                                                {unreadMailCount > 9 ? '9+' : unreadMailCount}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveModal('VISITORS')}
                                        className="hand-drawn-btn p-4 flex flex-col items-center gap-2"
                                    >
                                        <BookOpen size={24} className="text-violet-600" />
                                        <span className="text-xs font-bold text-slate-700 tracking-wider">访客簿</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveModal('PLAZA')}
                                        className="hand-drawn-btn p-4 flex flex-col items-center gap-2"
                                    >
                                        <Compass size={24} className="text-cyan-600" />
                                        <span className="text-xs font-bold text-slate-700 tracking-wider">漂流广场</span>
                                    </button>
                                </div>

                                <div className="w-full h-px bg-slate-200" />

                                {/* Logout */}
                                <button
                                    onClick={handleLogout}
                                    className="w-full hand-drawn-btn px-8 py-3 text-red-600 font-bold flex items-center justify-center gap-3"
                                >
                                    <LogOut size={16} /> 退出登录
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MAILBOX MODAL */}
                    {activeModal === 'MAILBOX' && authUser && (
                        <MailboxModal onClose={() => setActiveModal('NONE')} />
                    )}

                    {/* VISITORS MODAL */}
                    {activeModal === 'VISITORS' && authUser && (
                        <VisitorBookModal onClose={() => setActiveModal('NONE')} />
                    )}

                    {/* SOCIAL PLAZA MODAL */}
                    {activeModal === 'PLAZA' && authUser && (
                        <SocialPlaza onClose={() => setActiveModal('NONE')} />
                    )}

                </div>
            )}
        </div>
        </>
    );
};
