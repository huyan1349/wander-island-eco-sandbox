import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';

// 注册后首次进岛的轻量欢迎引导（「辞」气泡），不做完整教程
export const WelcomeGuide: React.FC = () => {
  const setShowWelcomeGuide = useGameStore(s => s.setShowWelcomeGuide);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 600);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    AudioSystem.playClose();
    setShown(false);
    setTimeout(() => setShowWelcomeGuide(false), 300);
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] pointer-events-none">
      <div
        className="pointer-events-auto hand-drawn-panel px-6 py-4 flex items-center gap-4 max-w-md transition-all duration-500"
        style={{ opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(20px)' }}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 border-2 border-slate-800 flex items-center justify-center shrink-0 shadow-[3px_3px_0_rgba(15,23,42,0.3)]">
          <span className="hand-drawn-title text-2xl text-slate-900">辞</span>
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-black tracking-[0.2em] uppercase text-emerald-600">辞 · 你的第一位岛友</p>
          <p className="text-sm text-slate-700 leading-snug mt-0.5">
            欢迎来到漫游岛，漫游者。先试着<span className="font-bold text-emerald-700">种下第一棵树</span>吧。
          </p>
        </div>
        <button
          onClick={close}
          className="hand-drawn-btn px-4 py-2 text-sm font-bold text-slate-700 shrink-0 self-center"
        >
          知道了
        </button>
      </div>
    </div>
  );
};
