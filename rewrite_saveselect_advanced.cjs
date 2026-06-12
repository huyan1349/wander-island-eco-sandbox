const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { AudioSystem } from '../lib/audio';

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
        AudioSystem.playDig();
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
        AudioSystem.playDig();
        store.loadGame(id, true);
        store.setScreen('PLAYING');
    };

    const rotations = ['rotate-1', '-rotate-2', 'rotate-2', '-rotate-1', 'rotate-0'];

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto animate-in fade-in py-16 bg-grid-paper bg-white/5 backdrop-blur-sm">
            
            {/* Cinematic Header */}
            <div className="w-full max-w-5xl px-8 mb-8 z-10">
                <div className="hand-drawn-panel px-8 py-4 flex items-center justify-between -rotate-1 shadow-lg shadow-black/10">
                    <button 
                        onClick={() => { AudioSystem.playPop(); store.setScreen('TITLE'); }}
                        className="group flex items-center gap-4 text-slate-600 hover:text-slate-900 transition-colors"
                        onMouseEnter={() => AudioSystem.playPop()}
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold tracking-widest uppercase">Return</span>
                    </button>
                    <div className="text-xl font-bold tracking-[0.2em] text-slate-800 uppercase hand-drawn-title">
                        Island Archives
                    </div>
                </div>
            </div>

            <div className="w-full max-w-5xl px-8 flex-1 flex flex-col gap-8 overflow-y-auto no-scrollbar pb-24 items-center">
                
                {/* Paper Panel for New Island */}
                <button 
                    onClick={handleCreateNew}
                    onMouseEnter={() => AudioSystem.playPop()}
                    className="hand-drawn-panel group w-3/4 flex items-center gap-8 px-8 py-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:rotate-1 shadow-md hover:shadow-xl shadow-black/10"
                >
                    <div className="w-16 h-16 flex items-center justify-center border-4 border-dashed border-slate-800/30 rounded-xl text-slate-800 group-hover:border-slate-800 group-hover:bg-[#ffeaa7] transition-all duration-300">
                        <Plus size={32} strokeWidth={3} />
                    </div>
                    <span className="text-3xl font-bold tracking-[0.2em] text-slate-800 uppercase hand-drawn-title">
                        Initialize New Seed
                    </span>
                </button>

                {/* Staggered Paper Panels for Saves */}
                {saves.map((save, i) => (
                    <div 
                        key={save.id}
                        onClick={() => handleLoad(save.id)}
                        onMouseEnter={() => AudioSystem.playPop()}
                        className={\`hand-drawn-panel group w-full flex items-center justify-between px-8 py-6 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] shadow-md hover:shadow-xl shadow-black/10 \${rotations[i % rotations.length]} hover:rotate-0 relative overflow-hidden\`}
                    >
                        <div className="flex items-center gap-8">
                            {/* Polaroid Thumbnail */}
                            <div className="w-20 h-24 bg-white p-2 shadow-sm border border-slate-200 flex flex-col items-center transform -rotate-3 group-hover:rotate-0 transition-transform duration-300">
                                <div className="w-full flex-1 bg-slate-100 overflow-hidden">
                                    <img src={\`https://api.dicebear.com/7.x/micah/svg?seed=\${save.id}&backgroundColor=fcf8ec\`} alt="island doodle" className="w-full h-full object-cover mix-blend-multiply" />
                                </div>
                                <span className="text-[8px] font-mono mt-1 text-slate-400">ID:{save.id.slice(-4)}</span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <h3 className="text-4xl font-bold tracking-widest text-slate-800 uppercase hand-drawn-title">
                                    {save.name}
                                </h3>
                                
                                <div className="flex items-center gap-6 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uptime:</span>
                                        <span className="text-sm font-mono font-bold text-slate-800">{Math.floor(save.playtime / 60)}M</span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ecology:</span>
                                        <span className="text-sm font-mono font-bold text-[#00b894]">{save.ecoPoints}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 relative h-full">
                            {/* Red Stamp for Date */}
                            <div className="stamp absolute right-24 top-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform">
                                {save.lastSaved ? new Date(save.lastSaved).toLocaleDateString() : 'APPROVED'}
                            </div>
                            
                            <button 
                                onClick={(e) => handleDelete(save.id, e)}
                                onMouseEnter={() => AudioSystem.playPop()}
                                className="p-4 text-red-400 hover:text-white hover:bg-red-500 rounded-full border-2 border-transparent hover:border-red-600 transition-all z-10"
                            >
                                <Trash2 size={24} strokeWidth={2.5} />
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
console.log("Rewrote SaveSelectScreen with advanced polaroid layout");
