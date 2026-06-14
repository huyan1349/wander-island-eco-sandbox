import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { Plus, Trash2, ArrowLeft, TreePine, Mountain, Waves, Bird, Fish, Cloud, Sun, Globe, Check } from 'lucide-react';

export const SaveSelectScreen: React.FC = () => {
    const store = useGameStore();
    const [saves, setSaves] = useState<any[]>([]);
    const authUser = useGameStore(state => state.authUser);
    const serverIslandMap = useGameStore(state => state.serverIslandMap);
    const setServerIslandMap = useGameStore(state => state.setServerIslandMap);
    const [deployingId, setDeployingId] = useState<string | null>(null);
    const [deployedIds, setDeployedIds] = useState<Set<string>>(new Set());

    // 触屏检测
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        const hasCoarse = window.matchMedia('(pointer: coarse)').matches;
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        setIsTouch(hasCoarse || hasTouch);
    }, []);

    useEffect(() => {
        const indexStr = localStorage.getItem('eco_saves_index');
        if (indexStr) {
            setSaves(JSON.parse(indexStr));
        }
        // Load server island mapping
        const mapStr = localStorage.getItem('wander_server_island_map');
        if (mapStr) {
            try {
                setServerIslandMap(JSON.parse(mapStr));
            } catch {}
        }
    }, []);

    const handleCreateNew = () => {
        AudioSystem.playConfirm();
        const name = prompt("Enter a name for your new island:");
        if (name && name.trim()) {
            store.createSaveSlot(name.trim());
            store.setScreen('PLAYING');
        }
    };

    const [hermitLoading, setHermitLoading] = useState(false);
    const enterHermit = async () => {
        if (!authUser) { AudioSystem.playClick(); store.setScreen('LOGIN'); return; }
        AudioSystem.playConfirm();
        setHermitLoading(true);
        try {
            const { loadPresetIsland } = await import('../utils/islandIO');
            await loadPresetIsland('/preset-hermit.json'); // 辞的隐者之岛底图，立即有内容
        } catch (e) {
            console.error('归隐之岛底图加载失败', e);
            store.clearAll();
        }
        store.setOnline(true);
        store.setIslandInfo('hermit', '归隐之岛');
        store.setScreen('PLAYING');
        setHermitLoading(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        AudioSystem.playConfirm();
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this island? This cannot be undone.")) {
            const newSaves = saves.filter(s => s.id !== id);
            setSaves(newSaves);
            localStorage.setItem('eco_saves_index', JSON.stringify(newSaves));
            localStorage.removeItem(`eco_save_${id}`);
        }
    };

    const handleDeploy = async (saveId: string, saveName: string, e: React.MouseEvent) => {
        AudioSystem.playConfirm();
        e.stopPropagation();
        if (!authUser) return;

        setDeployingId(saveId);
        try {
            // Load save data from localStorage
            const saved = localStorage.getItem(`eco_save_${saveId}`);
            if (!saved) return;
            const saveData = JSON.parse(saved);

            // Check if already deployed
            if (serverIslandMap[saveId]) {
                // Update existing island
                await api.updateIsland(serverIslandMap[saveId], { data: saveData });
            } else {
                // Create new island on server
                const res = await api.createIsland(saveName, true, saveData);
                setServerIslandMap({ ...serverIslandMap, [saveId]: res.island.id });
                // Persist mapping
                localStorage.setItem('wander_server_island_map', JSON.stringify({ ...serverIslandMap, [saveId]: res.island.id }));
            }
            setDeployedIds(prev => new Set([...prev, saveId]));
        } catch (err) {
            console.error('Deploy failed:', err);
        } finally {
            setDeployingId(null);
        }
    };

    const handleLoad = (id: string) => {
        AudioSystem.playConfirm();
        store.loadGame(id, true);
        store.setScreen('PLAYING');
    };

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center pointer-events-auto animate-in fade-in py-16 bg-grid-paper bg-white/5 backdrop-blur-sm">
            
            {/* Cinematic Header */}
            <div className="w-full max-w-6xl px-8 mb-12">
                <div className="hand-drawn-panel px-8 py-4 flex items-center justify-between shadow-lg shadow-black/10">
                    <button 
                        onClick={() => { AudioSystem.playClose(); store.setScreen('TITLE'); }}
                        className="group flex items-center gap-4 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold tracking-widest uppercase">Return</span>
                    </button>
                    <div className="text-xl font-bold tracking-[0.2em] text-slate-800 uppercase hand-drawn-title">
                        Island Archives
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="w-full max-w-6xl px-8 flex-1 overflow-y-auto no-scrollbar pb-24">
                <div className={`grid gap-8 ${isTouch ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-3'}`}>

                    {/* 归隐之岛（联机公共服务器） */}
                    <button
                        onClick={enterHermit}
                        disabled={hermitLoading}
                        className="group h-64 flex flex-col items-center justify-center gap-5 cursor-pointer rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] shadow-lg shadow-black/20 border-2 border-slate-800 relative overflow-hidden disabled:opacity-80"
                        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(110,231,183,0.35), transparent 60%), linear-gradient(160deg, #1e3a5f, #0f2438)' }}
                    >
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold tracking-widest">联机</div>
                        <Globe size={48} className={`text-emerald-300 transition-transform ${hermitLoading ? 'animate-spin' : 'group-hover:scale-110'}`} strokeWidth={1.5} />
                        <div className="text-center px-4">
                            <span className="block text-xl font-bold tracking-[0.15em] text-white hand-drawn-title">归隐之岛</span>
                            <span className="block text-[11px] text-emerald-200/70 mt-1 tracking-wider">{hermitLoading ? '正在登岛…' : '与最多 20 位漫游者一同建造'}</span>
                        </div>
                    </button>

                    {/* Create New Card */}
                    <button 
                        onClick={handleCreateNew}
                        className="hand-drawn-panel group h-64 flex flex-col items-center justify-center gap-6 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] shadow-md hover:shadow-xl shadow-black/10"
                    >
                        <div className="w-20 h-20 flex items-center justify-center border-4 border-dashed border-slate-800/30 rounded-xl text-slate-800 group-hover:border-slate-800 group-hover:bg-slate-800 group-hover:text-white transition-all duration-300">
                            <Plus size={40} strokeWidth={3} />
                        </div>
                        <span className="text-xl font-bold tracking-[0.2em] text-slate-800 uppercase hand-drawn-title text-center px-4">
                            Initialize Seed
                        </span>
                    </button>

                    {/* Save Cards */}
                    {saves.map((save, i) => {
                        const icons = [TreePine, Mountain, Waves, Bird, Fish, Cloud, Sun];
                        // Select an icon deterministically based on save.id length or char codes
                        const Icon = icons[(save.id.charCodeAt(0) + save.id.charCodeAt(save.id.length-1)) % icons.length];
                        
                        return (
                        <div 
                            key={save.id}
                            onClick={() => { AudioSystem.playClick(); handleLoad(save.id); }}
                            className="hand-drawn-panel group h-64 flex flex-col p-6 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] shadow-md hover:shadow-xl shadow-black/10 relative overflow-hidden"
                        >
                            {/* Random Doodle Watermark (Bottom Right, partially hidden) */}
                            <div className="absolute -bottom-8 -right-8 text-slate-900 opacity-[0.04] group-hover:opacity-[0.08] transition-all duration-500 pointer-events-none group-hover:scale-110 group-hover:-rotate-6">
                                <Icon size={160} strokeWidth={1} />
                            </div>

                            <div className="flex justify-between items-start mb-auto z-10">
                                <span className="text-sm font-bold text-slate-400">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                {authUser && (
                                <button
                                    onClick={(e) => handleDeploy(save.id, save.name, e)}
                                    disabled={deployingId === save.id}
                                    className={`p-2 rounded-full border-2 transition-all z-10 ${
                                        deployedIds.has(save.id) || serverIslandMap[save.id]
                                            ? 'text-emerald-500 border-emerald-500 bg-emerald-50'
                                            : 'text-blue-400 hover:text-white hover:bg-blue-500 border-transparent'
                                    }`}
                                >
                                    {deployingId === save.id ? (
                                        <span className="animate-spin text-sm">⏳</span>
                                    ) : deployedIds.has(save.id) || serverIslandMap[save.id] ? (
                                        <Check size={20} strokeWidth={2.5} />
                                    ) : (
                                        <Globe size={20} strokeWidth={2.5} />
                                    )}
                                </button>
                                )}
                                <button
                                    onClick={(e) => handleDelete(save.id, e)}
                                    className="p-2 text-red-400 hover:text-white hover:bg-red-500 rounded-full border-2 border-transparent transition-all z-10"
                                >
                                    <Trash2 size={20} strokeWidth={2.5} />
                                </button>
                            </div>
                            
                            <h3 className="text-3xl font-bold tracking-widest text-slate-800 uppercase hand-drawn-title text-center mb-6 break-words px-2 line-clamp-2">
                                {save.name}
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4 mt-auto mb-4 px-2 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="flex flex-col gap-1 items-start">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uptime</span>
                                    <span className="text-sm font-mono font-bold text-slate-800">{Math.floor(save.playtime / 60)}M</span>
                                </div>
                                <div className="flex flex-col gap-1 items-start">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ecology</span>
                                    <span className="text-sm font-mono font-bold text-[#00b894]">{save.ecoPoints}</span>
                                </div>
                            </div>
                            
                            {(deployedIds.has(save.id) || serverIslandMap[save.id]) && (
                                <div className="absolute left-4 bottom-4 text-emerald-600 border-2 border-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-widest uppercase opacity-70">
                                    已部署
                                </div>
                            )}
                            <div className="stamp absolute right-4 bottom-4 group-hover:scale-110 transition-transform origin-bottom-right z-10">
                                {save.lastPlayed ? new Date(save.lastPlayed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : 'APPROVED'}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
