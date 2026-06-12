import { useState, useRef } from 'react';
import { useGameStore, WeatherType } from '../../store';
import { Sun, CloudRain, Snowflake, Cloud, CloudFog, CloudLightning } from 'lucide-react';

export function WeatherForecast() {
  const weather = useGameStore(state => state.weather);
  const forecast = useGameStore(state => state.forecast);
  const advanceDay = useGameStore(state => state.advanceDay);
  const setTimeOfDay = useGameStore(state => state.setTimeOfDay);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const getWeatherIcon = (w: WeatherType, size = 20) => {
    switch (w) {
      case 'sunny': return <Sun size={size} className="text-amber-400 drop-shadow-md" />;
      case 'cloudy': return <Cloud size={size} className="text-slate-300 drop-shadow-md" />;
      case 'rainy': return <CloudRain size={size} className="text-blue-400 drop-shadow-md" />;
      case 'foggy': return <CloudFog size={size} className="text-slate-400 drop-shadow-md" />;
      case 'snowy': return <Snowflake size={size} className="text-sky-200 drop-shadow-md" />;
      case 'stormy': return <CloudLightning size={size} className="text-purple-400 drop-shadow-md" />;
      default: return <Sun size={size} className="text-amber-400" />;
    }
  };

  const getLabel = (w: WeatherType) => {
    switch (w) {
      case 'sunny': return '晴朗';
      case 'cloudy': return '多云';
      case 'rainy': return '阵雨';
      case 'foggy': return '浓雾';
      case 'snowy': return '大雪';
      case 'stormy': return '雷暴';
      default: return '未知';
    }
  };

  const cards = [
    { label: 'TODAY', w: weather },
    ...forecast.slice(0, 3).map((w, i) => ({ label: `DAY ${i + 1}`, w }))
  ];

  const handleNext = () => {
    if (isDragging) return;
    setActiveIndex(prev => (prev + 1) % cards.length);
  };

  const handlePointerDown = (e: React.PointerEvent, isTop: boolean) => {
    if (!isTop) return;
    e.stopPropagation(); // prevent handleNext from firing immediately
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragPos({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent, isTop: boolean) => {
    if (!isTop) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // If dragged to the left more than 250px (towards center screen)
    if (dragPos.x < -250 && activeIndex > 0) {
      for (let i = 0; i < activeIndex; i++) {
        advanceDay();
      }
      setTimeOfDay(8); // Set time to 08:00 morning of that day
      setActiveIndex(0);
    }
    
    // If it was just a click (dragPos is small), trigger handleNext
    if (Math.abs(dragPos.x) < 10 && Math.abs(dragPos.y) < 10) {
      handleNext();
    }
    
    setDragPos({ x: 0, y: 0 });
  };

  return (
    <div className="absolute top-56 right-10 z-40 pointer-events-auto flex flex-col items-center group">
      {/* The Stacked Card Deck */}
      <div className="relative w-32 h-40">
        {cards.map((card, idx) => {
          let offset = idx - activeIndex;
          if (offset < 0) offset += cards.length;

          const isTop = offset === 0;
          
          let transformStyle = `translateY(${offset * 12}px) translateX(${offset * 6}px) rotate(${offset * 5}deg) scale(${1 - offset * 0.05})`;
          if (isTop && isDragging) {
            transformStyle = `translate(${dragPos.x}px, ${dragPos.y}px) rotate(${dragPos.x * 0.05}deg) scale(1.1)`;
          }

          return (
            <div 
              key={idx} 
              onPointerDown={(e) => handlePointerDown(e, isTop)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, isTop)}
              className={`absolute inset-0 flex flex-col items-center justify-center p-5 hand-drawn-panel ease-[cubic-bezier(0.34,1.56,0.64,1)]
                ${isTop ? 'cursor-grab active:cursor-grabbing hover:-translate-y-2 hover:shadow-xl' : 'cursor-pointer'}
                ${(!isDragging && isTop) || !isTop ? 'transition-all duration-500' : ''}
              `}
              style={{
                transform: transformStyle,
                zIndex: isTop && isDragging ? 50 : 40 - offset,
                opacity: 1 - offset * 0.2,
              }}
            >
              <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">{card.label}</span>
              
              <div className="p-3 my-2 bg-slate-100 rounded-full border-2 border-slate-800 shadow-[0_4px_0_rgba(30,41,59,1)]">
                {getWeatherIcon(card.w, 28)}
              </div>
              
              <span className="text-slate-800 font-bold text-sm tracking-widest mt-1">{getLabel(card.w)}</span>
            </div>
          );
        })}
      </div>
      
      <span className="text-slate-400 font-bold text-[10px] tracking-widest mt-8 opacity-0 group-hover:opacity-100 transition-opacity">拖拽卡片至屏幕中央应用</span>
    </div>
  );
}
