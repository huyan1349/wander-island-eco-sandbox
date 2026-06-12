const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

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
            const newSaves = saves.filter(s => s.id !== id);
            setSaves(newSaves);
            localStorage.setItem('eco_saves_index', JSON.stringify(newSaves));
            localStorage.removeItem(\`eco_save_\${id}\`);
        }
    };

    const handleLoad = (id: string) => {
        store.loadGame(id, true);
        store.setScreen('PLAYING');
    };

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto animate-in fade-in py-16">
            
            {/* Cinematic Header */}
            <div className="w-full max-w-4xl px-8 mb-8">
                <div className="hand-drawn-panel px-8 py-4 flex items-center justify-between">
                    <button 
                        onClick={() => store.setScreen('TITLE')}
                        className="group flex items-center gap-4 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold tracking-widest uppercase">Return</span>
                    </button>
                    <div className="text-lg font-bold tracking-[0.2em] text-slate-800 uppercase hand-drawn-title">
                        Island Archives
                    </div>
                </div>
            </div>

            <div className="w-full max-w-4xl px-8 flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-12">
                
                {/* Paper Panel for New Island */}
                <button 
                    onClick={handleCreateNew}
                    className="hand-drawn-panel group w-full flex items-center gap-8 px-8 py-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01]"
                >
                    <div className="w-12 h-12 flex items-center justify-center border-2 border-slate-800 rounded-full text-slate-800 group-hover:bg-slate-800 group-hover:text-white transition-all duration-300">
                        <Plus size={24} strokeWidth={3} />
                    </div>
                    <span className="text-2xl font-bold tracking-[0.2em] text-slate-800 uppercase hand-drawn-title">
                        Initialize New Seed
                    </span>
                </button>

                {/* Paper Panels for Saves */}
                {saves.map((save, i) => (
                    <div 
                        key={save.id}
                        onClick={() => handleLoad(save.id)}
                        className="hand-drawn-panel group w-full flex items-center justify-between px-8 py-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01]"
                    >
                        <div className="flex items-center gap-8">
                            <span className="text-sm font-bold text-slate-400 w-8">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <h3 className="text-3xl font-bold tracking-widest text-slate-800 uppercase hand-drawn-title">
                                {save.name}
                            </h3>
                            
                            <div className="flex items-center gap-8 ml-8 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="flex flex-col gap-1 items-start">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uptime</span>
                                    <span className="text-sm font-mono font-bold text-slate-800">{Math.floor(save.playtime / 60)}M</span>
                                </div>
                                <div className="flex flex-col gap-1 items-start">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ecology</span>
                                    <span className="text-sm font-mono font-bold text-[#00b894]">{save.ecoPoints}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <span className="text-xs font-mono font-bold text-slate-500 px-4 py-2 rounded-full border-2 border-slate-800/20 group-hover:border-slate-800/50 transition-colors">
                                {save.lastSaved ? new Date(save.lastSaved).toLocaleDateString() : 'New'}
                            </span>
                            <button 
                                onClick={(e) => handleDelete(save.id, e)}
                                className="p-3 text-red-400 hover:text-white hover:bg-red-500 rounded-full border-2 border-transparent hover:border-red-600 transition-all z-10"
                            >
                                <Trash2 size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
`;

fs.writeFileSync('src/components/SaveSelectScreen.tsx', code);
console.log("Restored paper panels to SaveSelectScreen with delicate hover effects");
