import { useState } from 'react';
import { useGameStore, WeatherType } from '../../store';
import { Sun, CloudRain, Snowflake, Cloud, CloudFog, CloudLightning, ChevronLeft, ChevronRight } from 'lucide-react';

export function WeatherForecast() {
  const weather = useGameStore(state => state.weather);
  const forecast = useGameStore(state => state.forecast);
  const [activeIndex, setActiveIndex] = useState(0);

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
    setActiveIndex(prev => (prev + 1) % cards.length);
  };

  return (
    <div className="absolute top-56 right-10 z-40 pointer-events-auto flex flex-col items-center group">
      {/* The Stacked Card Deck */}
      <div 
        className="relative w-32 h-40 cursor-pointer"
        onClick={handleNext}
      >
        {cards.map((card, idx) => {
          // Determine relative position
          let offset = idx - activeIndex;
          
          // If the card is "before" the active one, we wrap it around to the bottom of the deck visually,
          // OR we can just let it fly off. Wrapping around is better so the user can cycle endlessly.
          if (offset < 0) {
            offset += cards.length;
          }

          // offset 0 = top card
          // offset 1 = second card underneath
          // offset 2 = third card underneath
          // offset 3 = fourth card (hidden or at bottom)

          const isTop = offset === 0;
          
          return (
            <div 
              key={idx} 
              className={`absolute inset-0 flex flex-col items-center justify-center p-5 hand-drawn-panel transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                ${isTop ? 'hover:-translate-y-2 hover:shadow-xl' : ''}
              `}
              style={{
                transform: `translateY(${offset * 12}px) translateX(${offset * 6}px) rotate(${offset * 5}deg) scale(${1 - offset * 0.05})`,
                zIndex: 40 - offset,
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
      
      <span className="text-slate-400 font-bold text-[10px] tracking-widest mt-8 opacity-0 group-hover:opacity-100 transition-opacity">点击切换</span>
    </div>
  );
}
