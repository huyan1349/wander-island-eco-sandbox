import React, { useState, useEffect, useCallback } from 'react';
import { AudioSystem } from '../lib/audio';

interface LoadingScreenProps {
  onReady: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onReady }) => {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    const loadAssets = async () => {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 75) {
            clearInterval(progressInterval);
            return 75;
          }
          return prev + Math.random() * 8 + 3;
        });
      }, 300);

      try {
        AudioSystem.init();
        await AudioSystem.loadBGM('/Tides_of_Mahogany.mp3');
        AudioSystem.loadBGM('/Glockenspiel_Sunprint.mp3').catch(() => {});
      } catch (e) {
        console.warn('BGM preload failed:', e);
      }

      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => setReady(true), 600);
    };

    loadAssets();
  }, []);

  const handleClick = useCallback(() => {
    if (!ready || fadeOut) return;
    AudioSystem.ensureResumed();
    AudioSystem.playBGM();
    setFadeOut(true);
    setTimeout(onReady, 1200);
  }, [ready, fadeOut, onReady]);

  return (
    <div
      onClick={handleClick}
      className={`absolute inset-0 z-[200] bg-[#0a0e17] flex items-center justify-center cursor-pointer select-none overflow-hidden
        transition-opacity duration-[1200ms] ease-out ${fadeOut ? 'opacity-0' : 'opacity-100'}
        ${mounted ? '' : 'opacity-0'}`}
    >
      {/* Sky gradient — deep night ocean */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #0a0e17 0%, #0d1520 30%, #111d2e 55%, #0f1a28 70%, #0a1018 100%)',
      }} />

      {/* Stars — tiny distant lights */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              width: `${0.5 + Math.random() * 1.2}px`,
              height: `${0.5 + Math.random() * 1.2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 45}%`,
              opacity: 0.15 + Math.random() * 0.25,
              animation: `twinkle ${3 + Math.random() * 5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * -8}s`,
            }}
          />
        ))}
      </div>

      {/* Ocean surface — horizontal shimmer lines */}
      <div className="absolute bottom-0 left-0 right-0 h-[45%] pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`wave-${i}`}
            className="absolute w-full"
            style={{
              bottom: `${5 + i * 8}%`,
              height: '1px',
              background: `linear-gradient(90deg, transparent 5%, rgba(120,160,200,${0.015 + i * 0.004}) 25%, rgba(140,180,220,${0.025 + i * 0.005}) 50%, rgba(120,160,200,${0.015 + i * 0.004}) 75%, transparent 95%)`,
              animation: `drift ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * -2}s`,
            }}
          />
        ))}
        {/* Subtle moon reflection column */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-32 h-full" style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(180,200,230,0.015) 40%, rgba(180,200,230,0.03) 100%)',
          filter: 'blur(20px)',
        }} />
      </div>

      {/* Island silhouette — distant, mysterious */}
      <div className="absolute bottom-[38%] left-1/2 -translate-x-1/2 pointer-events-none" style={{ opacity: ready ? 0.6 : 0.3, transition: 'opacity 2s ease' }}>
        <img
          src="/title/island-outline.svg"
          alt=""
          className="w-24 h-24"
          style={{
            filter: 'brightness(0.4) blur(0.5px)',
            animation: 'breathe 6s ease-in-out infinite',
          }}
        />
      </div>

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-5 z-10">
        {/* Title — very subtle, like a distant sign */}
        <div className="flex flex-col items-center gap-1" style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <h1 className="text-white/50 text-xl font-light tracking-[0.4em]" style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 100 }}>
            WANDER ISLAND
          </h1>
          <span className="text-white/20 text-[10px] tracking-[0.8em] hand-drawn-title">流 浪 岛</span>
        </div>

        {/* Status area — loading or prompt */}
        <div className="h-16 flex flex-col items-center justify-center">
          {!ready ? (
            <div className="flex flex-col items-center gap-3" style={{
              opacity: mounted ? 1 : 0,
              transition: 'opacity 1s ease 0.5s',
            }}>
              {/* Minimal progress — just a thin line growing */}
              <div className="w-28 h-px bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/20 rounded-full"
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                    transition: 'width 0.4s ease-out',
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4" style={{
              animation: 'fadeInSoft 1.5s ease-out forwards',
            }}>
              {/* Water ripple — the only interactive cue */}
              <div className="relative flex items-center justify-center" style={{ width: 60, height: 60 }}>
                <div className="absolute w-full h-full rounded-full border border-white/[0.06]" style={{ animation: 'ripple 3s ease-out infinite' }} />
                <div className="absolute w-full h-full rounded-full border border-white/[0.04]" style={{ animation: 'ripple 3s ease-out infinite 1s' }} />
                <div className="absolute w-full h-full rounded-full border border-white/[0.03]" style={{ animation: 'ripple 3s ease-out infinite 2s' }} />
                {/* Center dot — like a moon reflection on water */}
                <div className="w-1.5 h-1.5 rounded-full bg-white/30" style={{ animation: 'breathe 3s ease-in-out infinite' }} />
              </div>
              {/* Prompt — barely visible, like a whisper */}
              <span className="text-white/20 text-[9px] tracking-[0.6em] font-light" style={{
                fontFamily: "'Raleway', sans-serif",
                animation: 'breathe 4s ease-in-out infinite',
              }}>
                触碰海面
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.5; }
        }
        @keyframes drift {
          0%, 100% { transform: translateX(-2%); opacity: 0.6; }
          50% { transform: translateX(2%); opacity: 1; }
        }
        @keyframes ripple {
          0% { transform: scale(0.3); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes fadeInSoft {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
