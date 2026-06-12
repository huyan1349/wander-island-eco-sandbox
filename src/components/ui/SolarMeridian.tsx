import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store';
import { Sun, Moon } from 'lucide-react';

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

  const progress = timeOfDay / 24; // 0 to 1
  const theta = Math.PI * (1 - progress);
  const cx = 140;
  const cy = 60;
  const rx = 130;
  const ry = 50;

  const x = cx + rx * Math.cos(theta);
  const y = cy - ry * Math.sin(theta);

  const isNight = timeOfDay < 6 || timeOfDay > 18;
  const isTwilight = (timeOfDay >= 5 && timeOfDay <= 7) || (timeOfDay >= 17 && timeOfDay <= 19);

  const ticks = Array.from({length: 13}).map((_, i) => i * 2);

  return (
    <div className="absolute top-16 right-12 flex flex-col items-center pointer-events-none z-40 group">
      <div 
        ref={containerRef}
        className="relative w-[280px] h-[100px] pointer-events-auto cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Astrolabe Arc */}
        <svg className="absolute top-0 left-0 w-full h-full drop-shadow-md" overflow="visible">
           <defs>
             <linearGradient id="skyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
               <stop offset="0%" stopColor="#1e293b" /> {/* Midnight */}
               <stop offset="20%" stopColor="#8b5cf6" /> {/* Dawn */}
               <stop offset="30%" stopColor="#f59e0b" /> {/* Morning */}
               <stop offset="50%" stopColor="#fbbf24" /> {/* Noon */}
               <stop offset="70%" stopColor="#f97316" /> {/* Evening */}
               <stop offset="80%" stopColor="#6366f1" /> {/* Dusk */}
               <stop offset="100%" stopColor="#1e293b" /> {/* Midnight */}
             </linearGradient>
           </defs>
           
           {/* Background thick arc */}
           <path 
             d={`M ${cx - rx},${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`} 
             fill="none" 
             stroke="#cbd5e1" 
             strokeWidth="8" 
             strokeLinecap="round"
             className="opacity-50"
           />
           {/* Foreground gradient arc */}
           <path 
             d={`M ${cx - rx},${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`} 
             fill="none" 
             stroke="url(#skyGradient)" 
             strokeWidth="6" 
             strokeLinecap="round"
           />

           {/* Tick marks */}
           {ticks.map(h => {
             const p = h / 24;
             const t = Math.PI * (1 - p);
             const x1 = cx + (rx + 6) * Math.cos(t);
             const y1 = cy - (ry + 6) * Math.sin(t);
             const x2 = cx + (rx + 12) * Math.cos(t);
             const y2 = cy - (ry + 12) * Math.sin(t);
             
             const tx = cx + (rx + 22) * Math.cos(t);
             const ty = cy - (ry + 22) * Math.sin(t);
             
             const isMajor = h % 6 === 0;

             return (
               <g key={h}>
                 <line 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke={isMajor ? "#334155" : "#94a3b8"} 
                    strokeWidth={isMajor ? "3" : "2"} 
                    strokeLinecap="round" 
                 />
                 {isMajor && (
                    <text 
                      x={tx} y={ty} 
                      fill="#475569" 
                      fontSize="10" 
                      fontWeight="bold"
                      fontFamily="monospace" 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      className="tracking-tighter"
                    >
                       {h.toString().padStart(2, '0')}:00
                    </text>
                 )}
               </g>
             )
           })}
        </svg>

        {/* The Celestial Body (Sun/Moon) */}
        <div 
          className={`absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center rounded-full bg-slate-900 border-2 transition-all duration-200 ease-out z-10
            ${isTwilight ? 'border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.6)]' : 
              isNight ? 'border-sky-300 shadow-[0_0_20px_rgba(125,211,252,0.6)]' : 
              'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]'}
          `}
          style={{ 
            left: `${x}px`, 
            top: `${y}px`,
            transform: isDragging ? 'scale(1.25)' : 'scale(1)'
          }}
        >
          {isTwilight ? (
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 animate-pulse" />
          ) : isNight ? (
            <Moon size={20} className="text-sky-200" fill="currentColor" />
          ) : (
            <Sun size={20} className="text-amber-400" fill="currentColor" />
          )}
        </div>
      </div>
      
      {/* Current Time Display */}
      <div className="absolute top-[80px] flex flex-col items-center pointer-events-none transition-transform duration-300 group-hover:-translate-y-2">
        <span className="text-[9px] text-slate-500 font-bold tracking-[0.3em] uppercase mb-1 drop-shadow-sm">LOCAL TIME</span>
        <div className="text-2xl font-mono text-slate-800 font-bold tracking-widest bg-[#fcf8ec] px-5 py-2 rounded-2xl border-2 border-slate-800 shadow-[0_6px_0_rgba(30,41,59,1)]">
          {Math.floor(timeOfDay).toString().padStart(2, '0')}:
          {Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}
