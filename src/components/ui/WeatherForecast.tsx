import { useState, useRef, useEffect } from 'react';
import { useGameStore, WeatherType } from '../../store';
import { Sun, CloudRain, Snowflake, Cloud, CloudFog, CloudLightning, Music, CloudSun, LayoutGrid } from 'lucide-react';
import { AudioSystem } from '../../lib/audio';
import { MusicLibrary } from './MusicLibrary';

// 曲目列表：以后拖更多歌进来，只需往 public 放 mp3 并在此加一行。
// bg = 结合曲风的高级叠底背景（多层渐变）。
const TRACKS = [
  {
    title: 'Tides of Mahogany',
    url: '/Tides_of_Mahogany.mp3',
    bg: 'radial-gradient(ellipse at 30% 120%, rgba(180,83,9,0.45), transparent 60%), linear-gradient(160deg, rgba(217,119,6,0.18), rgba(120,53,15,0.05))',
  },
  {
    title: 'Glockenspiel Sunprint',
    url: '/Glockenspiel_Sunprint.mp3',
    bg: 'radial-gradient(circle at 50% 22%, rgba(251,191,36,0.5), transparent 65%), linear-gradient(180deg, rgba(254,243,199,0.22), transparent)',
  },
  {
    title: 'The Architecture of Leaves',
    url: '/The_Architecture_of_Leaves.mp3',
    bg: 'radial-gradient(ellipse at 72% 8%, rgba(132,204,22,0.42), transparent 60%), linear-gradient(160deg, rgba(22,101,52,0.16), rgba(20,83,45,0.05))',
  },
  {
    title: 'Sakura Drifting Down',
    url: '/Sakura_Drifting_Down.mp3',
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(251,207,232,0.55), transparent 65%), linear-gradient(160deg, rgba(244,114,182,0.18), rgba(219,39,119,0.05))',
  },
  {
    title: 'Lighthouse Beam',
    url: '/Lighthouse_Beam.mp3',
    bg: 'radial-gradient(circle at 50% 18%, rgba(254,240,138,0.5), transparent 60%), linear-gradient(180deg, rgba(248,250,252,0.15), rgba(30,58,138,0.12))',
  },
];

export function WeatherForecast() {
  const weather = useGameStore(state => state.weather);
  const forecast = useGameStore(state => state.forecast);

  const [mode, setMode] = useState<'weather' | 'music'>('weather');
  const [showLibrary, setShowLibrary] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 播放进度（仅音乐模式轮询）
  const [progress, setProgress] = useState(0);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  useEffect(() => {
    if (mode !== 'music') return;
    const id = setInterval(() => {
      setProgress(AudioSystem.getBGMProgress());
      setPlayingUrl(AudioSystem.getCurrentBGMUrl());
    }, 250);
    return () => clearInterval(id);
  }, [mode]);

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

  // 针对每首歌曲风绘制的高级纹理（叠在渐变之上）
  const renderTexture = (idx: number) => {
    if (idx === 0) {
      // 潮汐红木：层叠水波纹
      return (
        <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {[24, 42, 60, 78, 96].map((y, i) => (
            <path key={i} d={`M-5,${y} Q12,${y - 7} 30,${y} T65,${y} T100,${y} T135,${y}`} fill="none" stroke="#9a3412" strokeWidth="1.1" strokeLinecap="round" opacity={0.45 - i * 0.05} />
          ))}
        </svg>
      );
    }
    if (idx === 1) {
      // 钟琴阳光：顶部放射光线 + 光点
      return (
        <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {Array.from({ length: 9 }).map((_, i) => {
            const ang = (-64 + i * 16) * Math.PI / 180;
            return <line key={i} x1="50" y1="16" x2={50 + Math.sin(ang) * 95} y2={16 + Math.cos(ang) * 125} stroke="#d97706" strokeWidth="0.7" opacity="0.32" />;
          })}
          <circle cx="50" cy="16" r="3" fill="#f59e0b" opacity="0.5" />
        </svg>
      );
    }
    if (idx === 2) {
      // 叶之建筑：对称叶脉
      return (
        <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path d="M50,8 L50,116" stroke="#3f6212" strokeWidth="1" fill="none" opacity="0.4" />
          {[20, 35, 50, 65, 80, 98].map((y, i) => (
            <g key={i} opacity={0.34}>
              <path d={`M50,${y} L${50 - 28},${y + 14}`} stroke="#4d7c0f" strokeWidth="0.8" fill="none" />
              <path d={`M50,${y} L${50 + 28},${y + 14}`} stroke="#4d7c0f" strokeWidth="0.8" fill="none" />
            </g>
          ))}
        </svg>
      );
    }
    if (idx === 3) {
      // 樱花飘落：散落的五瓣樱花
      const flower = (cx: number, cy: number, s: number, key: number) => (
        <g key={key} opacity={0.5}>
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse key={i} cx={cx} cy={cy - s} rx={s * 0.45} ry={s * 0.75} fill="#f9a8d4" transform={`rotate(${i * 72} ${cx} ${cy})`} />
          ))}
          <circle cx={cx} cy={cy} r={s * 0.3} fill="#fbcfe8" />
        </g>
      );
      return (
        <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {flower(26, 28, 6, 1)}
          {flower(72, 50, 5, 2)}
          {flower(44, 82, 6.5, 3)}
          {flower(82, 104, 4.5, 4)}
          {flower(16, 70, 4, 5)}
        </svg>
      );
    }
    // 灯塔之光：绕灯顶旋转扫射的光锥 + 明灭灯泡（动态）
    return (
      <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="lhBeam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="50,46 16,-34 84,-34" fill="url(#lhBeam)">
          <animateTransform attributeName="transform" type="rotate" values="-40 50 46;40 50 46;-40 50 46" dur="6s" repeatCount="indefinite" />
        </polygon>
        <path d="M44,116 L46,54 L54,54 L56,116 Z" fill="#475569" opacity="0.55" />
        <rect x="45" y="42" width="10" height="13" rx="1" fill="#64748b" opacity="0.6" />
        <circle cx="50" cy="48" r="3" fill="#fde047">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  };

  const cards: any[] = mode === 'weather'
    ? [{ label: 'TODAY', w: weather }, ...forecast.slice(0, 3).map((w, i) => ({ label: `DAY ${i + 1}`, w }))]
    : TRACKS.map((t, i) => ({ label: `TRACK ${i + 1}`, title: t.title, url: t.url, bg: t.bg }));

  const handleNext = () => {
    setActiveIndex(prev => (prev + 1) % cards.length);
  };

  const switchMode = (m: 'weather' | 'music') => {
    setMode(m);
    setActiveIndex(0);
    setDragPos({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent, isTop: boolean) => {
    if (!isTop) return;
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

    // 轻点：天气=翻卡预览，音乐=切到下一首并播放
    if (Math.abs(dragPos.x) < 15 && Math.abs(dragPos.y) < 15) {
      if (mode === 'music') {
        const next = (activeIndex + 1) % cards.length;
        AudioSystem.switchBGM(TRACKS[next].url);
        setActiveIndex(next);
      } else {
        handleNext();
      }
      setDragPos({ x: 0, y: 0 });
      return;
    }

    // 天气模式：向左拖到屏幕中央 → 时间快进到目标日
    if (mode === 'weather' && dragPos.x < -200 && activeIndex > 0) {
      const daysToAdvance = activeIndex;
      const currentT = useGameStore.getState().timeOfDay;
      const targetTotalTime = currentT + (24 - currentT) + (daysToAdvance - 1) * 24 + 8;

      let scrubbedTime = currentT;
      const durationMs = 1500;
      const startMs = performance.now();

      setActiveIndex(0);

      const animate = (time: number) => {
        const elapsed = time - startMs;
        const progress2 = Math.min(1, elapsed / durationMs);
        const ease = progress2 < 0.5 ? 2 * progress2 * progress2 : 1 - Math.pow(-2 * progress2 + 2, 2) / 2;
        const newTotalTime = currentT + (targetTotalTime - currentT) * ease;
        const dayCrossings = Math.floor(newTotalTime / 24) - Math.floor(scrubbedTime / 24);
        for (let i = 0; i < dayCrossings; i++) {
          useGameStore.getState().advanceDay();
        }
        scrubbedTime = newTotalTime;
        useGameStore.getState().setTimeOfDay(scrubbedTime % 24);
        if (progress2 < 1) {
          requestAnimationFrame(animate);
        } else {
          useGameStore.getState().setTimeOfDay(8);
        }
      };
      requestAnimationFrame(animate);
    }

    setDragPos({ x: 0, y: 0 });
  };

  return (
    <div id="guide-music" className="absolute bottom-6 left-10 z-40 pointer-events-auto flex flex-col items-center group">
      {/* 模式切换：天气 / 音乐（沿用 hand-drawn 风格） */}
      <div className="flex gap-1 mb-3 hand-drawn-panel p-1 rounded-full">
        <button
          onClick={() => switchMode('weather')}
          className={`p-2 rounded-full transition-all ${mode === 'weather' ? 'bg-slate-800 text-white shadow-[0_2px_0_rgba(30,41,59,1)]' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <CloudSun size={16} />
        </button>
        <button
          onClick={() => switchMode('music')}
          className={`p-2 rounded-full transition-all ${mode === 'music' ? 'bg-slate-800 text-white shadow-[0_2px_0_rgba(30,41,59,1)]' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <Music size={16} />
        </button>
        {mode === 'music' && (
          <button
            onClick={() => setShowLibrary(true)}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 transition-all"
            title="展开音乐收藏库"
          >
            <LayoutGrid size={16} />
          </button>
        )}
      </div>

      {showLibrary && <MusicLibrary onClose={() => setShowLibrary(false)} />}

      {/* 堆叠卡片牌组 */}
      <div className="relative w-32 h-40">
        {cards.map((card: any, idx) => {
          let offset = idx - activeIndex;
          if (offset < 0) offset += cards.length;

          const isTop = offset === 0;
          const isPlaying = mode === 'music' && card.url === playingUrl;

          let transformStyle = `translateY(${offset * 12}px) translateX(${offset * 6}px) rotate(${offset * 5}deg) scale(${1 - offset * 0.05})`;
          if (isTop && isDragging) {
            transformStyle = `translate(${dragPos.x}px, ${dragPos.y}px) rotate(${dragPos.x * 0.05}deg) scale(1.1)`;
          }

          return (
            <div
              key={idx}
              onPointerDown={(e) => {
                if (isTop) handlePointerDown(e, isTop);
                else {
                  e.stopPropagation();
                  handleNext();
                }
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, isTop)}
              className={`absolute inset-0 flex flex-col items-center justify-center p-5 hand-drawn-panel overflow-hidden ease-[cubic-bezier(0.34,1.56,0.64,1)]
                ${isTop ? 'cursor-grab active:cursor-grabbing hover:-translate-y-2 hover:shadow-xl' : 'cursor-pointer'}
                ${(!isDragging && isTop) || !isTop ? 'transition-all duration-500' : ''}
              `}
              style={{
                transform: transformStyle,
                zIndex: isTop && isDragging ? 50 : 40 - offset,
                opacity: 1 - offset * 0.2,
              }}
            >
              {/* 曲风叠底背景 + 针对性纹理 */}
              {mode === 'music' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute inset-0" style={{ background: card.bg }} />
                  {renderTexture(idx)}
                </div>
              )}

              <span className="relative text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">{card.label}</span>

              <div className="relative p-3 my-2 bg-slate-100 rounded-full border-2 border-slate-800 shadow-[0_4px_0_rgba(30,41,59,1)]">
                {mode === 'weather'
                  ? getWeatherIcon(card.w, 28)
                  : <Music size={28} className={`drop-shadow-md ${isPlaying ? 'text-slate-900' : 'text-slate-600'}`} />}
              </div>

              {mode === 'weather' ? (
                <span className="relative text-slate-800 font-bold text-sm tracking-widest mt-1">{getLabel(card.w)}</span>
              ) : (
                <span className="relative text-slate-800 font-bold text-[11px] tracking-wide mt-1 text-center leading-tight px-1">{card.title}</span>
              )}

              {/* 高级进度条：加粗 + 高对比填充 + playhead 圆点 */}
              {mode === 'music' && (
                <div className="relative w-full mt-3 h-2.5 rounded-full bg-white/70 border border-slate-800/50 shadow-inner">
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-slate-700 to-slate-900 transition-[width] duration-300 ease-linear"
                      style={{ width: `${isPlaying ? progress * 100 : 0}%` }}
                    />
                  </div>
                  {isPlaying && (
                    <div
                      className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-800 shadow-md transition-[left] duration-300 ease-linear"
                      style={{ left: `calc(${progress * 100}% - 7px)`, transform: 'translateY(-50%)' }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <span className="text-slate-400 font-bold text-[10px] tracking-widest mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
        {mode === 'weather' ? '拖拽卡片至屏幕中央应用' : '点击卡片切换音乐'}
      </span>
    </div>
  );
}
