import React, { useState } from 'react';
import { useGameStore } from '../store';
import { X, Globe, Wifi, WifiOff, User, Camera } from 'lucide-react';
import { AudioSystem } from '../lib/audio';
import { api } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

export const TitleScreen: React.FC = () => {
    const setScreen = useGameStore(state => state.setScreen);
    const titleTheme = useGameStore(state => state.titleTheme);
    const setTitleTheme = useGameStore(state => state.setTitleTheme);
    const authUser = useGameStore(state => state.authUser);
    const setAuthUser = useGameStore(state => state.setAuthUser);
    const clearAuthUser = useGameStore(state => state.clearAuthUser);
    const playerAvatar = useGameStore(state => state.playerAvatar);
    const setPlayerAvatar = useGameStore(state => state.setPlayerAvatar);
    const playerName = useGameStore(state => state.playerName);
    const setPlayerName = useGameStore(state => state.setPlayerName);
    const playerLevel = useGameStore(state => state.playerLevel);
    const playerXP = useGameStore(state => state.playerXP);
    const ecoPoints = useGameStore(state => state.ecoPoints);
    const stats = useGameStore(state => state.stats);
    const islandName = useGameStore(state => state.islandName);
    const [activeModal, setActiveModal] = useState<'NONE' | 'SETTINGS' | 'CREDITS' | 'PROFILE'>('NONE');

    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(authUser?.username || playerName);
    
    const [masterVol, setMasterVol] = useState(0.6);
    const [bgmVol, setBgmVol] = useState(0.5);

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

    return (
        <div className="absolute inset-0 z-50 flex pointer-events-none p-16">
            
            {/* Top Right Version / Info */}
            <div className="absolute top-16 right-16 flex flex-col items-end gap-1">
                <span className={"text-sm font-bold hand-drawn-title " + (titleTheme === 'white' ? "text-slate-700" : "text-slate-700")}>Wander Island</span>
                <span className={"text-xs font-bold " + (titleTheme === 'white' ? "text-slate-600" : "text-slate-600")}>流浪岛 . 测试版 v2.0.0 Multiplayer</span>
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
                <div className="mt-20 animate-slide-up" style={{ opacity: 0 }}>
                    <h1 className={"text-[8rem] leading-[0.8] font-bold hand-drawn-title tracking-[0.1em] " + (titleTheme === 'white' ? "text-white/90" : "text-slate-900")}>
                        WANDER
                    </h1>
                    <h1 className={"text-[6rem] leading-none font-bold hand-drawn-title tracking-[0.2em] " + (titleTheme === 'white' ? "text-white/70" : "text-slate-900/60")}>
                        ISLAND
                    </h1>
                    <div className="flex items-center gap-6 mt-12 opacity-80 pl-2">
                        <div className="h-px w-12 0" />
                        <span className={"text-2xl font-bold tracking-[0.2em] hand-drawn-title " + (titleTheme === 'white' ? "text-white/80" : "text-slate-400")}>流浪岛</span>
                    </div>
                </div>

                {/* Cinematic Chinese Menu */}
                <div className="pointer-events-auto animate-slide-up mb-20 flex flex-col items-start gap-6 pl-4 mt-12">
                    <button
                        onClick={() => authUser ? setScreen('SAVE_SELECT') : setScreen('LOGIN')}
                        className="hand-drawn-btn flex items-center justify-center gap-3 w-full py-4 text-xl"
                    >
                        <Globe size={24} />
                        {authUser ? '联机模式' : '联机模式'}
                        {authUser && <span className="text-sm font-normal text-emerald-600 ml-1">({authUser.username})</span>}
                    </button>
                    <button
                        onClick={() => setScreen('SAVE_SELECT')}
                        className="group w-64 flex justify-center items-center hand-drawn-btn hand-drawn-ghost px-6 py-4 -rotate-2"
                    >
                        <span className={"text-2xl font-bold group-hover:text-slate-900 transition-colors " + (titleTheme === 'white' ? "text-white/90" : "text-slate-400")}>
                            开始旅程
                        </span>
                    </button>
                    
                    <button 
                        onClick={() => setActiveModal('SETTINGS')}
                        className="group w-64 flex justify-center items-center hand-drawn-btn hand-drawn-ghost px-6 py-4 rotate-1"
                    >
                        <span className={"text-2xl font-bold group-hover:text-slate-900 transition-colors " + (titleTheme === 'white' ? "text-white/90" : "text-slate-400")}>
                            游戏设置
                        </span>
                    </button>

                    <button 
                        onClick={() => setActiveModal('CREDITS')}
                        className="group w-64 flex justify-center items-center hand-drawn-btn hand-drawn-ghost px-6 py-4 -rotate-1"
                    >
                        <span className={"text-2xl font-bold group-hover:text-slate-900 transition-colors " + (titleTheme === 'white' ? "text-white/90" : "text-slate-400")}>
                            制作组
                        </span>
                    </button>
                </div>
            </div>

            {/* Modals Overlay */}
            {activeModal !== 'NONE' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-md pointer-events-auto animate-in fade-in duration-500">
                    
                    {/* SETTINGS MODAL */}
                    {activeModal === 'SETTINGS' && (
                        <div className="hand-drawn-panel w-[600px] p-12 flex flex-col gap-10 animate-slide-up ring-1 ring-slate-800/10">
                            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-6">
                                <h2 className="text-3xl hand-drawn-title">游戏设置</h2>
                                <button onClick={() => setActiveModal('NONE')} className="hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200">
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
                        <div className="hand-drawn-panel w-[500px] p-12 flex flex-col items-center gap-10 animate-slide-up text-center ring-1 ring-slate-800/10">
                            <div className="w-full flex justify-end">
                                <button onClick={() => setActiveModal('NONE')} className="hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200">
                                    <X size={24} strokeWidth={3} className="text-slate-800" />
                                </button>
                            </div>
                            
                            <h2 className="text-5xl hand-drawn-title mb-4 -rotate-2">WANDER ISLAND</h2>
                            
                            <div className="flex flex-col gap-8 w-full">
                                <div className="flex flex-col gap-2 bg-[#ffeaa7] border-2 border-slate-800 p-4 -rotate-1 shadow-[4px_4px_0_#2d3436]">
                                    <span className="text-sm font-bold text-slate-600">核心开发 & 策划</span>
                                    <span className={"text-2xl font-bold group-hover:text-slate-900 transition-colors " + (titleTheme === 'white' ? "text-white/90" : "text-slate-400")}>huyan</span>
                                </div>
                                <div className="flex flex-col gap-2 bg-[#74b9ff] border-2 border-slate-800 p-4 rotate-1 shadow-[4px_4px_0_#2d3436]">
                                    <span className="text-sm font-bold text-slate-800">AI 协力 & 视觉工程</span>
                                    <span className="text-2xl font-bold text-slate-900">Antigravity</span>
                                </div>
                                <div className="flex flex-col gap-2 p-4">
                                    <span className="text-sm font-bold text-slate-500">特别鸣谢</span>
                                    <span className="text-lg font-bold text-slate-700">Open Source Community</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 w-full">
                                <span className="text-lg font-bold text-slate-800 underline decoration-wavy decoration-emerald-400">在孤岛中寻找生态的呼吸</span>
                            </div>
                        </div>
                    )}

                    {/* PROFILE MODAL */}
                    {activeModal === 'PROFILE' && authUser && (
                        <div className="hand-drawn-panel w-[700px] max-h-[85vh] p-0 flex flex-col animate-slide-up ring-1 overflow-hidden">
                            {/* Header */}
                            <div className="flex justify-between items-center border-b-2 border-slate-800 p-8 pb-6">
                                <h2 className="text-3xl hand-drawn-title -rotate-1">我的档案</h2>
                                <button onClick={() => setActiveModal('NONE')} className="hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200">
                                    <X size={24} strokeWidth={3} className="text-slate-800" />
                                </button>
                            </div>

                            <div className="p-8 pt-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                                {/* Avatar & Name Section */}
                                <div className="flex items-start gap-8">
                                    {/* Avatar */}
                                    <div className="relative group shrink-0">
                                        <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center border-3 border-slate-800 shadow-inner overflow-hidden">
                                            {authUser.avatar ? (
                                                <img src={authUser.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={40} className="text-slate-700" />
                                            )}
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse" />
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <Camera size={24} className="text-white" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return;
                                                    const reader = new FileReader();
                                                    reader.onload = async (ev) => {
                                                        const dataUrl = ev.target?.result as string;
                                                        try {
                                                            const res = await api.updateProfile({ avatar: dataUrl });
                                                            setAuthUser(res.user);
                                                        } catch {}
                                                        setPlayerAvatar(dataUrl);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    {/* Name & Info */}
                                    <div className="flex-1 flex flex-col gap-3">
                                        {isEditingName ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={tempName}
                                                    onChange={(e) => setTempName(e.target.value)}
                                                    onKeyDown={async (e) => {
                                                        if (e.key === 'Enter' && tempName.trim()) {
                                                            setPlayerName(tempName.trim());
                                                            try {
                                                                const res = await api.updateProfile({ username: tempName.trim() });
                                                                setAuthUser(res.user);
                                                            } catch {}
                                                            setIsEditingName(false);
                                                        }
                                                    }}
                                                    className="hand-drawn-panel px-4 py-2 text-lg font-bold text-slate-800 tracking-wide"
                                                    style={{ borderWidth: '2px' }}
                                                    autoFocus
                                                />
                                                <button onClick={async () => {
                                                    if (tempName.trim()) {
                                                        setPlayerName(tempName.trim());
                                                        try {
                                                            const res = await api.updateProfile({ username: tempName.trim() });
                                                            setAuthUser(res.user);
                                                        } catch {}
                                                    }
                                                    setIsEditingName(false);
                                                }} className="hand-drawn-btn p-2 text-emerald-600">
                                                    ✓
                                                </button>
                                                <button onClick={() => { setTempName(authUser.username); setIsEditingName(false); }} className="hand-drawn-btn p-2 text-red-400">
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-2xl font-bold text-slate-800 tracking-wide">{authUser.username}</h3>
                                                <button onClick={() => { setTempName(authUser.username); setIsEditingName(true); }} className="hand-drawn-btn p-1.5 text-slate-400 hover:text-slate-700">
                                                    <Camera size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Wifi size={12} className="text-emerald-500" />
                                            <span className="text-xs font-bold text-emerald-600 tracking-widest uppercase">在线</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-mono tracking-wider">ID: {authUser.id.slice(0, 8)}...</p>
                                    </div>
                                </div>

                                <div className="w-full h-px bg-slate-200" />

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="hand-drawn-panel p-5 text-center" style={{ borderWidth: '2px' }}>
                                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">等级</p>
                                        <p className="text-3xl font-bold text-emerald-500">{playerLevel}</p>
                                    </div>
                                    <div className="hand-drawn-panel p-5 text-center" style={{ borderWidth: '2px' }}>
                                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">生态点</p>
                                        <p className="text-3xl font-bold text-cyan-500">{ecoPoints}</p>
                                    </div>
                                    <div className="hand-drawn-panel p-5 text-center" style={{ borderWidth: '2px' }}>
                                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">游戏时长</p>
                                        <p className="text-3xl font-bold text-amber-500">{Math.floor(stats.playtime / 60)}<span className="text-sm font-normal">min</span></p>
                                    </div>
                                </div>

                                {/* XP Progress */}
                                <div className="hand-drawn-panel p-5" style={{ borderWidth: '2px' }}>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">经验值</p>
                                        <span className="text-xs font-bold text-slate-600">{playerXP % 100} / 100</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all" style={{ width: `${(playerXP % 100)}%` }} />
                                    </div>
                                </div>

                                {/* Island Info */}
                                <div className="hand-drawn-panel p-5" style={{ borderWidth: '2px' }}>
                                    <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-2">岛屿</p>
                                    <p className="text-xl font-bold text-slate-800 tracking-wide">{islandName}</p>
                                    <p className="text-xs text-slate-400 mt-1">已放置 {stats.itemsPlaced} 个物体</p>
                                </div>

                                <div className="w-full h-px bg-slate-200" />

                                {/* Account Info */}
                                <div className="hand-drawn-panel p-5" style={{ borderWidth: '2px' }}>
                                    <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">账号信息</p>
                                    <div className="flex flex-col gap-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">用户名</span>
                                            <span className="font-bold text-slate-800">{authUser.username}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">网络状态</span>
                                            <span className="font-bold text-emerald-500 flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> 已连接
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">版本</span>
                                            <span className="font-bold text-slate-800">v2.0.0 Multiplayer</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Logout */}
                                <button
                                    onClick={() => {
                                        api.setToken(null);
                                        disconnectSocket();
                                        clearAuthUser();
                                        setActiveModal('NONE');
                                    }}
                                    className="w-full hand-drawn-btn px-8 py-4 text-red-600 font-bold flex items-center justify-center gap-3"
                                >
                                    退出登录
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};
