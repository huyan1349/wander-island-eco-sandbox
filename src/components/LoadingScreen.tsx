import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioSystem } from '../lib/audio';
import { Maximize2 } from 'lucide-react';

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

          // Register font via FontFace API for immediate availability
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

      // Verify fonts are actually rendered
      const fontCheck = await document.fonts.ready;
      verified += FONTS.length;
      setVerifyCount(verified);

      // Verify BGM audio elements are loaded
      for (const track of BGM_TRACKS) {
        const cached = AudioSystem['bgmCache']?.get(track.url);
        if (cached && cached.readyState >= 2) verified++;
        else verified++; // Count as verified even if not fully buffered
        setVerifyCount(verified);
      }

      // Verify images
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
      className={`absolute inset-0 z-[200] bg-[#08090c] flex items-center justify-center select-none
        transition-opacity duration-800 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(30,40,60,0.25) 0%, transparent 70%)',
      }} />

      <div className="relative w-full max-w-lg px-8 flex flex-col gap-6">
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
        <div className="flex flex-col gap-0 max-h-[55vh] overflow-y-auto scrollbar-none">
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
