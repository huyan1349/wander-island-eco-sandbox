import { useEffect, useRef, useState } from 'react';
import { useGameStore, WeatherType } from '../../store';
import { Sun, CloudRain, Snowflake, Cloud, CloudFog, CloudLightning } from 'lucide-react';
import { AudioSystem } from '../../lib/audio';

const LABEL: Record<WeatherType, string> = {
  sunny: '晴', cloudy: '多云', rainy: '雨', foggy: '雾', snowy: '雪', stormy: '雷暴',
};

function WeatherIcon({ w, size = 18 }: { w: WeatherType; size?: number }) {
  switch (w) {
    case 'sunny': return <Sun size={size} className="text-amber-400" />;
    case 'cloudy': return <Cloud size={size} className="text-slate-300" />;
    case 'rainy': return <CloudRain size={size} className="text-blue-400" />;
    case 'foggy': return <CloudFog size={size} className="text-slate-400" />;
    case 'snowy': return <Snowflake size={size} className="text-sky-200" />;
    case 'stormy': return <CloudLightning size={size} className="text-purple-400" />;
    default: return <Sun size={size} className="text-amber-400" />;
  }
}

/**
 * 辞的天气预报弹窗：随机天气来临时（store.forecastAlert 被置位）从顶部滑入，
 * 辞向玩家播报当前天气 + 未来几日预报，约 9s 自动淡出。手绘风格，不抢镜。
 */
export function CiForecastAlert() {
  const alert = useGameStore(s => s.forecastAlert);
  const clearForecastAlert = useGameStore(s => s.clearForecastAlert);
  const [visible, setVisible] = useState(false);
  const lastAtRef = useRef(0);

  useEffect(() => {
    if (!alert || alert.at === lastAtRef.current) return;
    lastAtRef.current = alert.at;
    setVisible(true);
    AudioSystem.playPop?.();
    const hide = setTimeout(() => setVisible(false), 9000);
    const clear = setTimeout(() => clearForecastAlert(), 9600);
    return () => { clearTimeout(hide); clearTimeout(clear); };
  }, [alert, clearForecastAlert]);

  if (!alert) return null;

  const close = () => { AudioSystem.playClose?.(); setVisible(false); setTimeout(() => clearForecastAlert(), 300); };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[95] pointer-events-none">
      <div
        className="pointer-events-auto transition-all duration-500"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-16px)' }}
      >
        <div className="relative hand-drawn-panel px-5 py-3.5 shadow-lg flex items-center gap-4" style={{ borderWidth: '2px' }}>
          {/* 辞头像 */}
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-800 shrink-0 shadow-[2px_2px_0_rgba(15,23,42,0.25)]">
            <img src="/ci-avatar.png" alt="辞" className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-600">辞 · 天气预报</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                <WeatherIcon w={alert.weather} size={14} /> {LABEL[alert.weather]}
              </span>
            </div>
            <p className="text-[13px] text-slate-700 leading-snug max-w-[260px]">{alert.line}</p>
            {/* 未来几日 */}
            <div className="flex items-center gap-3 mt-0.5">
              {alert.forecast.slice(0, 3).map((w, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-slate-400">{i === 0 ? '明日' : i === 1 ? '后日' : '大后日'}</span>
                  <WeatherIcon w={w} size={14} />
                </div>
              ))}
            </div>
          </div>

          <button onClick={close} className="absolute top-1.5 right-2 text-slate-400 hover:text-slate-700 transition-colors" title="关闭">
            <span className="text-xs font-bold">✕</span>
          </button>
        </div>
      </div>
    </div>
  );
}
