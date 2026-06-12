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

  const maxDays = forecast.length; // Should be 3
  
  const handlePrev = () => setActiveIndex(i => Math.max(0, i - 1));
  const handleNext = () => setActiveIndex(i => Math.min(maxDays, i + 1));

  const isToday = activeIndex === 0;
  const displayWeather = isToday ? weather : forecast[activeIndex - 1];
  const displayTitle = isToday ? "TODAY" : `DAY ${activeIndex}`;

  return (
    <div className="absolute top-56 right-6 z-40 pointer-events-auto flex flex-col items-center">
      <div className="relative flex flex-col items-center justify-center p-5 hand-drawn-panel w-32 h-40">
        
        {/* Navigation Arrows */}
        {activeIndex > 0 && (
          <button onClick={handlePrev} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-800 transition-colors">
            <ChevronLeft size={18} strokeWidth={3} />
          </button>
        )}
        {activeIndex < maxDays && (
          <button onClick={handleNext} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-800 transition-colors">
            <ChevronRight size={18} strokeWidth={3} />
          </button>
        )}

        {/* Content (Using key to force animation on change) */}
        <div key={activeIndex} className="flex flex-col items-center animate-in slide-in-from-bottom-2 fade-in duration-300">
          <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">{displayTitle}</span>
          
          <div className="p-3 my-2 bg-slate-100 rounded-full border-2 border-slate-800 shadow-[0_4px_0_rgba(30,41,59,1)] transition-transform duration-300 hover:-translate-y-1">
            {getWeatherIcon(displayWeather, 28)}
          </div>
          
          <span className="text-slate-800 font-bold text-sm tracking-widest mt-1">{getLabel(displayWeather)}</span>
        </div>
      </div>
      
      {/* Pagination dots */}
      <div className="flex justify-center gap-2 mt-3">
        {Array.from({ length: maxDays + 1 }).map((_, i) => (
          <button 
            key={i} 
            onClick={() => setActiveIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${activeIndex === i ? 'bg-slate-800 scale-125' : 'bg-slate-300 hover:bg-slate-400'}`} 
          />
        ))}
      </div>
    </div>
  );
}
