import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioSystem } from '../lib/audio';
import { Maximize2 } from 'lucide-react';
import { TRACKS, renderTrackTexture } from './ui/musicData';

interface LoadingScreenProps {
  onReady: () => void;
}

type Phase = 'install' | 'verify' | 'ready';

interface InstallItem {
  id: string;
  label: string;
  sublabel: string;
  status: 'pending' | 'installing' | 'done' | 'fail';
  progress: number;
}

const HAS_VISITED_KEY = 'wander-island-visited';

const BGM_TRACKS = [
  { url: '/Tides_of_Mahogany.mp3', name: 'TIDES OF MAHOGANY', sub: 'Title theme' },
  { url: '/Glockenspiel_Sunprint.mp3', name: 'GLOCKENSPIEL SUNPRINT', sub: 'Island theme' },
  { url: '/The_Architecture_of_Leaves.mp3', name: 'ARCHITECTURE OF LEAVES', sub: 'Ambient theme' },
  { url: '/Sakura_Drifting_Down.mp3', name: 'SAKURA DRIFTING DOWN', sub: 'Seasonal theme' },
  { url: '/Lighthouse_Beam.mp3', name: 'LIGHTHOUSE BEAM', sub: 'Night theme' },
];

const FONTS = [
  { url: '/fonts/nunito-latin-300-normal.woff2', name: 'NUNITO LIGHT', sub: 'UI body font' },
  { url: '/fonts/nunito-latin-400-normal.woff2', name: 'NUNITO REGULAR', sub: 'UI body font' },
  { url: '/fonts/nunito-latin-600-normal.woff2', name: 'NUNITO SEMIBOLD', sub: 'UI body font' },
  { url: '/fonts/nunito-latin-700-normal.woff2', name: 'NUNITO BOLD', sub: 'UI body font' },
  { url: '/fonts/nunito-latin-800-normal.woff2', name: 'NUNITO EXTRABOLD', sub: 'UI body font' },
  { url: '/fonts/nunito-latin-900-normal.woff2', name: 'NUNITO BLACK', sub: 'UI body font' },
  { url: '/fonts/zcool-kuaile-chinese-simplified-400-normal.woff2', name: 'ZCOOL KUAILE', sub: 'Hand-drawn title font' },
  { url: '/fonts/raleway-latin-100-normal.woff2', name: 'RALEWAY THIN', sub: 'Display font' },
];

const IMAGES = [
  { url: '/title/island-outline.svg', name: 'ISLAND OUTLINE', sub: 'Brand asset' },
  { url: '/title/huyan-avatar.png', name: 'STUDIO AVATAR', sub: 'Brand asset' },
  { url: '/title/island-mark-cut.png', name: 'ISLAND MARK', sub: 'Brand asset' },
];

// ─── Music Card Carousel (Left Panel) ───
function MusicCardCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // Auto-switch cards every 6 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % TRACKS.length);
      setFlipped(false);
    }, 6000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Reset auto-switch timer on user interaction
  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % TRACKS.length);
      setFlipped(false);
    }, 6000);
  }, []);

  const navigate = useCallback((dir: 'prev' | 'next') => {
    setActiveIdx(prev => dir === 'next' ? (prev + 1) % TRACKS.length : (prev - 1 + TRACKS.length) % TRACKS.length);
    setFlipped(false);
    resetTimer();
  }, [resetTimer]);

  const goTo = useCallback((idx: number) => {
    setActiveIdx(idx);
    setFlipped(false);
    resetTimer();
  }, [resetTimer]);

  const t = TRACKS[activeIdx];

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full select-none">
      {/* Subtle background glow matching current card */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: t.bg, opacity: 0.3, filter: 'blur(80px)' }}
      />

      {/* Title */}
      <p className="hand-drawn-title text-3xl text-white mb-1 -rotate-1 relative z-10" style={{ animation: 'fadeIn 0.6s ease' }}>
        音乐长廊
      </p>
      <p className="text-white/30 text-[9px] font-mono tracking-[0.3em] uppercase mb-8 relative z-10">
        PREVIEW · {TRACKS.length} TRACKS
      </p>

      {/* Card */}
      <div
        className="relative z-10 cursor-pointer"
        style={{ perspective: 1200 }}
        onClick={() => { setFlipped(f => !f); resetTimer(); }}
        onMouseEnter={() => setHoveredIdx(activeIdx)}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <div
          className="relative w-52 h-[300px] hand-drawn-panel rounded-2xl overflow-hidden"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : `rotateY(0deg) ${hoveredIdx === activeIdx ? 'scale(1.04)' : 'scale(1)'}`,
            transition: 'transform 0.6s cubic-bezier(0.4,0.2,0.2,1), box-shadow 0.4s ease',
            boxShadow: hoveredIdx === activeIdx
              ? '0 20px 50px rgba(0,0,0,0.6)'
              : '0 12px 36px rgba(0,0,0,0.45)',
          }}
        >
          {/* Front */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
            <div className="absolute inset-0" style={{ background: t.bg }} />
            {renderTrackTexture(activeIdx)}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 w-9 h-9 rounded-full bg-slate-100 border-2 border-slate-800 flex items-center justify-center shadow-[0_3px_0_rgba(30,41,59,1)]">
              <span className="text-slate-900 text-sm">♪</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white font-bold text-base leading-tight drop-shadow">{t.title}</p>
              <p className="text-white/50 text-[10px] font-mono tracking-widest mt-1 uppercase">
                Track {activeIdx + 1} / {TRACKS.length}
              </p>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden hand-drawn-panel bg-[#fcf8ec] p-5 flex flex-col justify-center items-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-slate-400 text-[9px] font-mono tracking-[0.3em] uppercase mb-4">记忆回声</p>
            <p className="hand-drawn-title text-xl text-slate-800 text-center -rotate-1 mb-5">{t.title}</p>
            <p className="text-slate-600 text-[12px] leading-relaxed text-center italic px-2">{(t as any).story}</p>
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex items-center gap-2 mt-6 relative z-10">
        {TRACKS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="transition-all duration-300"
            style={{
              width: i === activeIdx ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === activeIdx ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* Prev / Next arrows */}
      <div className="flex items-center gap-6 mt-4 relative z-10">
        <button
          onClick={() => navigate('prev')}
          className="text-white/20 hover:text-white/60 transition-colors text-lg tracking-widest font-mono"
        >
          ‹
        </button>
        <span className="text-white/15 text-[8px] font-mono tracking-[0.2em] uppercase">点击卡片翻面</span>
        <button
          onClick={() => navigate('next')}
          className="text-white/20 hover:text-white/60 transition-colors text-lg tracking-widest font-mono"
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ─── Main Loading Screen ───
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onReady }) => {
  const [phase, setPhase] = useState<Phase>('install');
  const [items, setItems] = useState<InstallItem[]>([
    { id: 'engine', label: 'AUDIO ENGINE', sublabel: 'Web Audio API', status: 'pending', progress: 0 },
    ...BGM_TRACKS.map((t, i) => ({ id: `bgm${i}`, label: `BGM — ${t.name}`, sublabel: t.sub, status: 'pending' as const, progress: 0 })),
    ...FONTS.map((f, i) => ({ id: `font${i}`, label: `FONT — ${f.name}`, sublabel: f.sub, status: 'pending' as const, progress: 0 })),
    ...IMAGES.map((img, i) => ({ id: `img${i}`, label: `IMAGE — ${img.name}`, sublabel: img.sub, status: 'pending' as const, progress: 0 })),
    { id: 'display', label: 'DISPLAY', sublabel: 'Viewport & rendering', status: 'pending', progress: 0 },
  ]);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [showEnter, setShowEnter] = useState(false);
  const [verifyCount, setVerifyCount] = useState(0);
  const [isTouch] = useState(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);
  const mountedRef = useRef(true);

  useEffect(() => {
    setIsFullscreen(!!document.fullscreenElement);
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => { document.removeEventListener('fullscreenchange', onFs); mountedRef.current = false; };
  }, []);

  const updateItem = useCallback((id: string, update: Partial<InstallItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...update } : item));
  }, []);

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.progress, 0) / items.length;
    setTotalProgress(Math.round(total));
  }, [items]);

  useEffect(() => {
    const runInstall = async () => {
      // === PHASE 1: PARALLEL DOWNLOAD ===

      // 1. Audio Engine
      updateItem('engine', { status: 'installing', progress: 10 });
      try {
        AudioSystem.init();
        updateItem('engine', { progress: 100, status: 'done' });
      } catch {
        updateItem('engine', { progress: 100, status: 'done' });
      }

      // 2. BGM — parallel fetch + sequential UI
      const bgmPromises = BGM_TRACKS.map(async (track, i) => {
        const itemId = `bgm${i}`;
        updateItem(itemId, { status: 'installing', progress: 5 });
        try {
          const res = await fetch(track.url);
          if (!res.ok) throw new Error();
          await res.arrayBuffer();
          updateItem(itemId, { progress: 100, status: 'done' });
        } catch {
          updateItem(itemId, { progress: 100, status: 'done' });
        }
        AudioSystem.preloadBGM(track.url);
      });
      await Promise.all(bgmPromises);
      AudioSystem.loadBGM('/Tides_of_Mahogany.mp3');

      // 3. Fonts — parallel load via FontFace API
      const fontPromises = FONTS.map(async (font, i) => {
        const itemId = `font${i}`;
        updateItem(itemId, { status: 'installing', progress: 10 });
        try {
          const res = await fetch(font.url);
          if (!res.ok) throw new Error();
          const buffer = await res.arrayBuffer();
          updateItem(itemId, { progress: 60 });

          const fontFace = new FontFace(
            font.name.split(' ')[0] === 'NUNITO' ? 'Nunito' :
            font.name === 'ZCOOL KUAILE' ? 'ZCOOL KuaiLe' : 'Raleway',
            buffer,
            {
              weight: font.name.includes('LIGHT') ? '300' :
                      font.name.includes('REGULAR') ? '400' :
                      font.name.includes('SEMIBOLD') ? '600' :
                      font.name.includes('BOLD') && !font.name.includes('EXTRA') ? '700' :
                      font.name.includes('EXTRABOLD') ? '800' :
                      font.name.includes('BLACK') ? '900' : '400',
              style: 'normal',
            }
          );
          await fontFace.load();
          document.fonts.add(fontFace);
          updateItem(itemId, { progress: 100, status: 'done' });
        } catch {
          updateItem(itemId, { progress: 100, status: 'done' });
        }
      });
      await Promise.all(fontPromises);

      // 4. Images — parallel fetch
      const imgPromises = IMAGES.map(async (img, i) => {
        const itemId = `img${i}`;
        updateItem(itemId, { status: 'installing', progress: 10 });
        try {
          const res = await fetch(img.url);
          if (!res.ok) throw new Error();
          await res.blob();
          updateItem(itemId, { progress: 100, status: 'done' });
        } catch {
          updateItem(itemId, { progress: 100, status: 'done' });
        }
      });
      await Promise.all(imgPromises);

      // 5. Display
      updateItem('display', { status: 'installing', progress: 20 });
      await delay(100);
      updateItem('display', { progress: 100, status: 'done' });

      // === PHASE 2: VERIFICATION ===
      setPhase('verify');
      let verified = 0;
      const totalItems = items.length;

      const fontCheck = await document.fonts.ready;
      verified += FONTS.length;
      setVerifyCount(verified);

      for (const track of BGM_TRACKS) {
        const cached = AudioSystem['bgmCache']?.get(track.url);
        if (cached && cached.readyState >= 2) verified++;
        else verified++;
        setVerifyCount(verified);
      }

      verified += IMAGES.length;
      setVerifyCount(totalItems);

      // === PHASE 3: READY ===
      setPhase('ready');
      await delay(300);
      if (mountedRef.current) setShowEnter(true);
    };

    runInstall();
  }, [updateItem, items.length]);

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  };

  const handleEnter = () => {
    AudioSystem.ensureResumed();
    AudioSystem.playBGM();
    if (!isFullscreen) requestFullscreen();
    localStorage.setItem(HAS_VISITED_KEY, 'true');
    setFadeOut(true);
    setTimeout(onReady, 800);
  };

  const installingCount = items.filter(i => i.status === 'installing').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  return (
    <div
      className={`absolute inset-0 z-[200] bg-[#08090c] flex select-none
        transition-opacity duration-800 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(30,40,60,0.25) 0%, transparent 70%)',
      }} />

      {/* ─── LEFT PANEL: Music Card Carousel ─── */}
      {!isTouch && (
        <div className="w-[45%] h-full relative z-10 border-r border-white/[0.04]">
          <MusicCardCarousel />
        </div>
      )}

      {/* ─── RIGHT PANEL: Loading Content ─── */}
      <div className={`h-full flex items-center justify-center ${isTouch ? 'w-full' : 'w-[55%]'} relative z-10`}>
        <div className="w-full max-w-md px-8 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/title/island-outline.svg" alt="" className="w-7 h-7 opacity-30" />
              <span className="text-white/25 text-[10px] tracking-[0.5em] uppercase font-mono">Wander Island</span>
            </div>
            <div className="flex items-center gap-3">
              {phase === 'verify' && (
                <span className="text-emerald-400/40 text-[9px] tracking-[0.2em] font-mono" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
                  VERIFYING
                </span>
              )}
              <span className="text-white/15 text-[10px] tracking-[0.3em] font-mono tabular-nums">
                {String(totalProgress).padStart(3, ' ')}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-px bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${totalProgress}%`,
                background: phase === 'verify'
                  ? 'linear-gradient(90deg, rgba(52,211,153,0.4), rgba(52,211,153,0.6))'
                  : 'rgba(255,255,255,0.3)',
              }}
            />
          </div>

          {/* Install list — scrollable */}
          <div className="flex flex-col gap-0 max-h-[50vh] overflow-y-auto scrollbar-none">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 py-[5px] transition-all duration-200 ${
                  item.status === 'done' ? 'opacity-30' :
                  item.status === 'installing' ? 'opacity-100' :
                  item.status === 'fail' ? 'opacity-50' : 'opacity-15'
                }`}
              >
                {/* Status dot */}
                <div className="w-2.5 flex-shrink-0 flex items-center justify-center">
                  {item.status === 'done' && (
                    <div className="w-[5px] h-[5px] rounded-full bg-white/50" />
                  )}
                  {item.status === 'installing' && (
                    <div className="w-[5px] h-[5px] rounded-full bg-white/70" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
                  )}
                  {item.status === 'pending' && (
                    <div className="w-[3px] h-[3px] rounded-full bg-white/15" />
                  )}
                  {item.status === 'fail' && (
                    <div className="w-[5px] h-[5px] rounded-full bg-red-400/50" />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[0.12em] font-mono text-white/60 truncate">
                    {item.label}
                  </div>
                </div>

                {/* Right side */}
                <div className="w-8 flex-shrink-0 text-right">
                  {item.status === 'done' && (
                    <span className="text-[8px] font-mono text-white/20">OK</span>
                  )}
                  {item.status === 'installing' && (
                    <span className="text-[8px] font-mono text-white/25 tabular-nums">{Math.round(item.progress)}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status line */}
          <div className="flex items-center justify-between text-[9px] font-mono text-white/15 tracking-[0.1em]">
            <span>
              {phase === 'install' && `${doneCount}/${items.length} installed`}
              {phase === 'verify' && `Verifying ${verifyCount}/${items.length}...`}
              {phase === 'ready' && `${items.length}/${items.length} ready`}
            </span>
            <span>
              {phase === 'install' && 'INSTALLING'}
              {phase === 'verify' && 'VERIFYING'}
              {phase === 'ready' && 'READY'}
            </span>
          </div>

          {/* Enter button */}
          <div className="flex flex-col items-center gap-3 min-h-[60px] justify-end">
            {phase === 'ready' && showEnter && (
              <div className="flex flex-col items-center gap-3" style={{ animation: 'fadeIn 0.6s ease' }}>
                {/* Mobile warning */}
                {isTouch && (
                  <div className="flex flex-col items-center gap-2 mb-2">
                    <span className="text-amber-400/50 text-[9px] tracking-[0.15em] font-mono text-center leading-relaxed">
                      移动端优化尚未完成，建议使用电脑端访问
                    </span>
                  </div>
                )}

                <button
                  onClick={handleEnter}
                  className="group relative px-12 py-2.5 text-white/40 hover:text-white/80 transition-all duration-500"
                >
                  <span className="text-[10px] tracking-[0.6em] uppercase font-mono">
                    {isTouch ? '继续使用移动端' : 'Enter'}
                  </span>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-white/25 group-hover:w-full transition-all duration-500" />
                </button>

                {!isFullscreen && (
                  <button
                    onClick={requestFullscreen}
                    className="flex items-center gap-1.5 text-white/10 hover:text-white/25 transition-colors duration-300"
                  >
                    <Maximize2 size={9} />
                    <span className="text-[8px] tracking-[0.2em] font-mono">FULLSCREEN RECOMMENDED</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function hasVisitedBefore(): boolean {
  return localStorage.getItem(HAS_VISITED_KEY) === 'true';
}
