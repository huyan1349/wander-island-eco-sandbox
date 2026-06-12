import React, { useState } from 'react';
import { useGameStore } from '../store';
import { User, Edit2, Check, RefreshCw, X, BarChart2, Leaf, Unlock, Settings, LogOut, Clock, Layers } from 'lucide-react';

const avatarStyles = ['notionists', 'adventurer', 'fun-emoji', 'bottts', 'adventurer-neutral', 'thumbs', 'open-peeps'];

export const PlayerPanel: React.FC = () => {
  const store = useGameStore();
  const { 
    playerName, setPlayerName, playerLevel, playerXP, playerAvatar, setPlayerAvatar, 
    islandName, stats, ecoPoints, unlockedAssets,
    grassHealth, deerCount, wolfCount, weather, timeOfDay,
    setScreen, saveGame
  } = store;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'ecology' | 'unlocks' | 'system'>('stats');
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(playerName);

  const xpForNextLevel = 100;
  const currentLevelXP = playerXP % 100;
  const xpPercentage = (currentLevelXP / 100) * 100;

  const handleSaveName = () => {
    if (tempName.trim()) setPlayerName(tempName.trim());
    else setTempName(playerName);
    setIsEditing(false);
  };

  const handleCycleAvatar = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const randomStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
    const randomSeed = Math.random().toString(36).substring(7);
    setPlayerAvatar(`https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf`);
  };

  return (
    <>
      {/* Mini Widget */}
      <div 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-4  hover:bg-white/20 backdrop-blur-2xl border  p-3 pr-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] cursor-pointer transition-all hover:scale-105 active:scale-95"
      >
        <div className="relative group">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center border-2 border-slate-800 shadow-inner overflow-hidden">
            {playerAvatar ? (
              <img src={playerAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="text-slate-700" size={24} />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-900 border  text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center shadow-lg">
            {playerLevel}
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-[120px]">
          <span className="text-sm font-bold text-slate-900 tracking-wide">{playerName}</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Full Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto bg-slate-950/40 backdrop-blur-[32px] animate-in fade-in duration-500">
          <div className="hand-drawn-panel w-[900px] h-[600px] flex overflow-hidden shadow-2xl animate-slide-up  ring-1 ">
            
            {/* Sidebar (Sleek Glass) */}
            <div className="w-64  border-r border-slate-800 p-8 flex flex-col gap-2">
              <div className="flex items-center gap-4 mb-12">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-800 ring-4 ring-slate-800 cursor-pointer shadow-inner" onClick={handleCycleAvatar}>
                  <img src={playerAvatar} alt="Avatar" className="w-full h-full object-cover bg-gradient-to-br from-emerald-500/20 to-cyan-500/20" />
                </div>
                <div>
                  <h3 className="text-xl font-light tracking-widest text-slate-800">{playerName}</h3>
                  <p className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20 px-2 py-0.5 rounded-full inline-block mt-1">LV. {playerLevel}</p>
                </div>
              </div>

              <button 
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-light tracking-[0.2em] uppercase transition-all duration-300 ${activeTab === 'stats' ? ' text-slate-900  ring-1 ' : 'text-slate-500  hover:text-slate-600'}`}
              >
                <BarChart2 size={16} /> Passport
              </button>
              <button 
                onClick={() => setActiveTab('ecology')}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-light tracking-[0.2em] uppercase transition-all duration-300 ${activeTab === 'ecology' ? ' text-slate-900  ring-1 ' : 'text-slate-500  hover:text-slate-600'}`}
              >
                <Leaf size={16} /> Ecology
              </button>
              <button 
                onClick={() => setActiveTab('unlocks')}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-light tracking-[0.2em] uppercase transition-all duration-300 ${activeTab === 'unlocks' ? ' text-slate-900  ring-1 ' : 'text-slate-500  hover:text-slate-600'}`}
              >
                <Unlock size={16} /> Unlocks
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-light tracking-[0.2em] uppercase transition-all duration-300 mt-auto ${activeTab === 'system' ? ' text-slate-900  ring-1 ' : 'text-slate-500  hover:text-slate-600'}`}
              >
                <Settings size={16} /> System
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-gradient-to-br from-white/5 to-transparent p-12 relative">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-900  rounded-full transition-all duration-300 ring-1 ring-transparent hover:"
              >
                <X size={20} />
              </button>

              {/* Passport Tab */}
              {activeTab === 'stats' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 h-full flex flex-col">
                  <h2 className="text-3xl font-light tracking-[0.2em] text-slate-800 mb-10 border-b border-slate-800 pb-6 uppercase">huyan Passport</h2>
                  
                  <div className="grid grid-cols-2 gap-6 flex-1">
                    <div className="hand-drawn-panel p-8 flex flex-col justify-center ">
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-2">Island Name</p>
                      <p className="text-3xl font-light text-slate-800 tracking-widest">{islandName}</p>
                    </div>
                    <div className="hand-drawn-panel p-8 flex flex-col justify-center  bg-gradient-to-br from-emerald-500/10 to-transparent">
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-2">Eco Points (EP)</p>
                      <p className="text-4xl font-light text-emerald-400 tracking-wider">{ecoPoints}</p>
                    </div>
                    <div className="hand-drawn-panel p-8 flex items-center gap-8 ">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                          <Clock size={24} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">Playtime</p>
                        <p className="text-2xl font-light text-slate-800 tracking-widest">{Math.floor(stats.playtime / 60)} min</p>
                      </div>
                    </div>
                    <div className="hand-drawn-panel p-8 flex items-center gap-8 ">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                          <Layers size={24} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">Objects Placed</p>
                        <p className="text-2xl font-light text-slate-800 tracking-widest">{stats.itemsPlaced}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ecology Tab */}
              {activeTab === 'ecology' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 h-full flex flex-col">
                  <h2 className="text-3xl font-light tracking-[0.2em] text-slate-800 mb-10 border-b border-slate-800 pb-6 uppercase">Island Ecology</h2>
                  
                  <div className="hand-drawn-panel p-8  mb-8">
                    <div className="flex justify-between items-center mb-4">
                       <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">Grass Health</p>
                       <span className="font-light tracking-widest text-2xl text-slate-800">{Math.floor(grassHealth)}%</span>
                    </div>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ${grassHealth > 50 ? "bg-gradient-to-r from-emerald-500 to-green-400" : grassHealth > 20 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-red-600 to-red-400"}`}
                        style={{ width: `${grassHealth}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="hand-drawn-panel p-8 flex flex-col justify-center ">
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-2">Current Weather</p>
                      <p className="text-3xl font-light text-slate-800 tracking-widest capitalize">{weather}</p>
                    </div>
                    <div className="hand-drawn-panel p-8 flex flex-col justify-center ">
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-2">Time of Day</p>
                      <p className="text-3xl font-light text-slate-800 tracking-widest">{Math.floor(timeOfDay).toString().padStart(2, '0')}:00</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Unlocks Tab */}
              {activeTab === 'unlocks' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 h-full flex flex-col">
                  <h2 className="text-3xl font-light tracking-[0.2em] text-slate-800 mb-10 border-b border-slate-800 pb-6 uppercase">Unlocked Blueprints</h2>
                  <div className="flex-1 overflow-y-auto no-scrollbar pr-4">
                    <div className="grid grid-cols-2 gap-4">
                      {unlockedAssets.map(asset => (
                        <div key={asset} className="hand-drawn-panel px-6 py-4  flex items-center justify-between group  transition-colors cursor-default">
                          <span className="font-light tracking-widest text-slate-600 group-hover:text-slate-900 capitalize">
                            {asset.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <div className="w-2 h-2 rounded-full bg-emerald-500/50 group-hover:bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* System Tab */}
              {activeTab === 'system' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 h-full flex flex-col">
                  <h2 className="text-3xl font-light tracking-[0.2em] text-slate-800 mb-10 border-b border-slate-800 pb-6 uppercase">System Menu</h2>
                  
                  <div className="flex flex-col gap-6 max-w-sm mt-4">
                    <button 
                      onClick={() => {
                        saveGame();
                        alert("Game Saved Successfully!");
                      }}
                      className="hand-drawn-btn"
                    >
                      <span>Save Progress</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (confirm("Return to Title Screen? Any unsaved progress will be lost!")) {
                          setIsOpen(false);
                          setScreen('TITLE');
                        }
                      }}
                      className="hand-drawn-panel px-8 py-4 border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center justify-center gap-3 group mt-12"
                    >
                      <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> 
                      <span className="font-light tracking-[0.2em] uppercase text-sm">Return to Title</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
