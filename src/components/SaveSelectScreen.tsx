import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { Plus, Trash2, ArrowLeft, Globe } from 'lucide-react';

export const SaveSelectScreen: React.FC = () => {
    const store = useGameStore();
    const [saves, setSaves] = useState<any[]>([]);

    useEffect(() => {
        const indexStr = localStorage.getItem('eco_saves_index');
        if (indexStr) {
            setSaves(JSON.parse(indexStr));
        }
    }, []);

    const handleCreateNew = () => {
        const name = prompt("Enter a name for your new island:");
        if (name && name.trim()) {
            store.createSaveSlot(name.trim());
            store.setScreen('PLAYING');
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this island? This cannot be undone.")) {
            // Placeholder: no actual delete in store yet
            setSaves(saves.filter(s => s.id !== id));
        }
    };

    const handleLoad = (id: string) => {
        store.loadGame(id);
        store.setScreen('PLAYING');
    };

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto cinematic-vignette animate-in fade-in py-16">
            
            {/* Cinematic Header */}
            <div className="w-full max-w-4xl px-8 mb-12">
                <div className="flat-glass-pill px-8 py-4 flex items-center justify-between">
                    <button 
                        onClick={() => store.setScreen('TITLE')}
                        className="group flex items-center gap-4 text-white/50 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={16} className="font-light group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-light tracking-[0.4em] uppercase">Return</span>
                    </button>
                    <div className="text-sm font-light tracking-[0.6em] text-white/80 uppercase">
                        Island Archives
                    </div>
                </div>
            </div>

            <div className="w-full max-w-4xl px-8 flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar pb-12">
                
                {/* Flat Glass Button for New Island */}
                <button 
                    onClick={handleCreateNew}
                    className="flat-glass-panel group w-full flex items-center gap-8 px-8 py-6 cursor-pointer"
                >
                    <div className="w-12 h-12 flex items-center justify-center border border-white/20 rounded-full text-white/50 group-hover:border-white/50 group-hover:text-white transition-all duration-500">
                        <Plus size={18} />
                    </div>
                    <span className="text-lg font-light tracking-[0.3em] text-white/70 group-hover:text-white transition-colors uppercase">
                        Initialize New Seed
                    </span>
                </button>

                {/* Flat Glass Cards for Saves */}
                {saves.map((save, i) => (
                    <div 
                        key={save.id}
                        onClick={() => handleLoad(save.id)}
                        className="flat-glass-panel group w-full flex items-center justify-between px-8 py-6 cursor-pointer"
                    >
                        <div className="flex items-center gap-8">
                            <span className="text-xs font-mono tracking-[0.4em] text-white/30 group-hover:text-white/60 w-8 transition-colors">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <h3 className="text-xl font-light tracking-[0.2em] text-white/70 group-hover:text-white transition-colors uppercase">
                                {save.name}
                            </h3>
                            
                            <div className="flex items-center gap-8 ml-8 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-mono text-white/40 tracking-[0.3em] uppercase">Uptime</span>
                                    <span className="text-sm font-light text-white/80 tracking-widest">{Math.floor(save.playtime / 60)}M</span>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-mono text-white/40 tracking-[0.3em] uppercase">Ecology</span>
                                    <span className="text-sm font-light text-emerald-400/80 group-hover:text-emerald-400 tracking-widest">{save.ecoPoints}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <span className="text-[10px] font-mono text-white/30 tracking-widest bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                                {new Date(save.lastSaved).toLocaleDateString()}
                            </span>
                            <button 
                                onClick={(e) => handleDelete(save.id, e)}
                                className="p-3 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
