import React, { useState, useEffect } from 'react';
import { AudioSystem } from '../lib/audio';

interface LoadingScreenProps {
  onReady: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onReady }) => {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const loadAssets = async () => {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80;
          }
          return prev + Math.random() * 10 + 4;
        });
      }, 250);

      try {
        AudioSystem.init();
        await AudioSystem.loadBGM('/Tides_of_Mahogany.mp3');
        AudioSystem.loadBGM('/Glockenspiel_Sunprint.mp3').catch(() => {});
      } catch (e) {
        console.warn('BGM preload failed:', e);
      }

      clearInterval(progressInterval);
      setProgress(100);
      // Small delay for the progress bar to reach 100% visually
      setTimeout(() => setReady(true), 500);
    };

    loadAssets();
  }, []);

  const handleClick = () => {
    if (!ready) return;
    AudioSystem.ensureResumed();
    AudioSystem.playBGM();
    setFadeOut(true);
    setTimeout(onReady, 800);
  };

  return (
    <div
      onClick={handleClick}
      className={`absolute inset-0 z-[200] bg-slate-950 flex items-center justify-center cursor-pointer select-none transition-opacity duration-800 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Ocean shimmer — subtle horizontal lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-1/3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-px"
              style={{
                bottom: `${8 + i * 12}%`,
                background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,${0.02 + i * 0.005}) 30%, rgba(255,255,255,${0.03 + i * 0.005}) 50%, rgba(255,255,255,${0.02 + i * 0.005}) 70%, transparent 100%)`,
                animation: `shimmer ${6 + i * 1.5}s ease-in-out infinite`,
                animationDelay: `${i * -1.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Floating motes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${1.5 + Math.random() * 2.5}px`,
              height: `${1.5 + Math.random() * 2.5}px`,
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 60}%`,
              background: `rgba(255,255,255,${0.15 + Math.random() * 0.15})`,
              animation: `mote ${10 + Math.random() * 15}s ease-in-out infinite`,
              animationDelay: `${Math.random() * -12}s`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 relative">
        {/* Island outline — breathing glow */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-xl"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
              animation: 'breathe 4s ease-in-out infinite',
            }}
          />
          <img
            src="/title/island-outline.svg"
            alt=""
            className="w-16 h-16 opacity-70 relative"
            style={{ animation: 'breathe 4s ease-in-out infinite' }}
          />
        </div>

        {/* Title */}
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-white/80 text-2xl font-bold tracking-[0.3em] hand-drawn-title">WANDER ISLAND</h1>
          <span className="text-white/30 text-xs tracking-[0.6em] hand-drawn-title">流 浪 岛</span>
        </div>

        {/* Progress / Prompt area */}
        <div className="h-12 flex flex-col items-center justify-center">
          {!ready ? (
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-36 h-[1.5px] bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/40 rounded-full transition-all duration-400 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-white/20 text-[9px] tracking-[0.4em] uppercase font-mono">
                loading
              </span>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-3 animate-in fade-in duration-1000"
            >
              {/* Ripple ring — the natural "touch me" cue */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-white/15" style={{ animation: 'ripple 2.5s ease-out infinite' }} />
                <div className="absolute inset-0 rounded-full border border-white/10" style={{ animation: 'ripple 2.5s ease-out infinite 0.8s' }} />
                <div className="w-2 h-2 rounded-full bg-white/40" style={{ animation: 'breathe 2s ease-in-out infinite' }} />
              </div>
              <span className="text-white/35 text-[10px] tracking-[0.5em] font-light" style={{ animation: 'breathe 3s ease-in-out infinite' }}>
                触碰海面
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.3; transform: translateX(-3%); }
          50% { opacity: 0.7; transform: translateX(3%); }
        }
        @keyframes mote {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          25% { transform: translateY(-15px) translateX(5px); opacity: 0.5; }
          50% { transform: translateY(-8px) translateX(-3px); opacity: 0.3; }
          75% { transform: translateY(-22px) translateX(4px); opacity: 0.4; }
        }
        @keyframes ripple {
          0% { transform: scale(0.6); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
