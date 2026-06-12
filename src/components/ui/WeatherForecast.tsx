import { useGameStore, WeatherType } from '../../store';
import { Sun, CloudRain, Snowflake, Cloud, CloudFog, CloudLightning } from 'lucide-react';

export function WeatherForecast() {
  const weather = useGameStore(state => state.weather);
  const forecast = useGameStore(state => state.forecast);

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

  return (
    <div className="absolute top-56 right-6 z-40 pointer-events-auto">
      <div className="flex flex-col items-center gap-4 p-4 hand-drawn-panel min-w-[120px]">
        
        {/* Current Weather */}
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-slate-100 rounded-full border-2 border-slate-800 shadow-sm">
            {getWeatherIcon(weather, 28)}
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-800 font-bold text-sm tracking-widest">{getLabel(weather)}</span>
            <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mt-0.5">当前天气</span>
          </div>
        </div>

        <div className="w-full h-px bg-slate-300" />

        {/* Forecast */}
        <div className="flex justify-between items-center w-full px-1">
          {forecast.slice(0, 3).map((w, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-default">
              <span className="text-[10px] text-slate-500 font-mono font-bold tracking-widest">D{i+1}</span>
              {getWeatherIcon(w, 16)}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
