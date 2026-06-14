import React, { useState, useEffect } from 'react';
import { AudioSystem } from '../lib/audio';

interface LoadingScreenProps {
  onReady: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onReady }) => {
  const [loadingState, setLoadingState] = useState<'loading' | 'ready'>('loading');
  const [progress, setProgress] = useState(0);
  const [fadeIn, setFadeIn] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    setFadeIn(true);

    const loadAssets = async () => {
      // Simulate progress for visual feedback while loading BGM
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + Math.random() * 12 + 3;
        });
      }, 300);

      try {
        // Initialize audio context (still suspended until user gesture)
        AudioSystem.init();
        // Preload title BGM
        await AudioSystem.loadBGM('/Tides_of_Mahogany.mp3');
        // Also preload game BGM in background
        AudioSystem.loadBGM('/Glockenspiel_Sunprint.mp3').catch(() => {});
      } catch (e) {
        console.warn('BGM preload failed, continuing without audio:', e);
      }

      clearInterval(progressInterval);
      setProgress(100);
      setLoadingState('ready');

      // Brief pause before showing the enter button
      setTimeout(() => setShowButton(true), 600);
    };

    loadAssets();
  }, []);

  const handleEnter = () => {
    // This click is the user gesture that unlocks AudioContext
    AudioSystem.ensureResumed();
    AudioSystem.playBGM();
    onReady();
  };

  return (
    <div className={`absolute inset-0 z-[200] bg-slate-950 flex items-center justify-center transition-opacity duration-1000 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* Ambient background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${8 + Math.random() * 12}s ease-in-out infinite`,
              animationDelay: `${Math.random() * -10}s`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-8 relative">
        {/* Island outline logo */}
        <div className={`transition-all duration-1500 ${fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <img
            src="/title/island-outline.svg"
            alt=""
            className="w-20 h-20 opacity-80 drop-shadow-2xl"
          />
        </div>

        {/* Title */}
        <div className={`flex flex-col items-center gap-2 transition-all duration-1500 delay-300 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-white/90 text-3xl font-bold tracking-[0.25em] hand-drawn-title">WANDER ISLAND</h1>
          <span className="text-white/40 text-sm tracking-[0.5em] hand-drawn-title">流 浪 岛</span>
        </div>

        {/* Progress bar */}
        <div className={`w-48 flex flex-col items-center gap-3 transition-all duration-700 delay-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-white/30 text-[10px] tracking-[0.3em] uppercase font-mono">
            {loadingState === 'loading' ? 'Loading...' : 'Ready'}
          </span>
        </div>

        {/* Enter button - appears after loading completes */}
        {showButton && (
          <button
            onClick={handleEnter}
            className="group relative mt-4 px-10 py-3.5 border border-white/20 rounded-full text-white/70 hover:text-white hover:border-white/50 transition-all duration-500 animate-in fade-in zoom-in-95"
            style={{ animationDuration: '800ms' }}
          >
            <span className="text-sm tracking-[0.4em] uppercase font-light">Enter</span>
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </button>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.4; }
          75% { transform: translateY(-30px) translateX(8px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
