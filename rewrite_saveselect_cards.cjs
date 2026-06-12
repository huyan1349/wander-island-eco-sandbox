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
        <div className="absolute inset-0 z-50 flex flex-col items-center pointer-events-auto animate-in fade-in py-16 bg-grid-paper bg-white/5 backdrop-blur-sm">
            
            {/* Cinematic Header */}
            <div className="w-full max-w-6xl px-8 mb-12">
                <div className="hand-drawn-panel px-8 py-4 flex items-center justify-between shadow-lg shadow-black/10">
                    <button 
                        onClick={() => store.setScreen('TITLE')}
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
                <div className="grid grid-cols-3 gap-8">
                    
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
                    {saves.map((save, i) => (
                        <div 
                            key={save.id}
                            onClick={() => handleLoad(save.id)}
                            className="hand-drawn-panel group h-64 flex flex-col p-6 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] shadow-md hover:shadow-xl shadow-black/10 relative"
                        >
                            <div className="flex justify-between items-start mb-auto">
                                <span className="text-sm font-bold text-slate-400">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
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
                            
                            <div className="stamp absolute right-4 bottom-4 group-hover:scale-110 transition-transform origin-bottom-right">
                                {save.lastSaved ? new Date(save.lastSaved).toLocaleDateString() : 'APPROVED'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
`;

fs.writeFileSync('src/components/SaveSelectScreen.tsx', code);
console.log("Rewrote SaveSelectScreen with grid cards layout");
