import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store';
import { Sun, Moon, CloudRain, CloudSnow, Cloud, CloudFog, CloudLightning } from 'lucide-react';

export function SolarMeridian() {
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const setTimeOfDay = useGameStore(state => state.setTimeOfDay);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateTimeFromPointer(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateTimeFromPointer(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const updateTimeFromPointer = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let normalized = (clientX - rect.left) / rect.width;
    normalized = Math.max(0, Math.min(1, normalized));
    setTimeOfDay(normalized * 24);
  };

  // Convert timeOfDay (0-24) to a position along an arc.
  // We'll treat 6:00 to 18:00 as the top half (day), and 18:00 to 6:00 as the bottom half (night).
  // But visually, we can just show a single arc and switch the icon, 
  // or a full ellipse. Let's do a single shallow arc that represents 0-24.
  const arcHeight = 30; // Max height of the arc
  const progress = timeOfDay / 24; // 0 to 1
  const x = progress * 100; // %
  const y = Math.sin(progress * Math.PI) * arcHeight; // Pixel offset upwards

  const isNight = timeOfDay < 6 || timeOfDay > 18;

  return (
    <div className="absolute top-24 right-6 flex flex-col items-end pointer-events-none z-40">
      <div 
        ref={containerRef}
        className="relative w-64 h-16 pointer-events-auto cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* The Arc Track */}
        <svg className="absolute top-0 left-0 w-full h-full" overflow="visible">
           <path 
             d={`M 0,40 Q 128,10 256,40`} 
             fill="none" 
             stroke="rgba(30, 41, 59, 0.4)" 
             strokeWidth="2" 
             strokeDasharray="4 4"
           />
        </svg>

        {/* Time Markers */}
        <div className="absolute top-10 left-0 text-[10px] text-slate-500 font-mono -translate-x-1/2">00:00</div>
        <div className="absolute top-5 left-1/4 text-[10px] text-slate-500 font-mono -translate-x-1/2">06:00</div>
        <div className="absolute top-2 left-1/2 text-[10px] text-slate-500 font-mono -translate-x-1/2">12:00</div>
        <div className="absolute top-5 left-3/4 text-[10px] text-slate-500 font-mono -translate-x-1/2">18:00</div>
        <div className="absolute top-10 right-0 text-[10px] text-slate-500 font-mono translate-x-1/2">24:00</div>

        {/* The Celestial Body (Sun/Moon) */}
        <div 
          className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center rounded-full hand-drawn-panel transition-transform"
          style={{ 
            left: `${x}%`, 
            top: `calc(40px - ${y}px)`,
            transform: isDragging ? 'scale(1.2)' : 'scale(1)'
          }}
        >
          {isNight ? (
            <Moon size={16} className="text-slate-800" />
          ) : (
            <Sun size={16} className="text-slate-800" />
          )}
        </div>
      </div>
      
      {/* Current Time Display */}
      <div className="mt-2 text-slate-800 font-mono text-sm tracking-widest font-bold hand-drawn-panel px-4 py-1.5 rounded-xl">
        {Math.floor(timeOfDay).toString().padStart(2, '0')}:
        {Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0')}
      </div>
    </div>
  );
}
