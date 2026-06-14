import React, { useState, useEffect } from 'react';
import { AudioSystem } from '../lib/audio';
import { Maximize2, Check, Loader2, Music, Volume2, Monitor } from 'lucide-react';

interface LoadingScreenProps {
  onReady: () => void;
}

type CheckItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'checking' | 'ok' | 'fail';
};

const HAS_VISITED_KEY = 'wander-island-visited';

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onReady }) => {
  const [checks, setChecks] = useState<CheckItem[]>([
    { id: 'audio', label: '音频引擎', icon: <Music size={16} />, status: 'pending' },
    { id: 'bgm', label: '背景音乐', icon: <Volume2 size={16} />, status: 'pending' },
    { id: 'display', label: '显示适配', icon: <Monitor size={16} />, status: 'pending' },
  ]);
  const [allReady, setAllReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    setIsFullscreen(!!document.fullscreenElement);
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const runChecks = async () => {
      // Check 1: Audio engine
      setChecks(prev => prev.map(c => c.id === 'audio' ? { ...c, status: 'checking' } : c));
      await new Promise(r => setTimeout(r, 400));
      try {
        AudioSystem.init();
        setChecks(prev => prev.map(c => c.id === 'audio' ? { ...c, status: 'ok' } : c));
      } catch {
        setChecks(prev => prev.map(c => c.id === 'audio' ? { ...c, status: 'fail' } : c));
      }

      // Check 2: BGM preload
      setChecks(prev => prev.map(c => c.id === 'bgm' ? { ...c, status: 'checking' } : c));
      await new Promise(r => setTimeout(r, 300));
      try {
        await AudioSystem.loadBGM('/Tides_of_Mahogany.mp3');
        AudioSystem.loadBGM('/Glockenspiel_Sunprint.mp3').catch(() => {});
        setChecks(prev => prev.map(c => c.id === 'bgm' ? { ...c, status: 'ok' } : c));
      } catch {
        setChecks(prev => prev.map(c => c.id === 'bgm' ? { ...c, status: 'fail' } : c));
      }

      // Check 3: Display
      setChecks(prev => prev.map(c => c.id === 'display' ? { ...c, status: 'checking' } : c));
      await new Promise(r => setTimeout(r, 300));
      setChecks(prev => prev.map(c => c.id === 'display' ? { ...c, status: 'ok' } : c));

      setAllReady(true);
    };

    runChecks();
  }, []);

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  };

  const handleEnter = () => {
    AudioSystem.ensureResumed();
    AudioSystem.playBGM();

    // Auto fullscreen on first visit
    if (!isFullscreen) {
      requestFullscreen();
    }

    // Mark as visited
    localStorage.setItem(HAS_VISITED_KEY, 'true');

    setEntering(true);
    setTimeout(onReady, 600);
  };

  return (
    <div className={`absolute inset-0 z-[200] bg-slate-950/95 flex items-center justify-center transition-opacity duration-600 ${entering ? 'opacity-0' : 'opacity-100'}`}>
      <div className="hand-drawn-panel p-10 flex flex-col items-center gap-8 max-w-md w-[90vw] animate-in fade-in zoom-in-95 duration-700">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <img
            src="/title/island-outline.svg"
            alt=""
            className="w-14 h-14 opacity-80 drop-shadow-xl"
          />
          <h2 className="text-2xl hand-drawn-title text-slate-800">环境检查</h2>
        </div>

        {/* Check list */}
        <div className="w-full flex flex-col gap-3">
          {checks.map(c => (
            <div
              key={c.id}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all duration-300 ${
                c.status === 'ok'
                  ? 'border-emerald-600/30 bg-emerald-50/50'
                  : c.status === 'fail'
                  ? 'border-red-400/30 bg-red-50/50'
                  : c.status === 'checking'
                  ? 'border-amber-400/30 bg-amber-50/50'
                  : 'border-slate-300/30 bg-slate-50/30'
              }`}
            >
              <span className={`${
                c.status === 'ok' ? 'text-emerald-600' :
                c.status === 'fail' ? 'text-red-500' :
                c.status === 'checking' ? 'text-amber-500' :
                'text-slate-400'
              }`}>
                {c.icon}
              </span>
              <span className="text-sm font-bold text-slate-700 flex-1">{c.label}</span>
              <span className="w-5 h-5 flex items-center justify-center">
                {c.status === 'ok' && <Check size={14} className="text-emerald-600" />}
                {c.status === 'fail' && <span className="text-xs text-red-500 font-bold">!</span>}
                {c.status === 'checking' && <Loader2 size={14} className="text-amber-500 animate-spin" />}
              </span>
            </div>
          ))}
        </div>

        {/* Fullscreen hint */}
        {!isFullscreen && (
          <button
            onClick={requestFullscreen}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-400/40 text-slate-500 hover:text-slate-700 hover:border-slate-600/50 hover:bg-amber-50/50 transition-all duration-300"
          >
            <Maximize2 size={14} />
            <span className="text-xs font-bold tracking-wider">建议全屏游玩</span>
          </button>
        )}

        {/* Enter button */}
        {allReady && (
          <button
            onClick={handleEnter}
            className="hand-drawn-btn-active px-10 py-3 text-sm font-bold tracking-[0.3em] animate-in fade-in zoom-in-95 duration-500"
          >
            进入岛屿
          </button>
        )}
      </div>
    </div>
  );
};

/** Check if user has visited before (skip loading screen) */
export function hasVisitedBefore(): boolean {
  return localStorage.getItem(HAS_VISITED_KEY) === 'true';
}
