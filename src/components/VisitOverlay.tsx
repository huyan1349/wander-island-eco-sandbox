import React from 'react';
import { useGameStore } from '../store';
import { ArrowLeft, Compass } from 'lucide-react';
export const VisitOverlay: React.FC = () => {
  const visitingIsland = useGameStore(s => s.visitingIsland);
  const isVisiting = useGameStore(s => s.isVisiting);
  const exitVisiting = useGameStore(s => s.exitVisiting);
  if (!visitingIsland || !isVisiting) return null;
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[150] w-full px-3 flex justify-center pointer-events-none">
      <div className="hand-drawn-panel pointer-events-auto flex items-center gap-3 px-4 py-2">
        <Compass size={20} className="text-emerald-600 shrink-0" />
        <div className="text-left leading-tight">
          <div className="text-sm font-bold text-slate-800">参观中 · {visitingIsland.islandName}</div>
          <div className="text-xs text-slate-500">by {visitingIsland.ownerName}</div>
        </div>
        <button onClick={exitVisiting} className="hand-drawn-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ml-1">
          <ArrowLeft size={14} />返回我的岛屿
        </button>
      </div>
    </div>
  );
};
