import React from 'react';
import { useGameStore } from '../store';
import { ArrowLeft, Compass, Globe } from 'lucide-react';

export const VisitOverlay: React.FC = () => {
  const visitingIsland = useGameStore(state => state.visitingIsland);
  const setVisitingIsland = useGameStore(state => state.setVisitingIsland);
  const loadGame = useGameStore(state => state.loadGame);
  const islandId = useGameStore(state => state.islandId);

  if (!visitingIsland) return null;

  const handleReturn = () => {
    loadGame(islandId!, true);
    setVisitingIsland(null);
  };

  return (
    <div className="absolute inset-0 z-[150] flex items-center justify-center cinematic-vignette bg-slate-950/60">
      <div className="hand-drawn-panel p-12 animate-slide-up flex flex-col items-center gap-8">
        {/* Compass Loading Animation */}
        <div className="relative w-24 h-24 animate-compass-spin">
          <div className="w-full h-full rounded-full border-4 border-slate-800 relative">
            {/* Crosshair decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-800/30" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-800/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Compass size={32} className="text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="hand-drawn-title text-3xl">
            正在前往 {visitingIsland.islandName}...
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            by {visitingIsland.ownerName}
          </p>
        </div>

        {/* Globe decoration */}
        <Globe size={20} className="text-slate-400 animate-pulse" />

        {/* Return Button */}
        <button
          onClick={handleReturn}
          className="hand-drawn-btn flex items-center gap-2 px-5 py-2.5 text-sm font-bold tracking-widest"
        >
          <ArrowLeft size={16} />
          返回我的岛屿
        </button>
      </div>
    </div>
  );
};
