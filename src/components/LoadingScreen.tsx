import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioSystem } from '../lib/audio';
import { Maximize2 } from 'lucide-react';

interface LoadingScreenProps {
  onReady: () => void;
}

type Phase = 'install' | 'ready';

interface InstallItem {
  id: string;
  label: string;
  sublabel: string;
  status: 'pending' | 'installing' | 'done';
  progress: number;
}

const HAS_VISITED_KEY = 'wander-island-visited';

const BGM_TRACKS = [
  { url: '/Tides_of_Mahogany.mp3', name: 'Tides of Mahogany' },
  { url: '/Glockenspiel_Sunprint.mp3', name: 'Glockenspiel Sunprint' },
  { url: '/The_Architecture_of_Leaves.mp3', name: 'Architecture of Leaves' },
  { url: '/Sakura_Drifting_Down.mp3', name: 'Sakura Drifting Down' },
  { url: '/Lighthouse_Beam.mp3', name: 'Lighthouse Beam' },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onReady }) => {
  const [phase, setPhase] = useState<Phase>('install');
  const [items, setItems] = useState<InstallItem[]>([
    { id: 'engine', label: 'AUDIO ENGINE', sublabel: 'Initializing Web Audio', status: 'pending', progress: 0 },
    { id: 'bgm1', label: 'BGM — TIDES OF MAHOGANY', sublabel: 'Title theme', status: 'pending', progress: 0 },
    { id: 'bgm2', label: 'BGM — GLOCKENSPIEL', sublabel: 'Island theme', status: 'pending', progress: 0 },
    { id: 'bgm3', label: 'BGM — ARCHITECTURE', sublabel: 'Ambient theme', status: 'pending', progress: 0 },
    { id: 'bgm4', label: 'BGM — SAKURA', sublabel: 'Seasonal theme', status: 'pending', progress: 0 },
    { id: 'bgm5', label: 'BGM — LIGHTHOUSE', sublabel: 'Night theme', status: 'pending', progress: 0 },
    { id: 'display', label: 'DISPLAY', sublabel: 'Viewport & rendering', status: 'pending', progress: 0 },
  ]);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [showEnter, setShowEnter] = useState(false);
  const activeIndexRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    setIsFullscreen(!!document.fullscreenElement);
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => { document.removeEventListener('fullscreenchange', onFs); mountedRef.current = false; };
  }, []);

  const updateItem = useCallback((id: string, update: Partial<InstallItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...update } : item));
  }, []);

  // Calculate total progress
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.progress, 0) / items.length;
    setTotalProgress(Math.round(total));
  }, [items]);

  // Sequential installation
  useEffect(() => {
    const runInstall = async () => {
      // Step 1: Audio Engine
      updateItem('engine', { status: 'installing', progress: 10 });
      await delay(300);
      try {
        AudioSystem.init();
        updateItem('engine', { progress: 60 });
        await delay(200);
        updateItem('engine', { progress: 100, status: 'done' });
      } catch {
        updateItem('engine', { progress: 100, status: 'done' });
      }

      // Step 2-6: BGM tracks (parallel download, sequential UI)
      for (let i = 0; i < BGM_TRACKS.length; i++) {
        const track = BGM_TRACKS[i];
        const itemId = `bgm${i + 1}`;
        updateItem(itemId, { status: 'installing', progress: 5 });

        try {
          // Start loading
          const loadPromise = fetch(track.url).then(r => {
            if (!r.ok) throw new Error('fetch failed');
            return r.arrayBuffer();
          });

          // Animate progress while loading
          let prog = 5;
          const progressTimer = setInterval(() => {
            prog = Math.min(prog + Math.random() * 15 + 5, 85);
            updateItem(itemId, { progress: prog });
          }, 200);

          await loadPromise;
          clearInterval(progressTimer);
          updateItem(itemId, { progress: 90 });
          await delay(100);
          updateItem(itemId, { progress: 100, status: 'done' });
        } catch {
          updateItem(itemId, { progress: 100, status: 'done' });
        }
        await delay(80);
      }

      // Also preload via AudioSystem for instant switching later
      AudioSystem.loadBGM('/Tides_of_Mahogany.mp3');
      for (const track of BGM_TRACKS) {
        AudioSystem.preloadBGM(track.url);
      }

      // Step 7: Display
      updateItem('display', { status: 'installing', progress: 20 });
      await delay(200);
      updateItem('display', { progress: 60 });
      await delay(200);
      updateItem('display', { progress: 100, status: 'done' });

      // All done
      setPhase('ready');
      await delay(400);
      if (mountedRef.current) setShowEnter(true);
    };

    runInstall();
  }, [updateItem]);

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  };

  const handleEnter = () => {
    AudioSystem.ensureResumed();
    AudioSystem.playBGM();

    if (!isFullscreen) requestFullscreen();

    localStorage.setItem(HAS_VISITED_KEY, 'true');
    setFadeOut(true);
    setTimeout(onReady, 800);
  };

  return (
    <div
      className={`absolute inset-0 z-[200] bg-[#08090c] flex items-center justify-center select-none
        transition-opacity duration-800 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Subtle ambient gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(30,40,60,0.3) 0%, transparent 70%)',
      }} />

      <div className="relative w-full max-w-lg px-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/title/island-outline.svg" alt="" className="w-8 h-8 opacity-40" />
            <span className="text-white/30 text-[10px] tracking-[0.5em] uppercase font-mono">Wander Island</span>
          </div>
          <span className="text-white/15 text-[10px] tracking-[0.3em] font-mono tabular-nums">
            {String(totalProgress).padStart(3, ' ')}%
          </span>
        </div>

        {/* Thin progress bar */}
        <div className="w-full h-px bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-white/30 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${totalProgress}%` }}
          />
        </div>

        {/* Install list */}
        <div className="flex flex-col gap-[2px] min-h-[280px]">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 py-2 transition-all duration-300 ${
                item.status === 'done' ? 'opacity-40' :
                item.status === 'installing' ? 'opacity-100' : 'opacity-20'
              }`}
            >
              {/* Status indicator */}
              <div className="w-3 flex-shrink-0 flex items-center justify-center">
                {item.status === 'done' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: 'fadeIn 0.3s ease' }} />
                )}
                {item.status === 'installing' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
                )}
                {item.status === 'pending' && (
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                )}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] tracking-[0.15em] font-mono text-white/70 truncate">
                  {item.label}
                </div>
                {item.status === 'installing' && (
                  <div className="text-[9px] tracking-[0.1em] font-mono text-white/25 mt-0.5">
                    {item.sublabel}
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="w-8 flex-shrink-0 text-right">
                <span className="text-[9px] font-mono text-white/20 tabular-nums">
                  {item.status === 'done' ? 'OK' : item.status === 'installing' ? `${Math.round(item.progress)}%` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom area */}
        <div className="flex flex-col items-center gap-4 mt-4 min-h-[80px] justify-end">
          {phase === 'ready' && showEnter && (
            <div className="flex flex-col items-center gap-4" style={{ animation: 'fadeIn 0.8s ease' }}>
              <button
                onClick={handleEnter}
                className="group relative px-12 py-3 text-white/50 hover:text-white/90 transition-all duration-500"
              >
                <span className="text-[11px] tracking-[0.6em] uppercase font-mono">Enter</span>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-white/30 group-hover:w-full transition-all duration-500" />
              </button>

              {!isFullscreen && (
                <button
                  onClick={requestFullscreen}
                  className="flex items-center gap-1.5 text-white/15 hover:text-white/35 transition-colors duration-300"
                >
                  <Maximize2 size={10} />
                  <span className="text-[9px] tracking-[0.2em] font-mono">FULLSCREEN RECOMMENDED</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function hasVisitedBefore(): boolean {
  return localStorage.getItem(HAS_VISITED_KEY) === 'true';
}
