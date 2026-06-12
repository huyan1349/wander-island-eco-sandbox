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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
      <div className="flex items-center gap-6 px-6 py-3 bg-slate-900/40 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
        
        {/* Current Weather */}
        <div className="flex items-center gap-3 pr-6 border-r border-white/10">
          <div className="p-2 bg-white/10 rounded-full">
            {getWeatherIcon(weather, 24)}
          </div>
          <div className="flex flex-col">
            <span className="text-white/50 text-[10px] font-bold tracking-widest uppercase">当前天气</span>
            <span className="text-white font-medium text-sm tracking-widest">{getLabel(weather)}</span>
          </div>
        </div>

        {/* Forecast */}
        <div className="flex items-center gap-6">
          {forecast.slice(0, 3).map((w, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-default">
              <span className="text-[10px] text-white/40 font-mono tracking-widest">DAY {i+1}</span>
              {getWeatherIcon(w, 18)}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
