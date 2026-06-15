import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';
import { evaluateAchievements, Achievement } from '../lib/achievements';
import { Award } from 'lucide-react';

// 监听游戏状态变化，自动评估并弹出成就解锁横幅（治愈、不打扰）
export const AchievementSystem: React.FC = () => {
  const assets = useGameStore(s => s.assets);
  const stats = useGameStore(s => s.stats);
  const deerCount = useGameStore(s => s.deerCount);
  const wolfCount = useGameStore(s => s.wolfCount);
  const playerLevel = useGameStore(s => s.playerLevel);

  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);
  const [shown, setShown] = useState(false);

  // 任意相关状态变化 → 评估新解锁
  useEffect(() => {
    const newly = evaluateAchievements(useGameStore.getState());
    if (newly.length) setQueue(q => [...q, ...newly]);
  }, [assets, stats, deerCount, wolfCount, playerLevel]);

  // 串行播放横幅
  const busyRef = useRef(false);
  useEffect(() => {
    if (busyRef.current || queue.length === 0) return;
    busyRef.current = true;
    const next = queue[0];
    setQueue(q => q.slice(1));
    setCurrent(next);
    AudioSystem.playSynergyChord();
    requestAnimationFrame(() => setShown(true));
    const t1 = setTimeout(() => setShown(false), 3600);
    const t2 = setTimeout(() => { setCurrent(null); busyRef.current = false; }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [queue, current]);

  if (!current) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[160] pointer-events-none">
      <div
        className="hand-drawn-panel px-6 py-4 flex items-center gap-4 transition-all duration-500"
        style={{ opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(-18px)' }}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-500 border-2 border-slate-800 flex items-center justify-center shrink-0 shadow-[3px_3px_0_rgba(15,23,42,0.3)]">
          <Award size={26} className="text-slate-900" />
        </div>
        <div className="leading-tight pr-1">
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-amber-600">成就解锁</p>
          <p className="text-lg font-bold text-slate-800">{current.title}</p>
          <p className="text-xs text-slate-500">{current.desc}</p>
        </div>
      </div>
    </div>
  );
};
