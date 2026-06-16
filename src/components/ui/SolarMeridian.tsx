import { useState, useRef } from 'react';
import { useGameStore } from '../../store';
import { Sun, Moon } from 'lucide-react';

export function SolarMeridian() {
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const setTimeOfDay = useGameStore(state => state.setTimeOfDay);
  const setIsTimeScrubbing = useGameStore(state => state.setIsTimeScrubbing);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cx = 130;
  const cy = 130;
  const R = 90;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setIsTimeScrubbing(true);
    updateTimeFromPointer(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateTimeFromPointer(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsTimeScrubbing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const updateTimeFromPointer = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const center_x = rect.left + cx;
    const center_y = rect.top + cy;
    
    const dx = clientX - center_x;
    const dy = clientY - center_y;

    // Keep the interaction on the visible upper semicircle only.
    let angle = Math.atan2(-dy, dx);
    if (angle < 0) {
      angle = dx > 0 ? 0 : Math.PI;
    }

    const newTime = 24 * (1 - angle / Math.PI);
    setTimeOfDay(newTime);
  };

  const progress = timeOfDay / 24; 
  const theta = Math.PI * (1 - progress);
  const x = cx + R * Math.cos(theta);
  const y = cy - R * Math.sin(theta);

  const isNight = timeOfDay < 6 || timeOfDay > 18;
  const ticks = [0, 4, 8, 12, 16, 20, 24]; 

  return (
    <div className="absolute top-8 right-6 flex flex-col items-center pointer-events-none z-40">
      
      {/* Sundial Panel (Transparent) */}
      <div 
        ref={containerRef}
        className="relative w-[260px] h-[150px] pointer-events-auto cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Sketchy Sundial SVG */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none drop-shadow-sm" overflow="visible">
           {/* Outer rims */}
           <path d={`M ${cx - R},${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="#ffffff" strokeWidth="3" />
           <path d={`M ${cx - R - 6},${cy + 2} A ${R+6} ${R+6} 0 0 1 ${cx + R + 6} ${cy + 2}`} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
           
           {/* Inner rim */}
           <path d={`M ${cx - 20},${cy} A 20 20 0 0 1 ${cx + 20} ${cy}`} fill="none" stroke="#ffffff" strokeWidth="3" />
           
           {/* Base line */}
           <line x1={15} y1={cy} x2={245} y2={cy} stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
           <line x1={15} y1={cy + 4} x2={245} y2={cy + 4} stroke="#ffffff" strokeWidth="1" strokeDasharray="8 6" opacity="0.4" />

           {/* Radial Ticks */}
           {ticks.map(h => {
             const t = Math.PI * (1 - h / 24);
             const x1 = cx + 20 * Math.cos(t);
             const y1 = cy - 20 * Math.sin(t);
             const x2 = cx + R * Math.cos(t);
             const y2 = cy - R * Math.sin(t);
             
             // Text position slightly outside
             const tx = cx + (R + 18) * Math.cos(t);
             const ty = cy - (R + 18) * Math.sin(t);

             return (
               <g key={h}>
                 <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
                 <text x={tx} y={ty} fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                   {h}
                 </text>
               </g>
             )
           })}
           
           {/* The Pointer (Gnomon Hand) */}
           <line x1={cx} y1={cy} x2={x} y2={y} stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
           <circle cx={cx} cy={cy} r="8" fill="#fcf8ec" stroke="#ffffff" strokeWidth="3" />
           <circle cx={cx} cy={cy} r="3" fill="#ffffff" />
        </svg>

        {/* Chunky Hand-drawn Celestial Body Token */}
        <div 
          className={`absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center rounded-full bg-[#fcf8ec] border-[3px] border-slate-800 transition-shadow duration-100 ease-out`}
          style={{ 
            left: `${x}px`, 
            top: `${y}px`,
            transform: isDragging ? 'scale(1.15)' : 'scale(1)',
            boxShadow: isDragging ? '0 8px 0 rgba(30,41,59,1)' : '0 4px 0 rgba(30,41,59,1)'
          }}
        >
          {isNight ? (
            <Moon size={22} className="text-slate-800" strokeWidth={2.5} />
          ) : (
            <Sun size={22} className="text-slate-800" strokeWidth={2.5} />
          )}
        </div>
      </div>
      
      {/* Current Time Display */}
      <div className="pointer-events-none relative z-10">
        <div className="px-6 py-1.5 bg-[#fcf8ec] border-[3px] border-slate-800 text-slate-800 font-mono font-black text-xl shadow-[4px_4px_0_rgba(30,41,59,1)] rotate-[-1deg]">
          {Math.floor(timeOfDay).toString().padStart(2, '0')}:
          {Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}
