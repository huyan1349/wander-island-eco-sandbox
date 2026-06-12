import React, { useState } from 'react';
import { useGameStore } from '../store';
import { X } from 'lucide-react';
import { AudioSystem } from '../lib/audio';

export const TitleScreen: React.FC = () => {
    const setScreen = useGameStore(state => state.setScreen);
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
        <div className="absolute inset-0 z-50 flex pointer-events-none cinematic-vignette p-16">
            
            {/* Top Right Version / Info */}
            <div className="absolute top-16 right-16 opacity-30 flex flex-col items-end gap-1">
                <span className="font-mono text-[10px] tracking-[0.4em] text-white uppercase">Wander Island</span>
                <span className="text-xs font-light tracking-[0.3em] text-white">生态沙盒模拟 . 早期测试版 v1.0</span>
            </div>

            {/* Left-Aligned Main Layout */}
            <div className="flex flex-col justify-between h-full w-full max-w-3xl">
                
                {/* Titles */}
                <div className="mt-20 animate-slide-up" style={{ opacity: 0 }}>
                    <h1 className="text-[9rem] leading-[0.8] font-light cinematic-text text-white tracking-[0.1em]">
                        WANDER
                    </h1>
                    <h1 className="text-[7rem] leading-none font-light cinematic-text text-white/60 tracking-[0.2em]">
                        ISLAND
                    </h1>
                    <div className="flex items-center gap-6 mt-12 opacity-80 pl-2">
                        <div className="h-px w-12 bg-white/50" />
                        <span className="text-xl font-light tracking-[1em] text-white">生态沙盒模拟系统</span>
                    </div>
                </div>

                {/* Cinematic Chinese Menu */}
                <div className="pointer-events-auto animate-slide-up mb-20 flex flex-col items-start gap-8 pl-4" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
                    <button 
                        onClick={() => setScreen('SAVE_SELECT')}
                        className="group relative flex items-center gap-4 hover:translate-x-4 transition-all duration-500"
                    >
                        <span className="text-white/0 group-hover:text-emerald-400 text-sm transition-colors duration-500">◆</span>
                        <span className="text-2xl font-light tracking-[0.5em] text-white/60 group-hover:text-white transition-colors duration-500">
                            开始旅程
                        </span>
                    </button>
                    
                    <button 
                        onClick={() => setActiveModal('SETTINGS')}
                        className="group relative flex items-center gap-4 hover:translate-x-4 transition-all duration-500"
                    >
                        <span className="text-white/0 group-hover:text-white/80 text-sm transition-colors duration-500">◆</span>
                        <span className="text-xl font-light tracking-[0.4em] text-white/40 group-hover:text-white/90 transition-colors duration-500">
                            游戏设置
                        </span>
                    </button>

                    <button 
                        onClick={() => setActiveModal('CREDITS')}
                        className="group relative flex items-center gap-4 hover:translate-x-4 transition-all duration-500"
                    >
                        <span className="text-white/0 group-hover:text-white/80 text-sm transition-colors duration-500">◆</span>
                        <span className="text-xl font-light tracking-[0.4em] text-white/40 group-hover:text-white/90 transition-colors duration-500">
                            制作组
                        </span>
                    </button>
                </div>
            </div>

            {/* Modals Overlay */}
            {activeModal !== 'NONE' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md pointer-events-auto animate-in fade-in duration-500">
                    
                    {/* SETTINGS MODAL */}
                    {activeModal === 'SETTINGS' && (
                        <div className="flat-glass-panel w-[600px] p-12 flex flex-col gap-10 animate-slide-up">
                            <div className="flex justify-between items-center border-b border-white/10 pb-6">
                                <h2 className="text-2xl font-light tracking-[0.5em] text-white">游戏设置</h2>
                                <button onClick={() => setActiveModal('NONE')} className="text-white/40 hover:text-white transition-colors">
                                    <X size={24} strokeWidth={1} />
                                </button>
                            </div>
                            
                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col gap-4">
                                    <span className="text-sm tracking-[0.2em] text-white/60">主音量</span>
                                    <div className="relative w-full h-4 flex items-center">
                                        <div className="absolute h-1 bg-white/10 rounded-full w-full pointer-events-none">
                                            <div className="h-full bg-emerald-400/80 rounded-full" style={{ width: `${masterVol * 100}%` }} />
                                        </div>
                                        <input type="range" min="0" max="1" step="0.05" value={masterVol} onChange={handleMasterVol} className="w-full opacity-0 cursor-pointer absolute inset-0 h-full" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <span className="text-sm tracking-[0.2em] text-white/60">音乐音量 (BGM)</span>
                                    <div className="relative w-full h-4 flex items-center">
                                        <div className="absolute h-1 bg-white/10 rounded-full w-full pointer-events-none">
                                            <div className="h-full bg-white/60 rounded-full" style={{ width: `${bgmVol * 100}%` }} />
                                        </div>
                                        <input type="range" min="0" max="1" step="0.05" value={bgmVol} onChange={handleBgmVol} className="w-full opacity-0 cursor-pointer absolute inset-0 h-full" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <span className="text-sm tracking-[0.2em] text-white/60">画质预设</span>
                                    <div className="flex gap-4">
                                        <button className="px-6 py-2 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors tracking-widest text-sm">性能优先</button>
                                        <button className="px-6 py-2 border border-emerald-400/50 text-emerald-400 bg-emerald-400/10 transition-colors tracking-widest text-sm">平衡</button>
                                        <button className="px-6 py-2 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors tracking-widest text-sm">极致画质</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CREDITS MODAL */}
                    {activeModal === 'CREDITS' && (
                        <div className="flat-glass-panel w-[500px] p-12 flex flex-col items-center gap-10 animate-slide-up text-center">
                            <div className="w-full flex justify-end">
                                <button onClick={() => setActiveModal('NONE')} className="text-white/40 hover:text-white transition-colors">
                                    <X size={24} strokeWidth={1} />
                                </button>
                            </div>
                            
                            <h2 className="text-3xl font-light tracking-[0.4em] text-white mb-4">WANDER ISLAND</h2>
                            
                            <div className="flex flex-col gap-8 w-full">
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-mono tracking-[0.3em] text-emerald-400/60 uppercase">核心开发 & 策划</span>
                                    <span className="text-lg tracking-[0.2em] text-white/90 uppercase">huyan</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-mono tracking-[0.3em] text-white/40 uppercase">AI 协力 & 视觉工程</span>
                                    <span className="text-lg tracking-[0.2em] text-white/90">Antigravity</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-mono tracking-[0.3em] text-white/40 uppercase">特别鸣谢</span>
                                    <span className="text-sm tracking-[0.2em] text-white/60">Open Source Community</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/10 w-full">
                                <span className="text-sm font-light tracking-[0.5em] text-white/30">在孤岛中寻找生态的呼吸</span>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};
