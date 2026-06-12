import React, { useState } from 'react';
import { useGameStore } from '../store';
import { X, Globe } from 'lucide-react';
import { AudioSystem } from '../lib/audio';

export const TitleScreen: React.FC = () => {
    const setScreen = useGameStore(state => state.setScreen);
    const titleTheme = useGameStore(state => state.titleTheme);
    const setTitleTheme = useGameStore(state => state.setTitleTheme);
    const [activeModal, setActiveModal] = useState<'NONE' | 'SETTINGS' | 'CREDITS'>('NONE');
    
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
                        onClick={() => setScreen('LOGIN')}
                        className="hand-drawn-btn flex items-center justify-center gap-3 w-full py-4 text-xl"
                    >
                        <Globe size={24} />
                        联机模式
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

                </div>
            )}
        </div>
    );
};
