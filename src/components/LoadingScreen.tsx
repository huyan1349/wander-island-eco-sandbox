import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioSystem } from '../lib/audio';
import { Maximize2, Headphones, Chrome } from 'lucide-react';
import { TRACKS, renderTrackTexture } from './ui/musicData';

interface LoadingScreenProps {
  onReady: () => void;
}

type Phase = 'intro' | 'install' | 'verify' | 'ready';

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

// Subtle click sound for all interactive elements
function playClick() {
  AudioSystem.playClick();
}

// ─── Full Music Library Card Panel (Left Panel) ───
function MusicCardPanel() {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const RARITY = [64, 78, 41, 53, 29];

  const obtainedDate = (url: string) => {
    const k = `card_got_${url}`;
    let v = localStorage.getItem(k);
    if (!v) { v = Date.now().toString(); localStorage.setItem(k, v); }
    const d = new Date(+v);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPlayingUrl(AudioSystem.getCurrentBGMUrl());
      setProgress(AudioSystem.getBGMProgress());
    }, 400);
    const onBGMChange = () => {
      setPlayingUrl(AudioSystem.getCurrentBGMUrl());
      setProgress(0);
    };
    window.addEventListener('wander:bgm-changed', onBGMChange);
    return () => { clearInterval(id); window.removeEventListener('wander:bgm-changed', onBGMChange); };
  }, []);

  useEffect(() => {
    if (detailOpen) return;
    autoTimerRef.current = setInterval(() => {
      const next = ((selected ?? -1) + 1) % TRACKS.length;
      openDetail(next);
    }, 8000);
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [detailOpen, selected]);

  const play = (url: string) => {
    // Unlock audio on user gesture first
    AudioSystem.ensureResumed();
    if (url === AudioSystem.getCurrentBGMUrl()) return;
    AudioSystem.switchBGM(url);
    setPlayingUrl(url);
  };

  const openDetail = (i: number) => {
    playClick();
    setSelected(i);
    setFlipped(false);
    obtainedDate(TRACKS[i].url);
    requestAnimationFrame(() => requestAnimationFrame(() => setDetailOpen(true)));
  };

  const closeDetail = () => {
    playClick();
    setDetailOpen(false);
    setTimeout(() => setSelected(null), 300);
  };

  const n = TRACKS.length;
  const mid = (n - 1) / 2;
  const CARD_W = 144;
  const CARD_H = 208;
  const SPREAD_X = 105;
  const SPREAD_Y = 12;
  const SPREAD_ROT = 6;

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full select-none overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 55%, rgba(253,230,138,0.15), transparent 55%)' }} />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-[80px] flex flex-col items-center">
        <p className="hand-drawn-title text-2xl text-slate-200 mb-1 -rotate-1 relative z-10 drop-shadow-md">音乐长廊</p>
        <div className="w-12 h-1 bg-gradient-to-r from-transparent via-slate-300/50 to-transparent absolute bottom-0 left-1/2 -translate-x-1/2 -rotate-1"></div>
        <p className="text-[9px] tracking-[0.3em] font-mono text-slate-300/80 font-bold mt-2 uppercase">
          {TRACKS.length} TRACKS <span className="mx-1.5 opacity-50">•</span> 点击卡片查看
        </p>
      </div>

      <div
        className="relative flex items-end justify-center"
        style={{ height: CARD_H + 40, width: '100%', maxWidth: SPREAD_X * (n - 1) + CARD_W + 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        {TRACKS.map((t, i) => {
          const off = i - mid;
          const isPlaying = t.url === playingUrl;
          return (
            <div
              key={i}
              className="absolute"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: CARD_W, height: CARD_H,
                transform: mounted
                  ? `translateX(${off * SPREAD_X}px) translateY(${Math.abs(off) * SPREAD_Y}px) rotate(${off * SPREAD_ROT}deg)`
                  : 'translateX(0px) translateY(100px) rotate(0deg) scale(0.7)',
                opacity: mounted ? 1 : 0,
                zIndex: hovered === i ? 60 : 30 - Math.abs(off),
                willChange: 'transform, opacity',
                transition: `transform 0.65s cubic-bezier(0.34,1.45,0.64,1) ${i * 0.07}s, opacity 0.45s ease ${i * 0.07}s`,
              } as React.CSSProperties}
            >
              <div
                onClick={() => openDetail(i)}
                className="relative w-full h-full rounded-2xl overflow-hidden hand-drawn-panel cursor-pointer"
                style={{
                  boxShadow: isPlaying
                    ? '0 0 0 3px #15803d, 0 14px 32px rgba(0,0,0,0.55)'
                    : (hovered === i ? '0 16px 36px rgba(0,0,0,0.55)' : '0 8px 20px rgba(0,0,0,0.4)'),
                  opacity: (selected === i && detailOpen) ? 0 : 1,
                  transform: hovered === i ? 'translateY(-12px) scale(1.07)' : 'translateY(0px) scale(1)',
                  transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease, opacity 0.4s ease',
                }}
              >
                <div className="absolute inset-0" style={{ background: t.bg }} />
                {renderTrackTexture(i)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-slate-100 border-2 border-slate-800 flex items-center justify-center shadow-[0_2px_0_rgba(30,41,59,1)]">
                  {isPlaying ? <span className="text-slate-900 text-xs">♪</span> : <span className="text-slate-500 text-[10px] font-bold">{i + 1}</span>}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-white font-bold text-xs leading-tight drop-shadow">{t.title}</p>
                  {isPlaying && (
                    <div className="mt-1.5 h-1 rounded-full bg-white/30 overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-[width] duration-300 ease-linear" style={{ width: `${progress * 100}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected !== null && (
        <>
          {/* Full-screen backdrop to prevent hard split lines */}
          <div
            className="fixed inset-0 z-[210]"
            onClick={(e) => { e.stopPropagation(); closeDetail(); }}
            style={{
              background: `rgba(252,250,245,${detailOpen ? 0.75 : 0})`,
              backdropFilter: `blur(${detailOpen ? 12 : 0}px)`,
              WebkitBackdropFilter: `blur(${detailOpen ? 12 : 0}px)`,
              transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
            }}
          />
          {/* Left-aligned card container */}
          <div
            className="absolute inset-0 z-[220] flex flex-col items-center justify-center gap-3 pointer-events-none"
          >
            <div
              className="pointer-events-auto"
              style={{
                perspective: 1200,
                transform: detailOpen
                  ? 'translate(0px, 0px) scale(1)'
                  : `translate(${(selected - mid) * SPREAD_X}px, ${30 + Math.abs(selected - mid) * SPREAD_Y}px) rotate(${(selected - mid) * SPREAD_ROT}deg) scale(0.6)`,
                opacity: detailOpen ? 1 : 0,
                transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.45s cubic-bezier(0.22,1,0.36,1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
            <div
              onClick={() => { playClick(); setFlipped((f) => !f); }}
              className="relative w-60 h-[360px] cursor-pointer"
              style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.6s cubic-bezier(0.4,0.2,0.2,1)', boxShadow: '0 24px 56px rgba(0,0,0,0.6)', borderRadius: 20 }}
            >
              <div className="absolute inset-0 rounded-2xl overflow-hidden hand-drawn-panel" style={{ backfaceVisibility: 'hidden' }}>
                <div className="absolute inset-0" style={{ background: TRACKS[selected].bg }} />
                {renderTrackTexture(selected)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
                <p className="absolute top-4 left-4 text-white/60 text-[9px] font-mono tracking-[0.3em] uppercase">TRACK {selected + 1} / {n}</p>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-white text-xl font-bold drop-shadow-lg mb-1.5 leading-tight">{TRACKS[selected].title}</p>
                  <p className="text-white/75 text-[12px] leading-relaxed mb-3 italic">{(TRACKS[selected] as any).story}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); playClick(); play(TRACKS[selected].url); }}
                    className="w-full hand-drawn-btn px-4 py-2.5 font-bold bg-white text-sm"
                  >
                    {TRACKS[selected].url === playingUrl ? '♪ 正在播放' : '▶ 播放这首'}
                  </button>
                </div>
              </div>
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden hand-drawn-panel bg-[#fcf8ec] p-5 flex flex-col"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <p className="text-slate-400 text-[9px] font-mono tracking-[0.3em] uppercase text-center mb-4">CARD · 记忆回声</p>
                <p className="hand-drawn-title text-lg text-slate-800 text-center mb-6 -rotate-1">{TRACKS[selected].title}</p>
                <div className="flex-1 flex flex-col justify-center gap-5">
                  <div className="text-center">
                    <p className="text-slate-400 text-[9px] uppercase tracking-widest mb-1">获得于</p>
                    <p className="text-slate-800 text-lg font-bold">{obtainedDate(TRACKS[selected].url)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-[9px] uppercase tracking-widest mb-1">稀有度</p>
                    <p className="text-emerald-700 text-lg font-bold">{RARITY[selected]}%</p>
                    <p className="text-slate-400 text-[10px] mt-0.5">的漫游者拥有这张卡</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-slate-600 text-[10px] font-mono tracking-[0.25em] pointer-events-none" style={{ opacity: detailOpen ? 1 : 0, transition: 'opacity 0.3s' }}>
            {flipped ? '点击卡片 · 翻回正面' : '点击卡片 · 查看背面'}
          </p>
          <p className="text-slate-400 text-[9px] font-mono tracking-[0.2em] pointer-events-none" style={{ opacity: detailOpen ? 1 : 0, transition: 'opacity 0.3s 0.1s' }}>
            点击空白处收起
          </p>
        </div>
        </>
      )}
    </div>
  );
}

// ─── Main Loading Screen ───
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onReady }) => {
  const [phase, setPhase] = useState<Phase>('intro');
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
  const enterRef = useRef(false);

  const isReady = phase === 'ready';

  useEffect(() => {
    mountedRef.current = true; // 重新挂载时复位（StrictMode 双挂载会先触发上一次的 cleanup 置 false）
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

  const currentInstalling = items.find(i => i.status === 'installing');
  const statusText = (() => {
    if (phase === 'verify') return '正在验证资源完整性...';
    if (phase === 'ready') return '所有资源已就绪';
    if (!currentInstalling) return '准备安装...';
    const label = currentInstalling.label;
    if (label.startsWith('BGM')) return `正在加载背景音乐 — ${currentInstalling.sublabel}...`;
    if (label.startsWith('FONT')) return `正在安装字体 — ${currentInstalling.sublabel}...`;
    if (label.startsWith('IMAGE')) return `正在加载图片资源 — ${currentInstalling.sublabel}...`;
    if (label === 'AUDIO ENGINE') return '正在初始化音频引擎...';
    if (label === 'DISPLAY') return '正在适配显示环境...';
    return `正在安装 ${label}...`;
  })();

  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => {
        setPhase('install');
      }, 6200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'install') return;
    const runInstall = async () => {
      updateItem('engine', { status: 'installing', progress: 10 });
      try { AudioSystem.init(); } catch {}
      updateItem('engine', { progress: 100, status: 'done' });

      const bgmPromises = BGM_TRACKS.map(async (track, i) => {
        const itemId = `bgm${i}`;
        updateItem(itemId, { status: 'installing', progress: 5 });
        try {
          const res = await fetch(track.url);
          if (!res.ok) throw new Error();
          await res.arrayBuffer();
        } catch {}
        updateItem(itemId, { progress: 100, status: 'done' });
        AudioSystem.preloadBGM(track.url);
      });
      await Promise.all(bgmPromises);
      AudioSystem.setPlaylist(TRACKS.map(t => t.url));
      AudioSystem.loadBGM('/Tides_of_Mahogany.mp3');

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

      updateItem('display', { status: 'installing', progress: 20 });
      await delay(100);
      updateItem('display', { progress: 100, status: 'done' });

      // === VERIFICATION ===
      setPhase('verify');
      let verified = 0;
      const totalItems = items.length;

      await document.fonts.ready;
      for (const font of FONTS) {
        const family = font.name.split(' ')[0] === 'NUNITO' ? 'Nunito' :
                       font.name === 'ZCOOL KUAILE' ? 'ZCOOL KuaiLe' : 'Raleway';
        document.fonts.check(`16px "${family}"`) || await delay(200);
        verified++;
        setVerifyCount(verified);
      }

      for (const track of BGM_TRACKS) {
        const cached = AudioSystem['bgmCache']?.get(track.url);
        if (cached) {
          const start = Date.now();
          while (cached.readyState < 2 && Date.now() - start < 8000) await delay(200);
        }
        verified++;
        setVerifyCount(verified);
      }

      for (const img of IMAGES) {
        try { await fetch(img.url, { cache: 'force-cache' }); } catch {}
        verified++;
        setVerifyCount(verified);
      }

      verified += 2;
      setVerifyCount(totalItems);

      setItems(prev => {
        if (!prev.every(i => i.status === 'done')) return prev.map(item => ({ ...item, status: 'done' as const, progress: 100 }));
        return prev;
      });

      // === READY ===
      setPhase('ready');
      await delay(800);
      if (mountedRef.current) setShowEnter(true);
    };

    runInstall();
  }, [phase, updateItem, items.length]);

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  };

  const handleEnter = async () => {
    if (enterRef.current) return;
    enterRef.current = true;
    playClick();

    AudioSystem.ensureResumed();
    const bgmStarted = await AudioSystem.playBGM();
    if (!bgmStarted) {
      await delay(100);
      await AudioSystem.playBGM();
    }

    for (let i = 0; i < 10; i++) {
      if (AudioSystem.isBGMActuallyPlaying()) break;
      await delay(100);
    }

    if (!isFullscreen) requestFullscreen();
    localStorage.setItem(HAS_VISITED_KEY, 'true');
    setFadeOut(true);
    setTimeout(onReady, 800);
  };

  const doneCount = items.filter(i => i.status === 'done').length;

  return (
    <div
      className={`absolute inset-0 z-[200] bg-slate-950/40 backdrop-blur-md flex select-none
        transition-opacity duration-800 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {phase === 'intro' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-14 pointer-events-none" style={{ animation: 'introFadeOut 1.2s cubic-bezier(0.4, 0, 0.2, 1) 5.2s forwards' }}>
          <div className="flex flex-col items-center gap-6 text-white" style={{ animation: 'introFadeIn 1.5s cubic-bezier(0.4, 0, 0.2, 1) 0.5s both' }}>
            <Headphones size={32} strokeWidth={1.5} className="opacity-90 drop-shadow-md" />
            <p className="text-[14px] tracking-[0.3em] font-medium drop-shadow-md">推荐佩戴耳机以获得沉浸体验</p>
          </div>
          <div className="w-12 h-[2px] bg-white/40 rounded-full" style={{ animation: 'introFadeIn 1.5s cubic-bezier(0.4, 0, 0.2, 1) 1.5s both' }} />
          <div className="flex flex-col items-center gap-6 text-white" style={{ animation: 'introFadeIn 1.5s cubic-bezier(0.4, 0, 0.2, 1) 2.5s both' }}>
            <Chrome size={32} strokeWidth={1.5} className="opacity-90 drop-shadow-md" />
            <p className="text-[14px] tracking-[0.3em] font-medium drop-shadow-md">建议使用 Chrome 浏览器游玩</p>
          </div>
        </div>
      ) : (
        <>
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(253,230,138,0.2) 0%, transparent 70%)',
          }} />

      {/* ─── LEFT PANEL: Music Cards (Desktop only) ─── */}
      {!isTouch && (
        <div className="w-[45%] h-full relative z-10">
          <MusicCardPanel />
        </div>
      )}

      {/* ─── MOBILE WARNING BANNER ─── */}
      {isTouch && (
        <div className="absolute top-0 left-0 right-0 z-50" style={{ animation: 'fadeIn 0.5s ease' }}>
          <div className="mx-4 mt-4 px-4 py-3.5 rounded-xl border border-amber-500/20 bg-amber-50/80 backdrop-blur-md shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 text-lg leading-none mt-0.5">⚠</span>
              <div className="flex-1">
                <p className="text-amber-800 text-[14px] font-semibold leading-snug">移动端尚未优化完成</p>
                <p className="text-amber-700/70 text-[12px] mt-1 leading-relaxed">建议使用电脑端访问以获得最佳体验</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── RIGHT PANEL ─── */}
      <div className={`h-full flex flex-col items-center justify-center ${isTouch ? 'w-full' : 'w-[55%]'} relative z-10`}>
        <div className={`w-full max-w-md flex flex-col ${isTouch ? 'px-6 pt-24 pb-8 gap-5' : 'px-10 gap-5'}`}>

          {/* Header — always visible */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/title/island-outline.svg" alt="" className="w-8 h-8 opacity-60 drop-shadow-sm filter contrast-125 brightness-150 mix-blend-screen" />
              <div className="flex flex-col">
                <span className="text-slate-200 text-[10px] tracking-[0.5em] uppercase font-mono font-bold">Wander Island</span>
                <span className="text-slate-300 text-[8px] tracking-[0.15em] font-mono mt-0.5">
                  {isReady ? 'READY' : 'ENVIRONMENT SETUP'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {phase === 'verify' && (
                <span className="text-emerald-500/80 text-[9px] tracking-[0.2em] font-mono font-bold" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
                  VERIFYING
                </span>
              )}
              {isReady && (
                <span className="text-emerald-600 text-[9px] tracking-[0.2em] font-mono font-bold">VERIFIED</span>
              )}
              <span className="text-slate-200 text-[14px] tracking-[0.15em] font-mono tabular-nums font-bold drop-shadow-sm">
                {totalProgress}%
              </span>
            </div>
          </div>

          {/* Status text / Welcome text */}
          <div className="min-h-[22px]">
            {!isReady ? (
              <p className="text-slate-300 text-[12px] tracking-[0.03em] truncate drop-shadow-sm" key={statusText} style={{ animation: 'fadeIn 0.3s ease' }}>
                {statusText}
              </p>
            ) : (
              <div className="flex flex-col items-center gap-2 pt-4" style={{ animation: 'fadeIn 0.5s ease' }}>
                <p
                  className="text-slate-300 text-[14px] tracking-[0.4em] font-medium drop-shadow-sm"
                  style={{ animation: 'welcomeBlur 1s ease 0s both' }}
                >
                  欢迎来到
                </p>
                <p
                  className="hand-drawn-title text-5xl text-white -rotate-1 drop-shadow-md"
                  style={{ animation: 'welcomeBlur 1s ease 0.3s both' }}
                >
                  流浪岛
                </p>
                <p
                  className="text-slate-300 text-[9px] tracking-[0.7em] uppercase font-mono mt-2 font-bold drop-shadow-sm"
                  style={{ animation: 'welcomeBlur 1s ease 0.6s both' }}
                >
                  WANDER ISLAND
                </p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-[3px] bg-stone-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${totalProgress}%`,
                background: isReady
                  ? 'linear-gradient(90deg, #34d399, #10b981)'
                  : phase === 'verify'
                  ? 'linear-gradient(90deg, #6ee7b7, #34d399)'
                  : '#94a3b8',
                boxShadow: isReady ? '0 0 10px rgba(52,211,153,0.4)' : 'none'
              }}
            />
          </div>

          {/* Install list — only during install/verify */}
          {!isReady && (
            <div className="flex flex-col gap-0 max-h-[40vh] overflow-y-auto scrollbar-none">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 py-[5px] transition-all duration-200 ${
                    item.status === 'done' ? 'opacity-40' :
                    item.status === 'installing' ? 'opacity-100' :
                    item.status === 'fail' ? 'opacity-80 text-red-500' : 'opacity-30'
                  }`}
                >
                  <div className="w-2.5 flex-shrink-0 flex items-center justify-center">
                    {item.status === 'done' && <div className="w-[6px] h-[6px] rounded-full bg-emerald-400" />}
                    {item.status === 'installing' && <div className="w-[6px] h-[6px] rounded-full bg-sky-400" style={{ animation: 'bouncingDot 1s ease-in-out infinite' }} />}
                    {item.status === 'pending' && <div className="w-[4px] h-[4px] rounded-full bg-slate-300" />}
                    {item.status === 'fail' && <div className="w-[6px] h-[6px] rounded-full bg-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] tracking-[0.12em] font-mono text-slate-300 truncate font-semibold drop-shadow-sm">{item.label}</div>
                  </div>
                  <div className="w-8 flex-shrink-0 text-right">
                    {item.status === 'done' && <span className="text-[8px] font-mono text-emerald-600 font-bold">OK</span>}
                    {item.status === 'installing' && <span className="text-[8px] font-mono text-sky-600 font-bold tabular-nums">{Math.round(item.progress)}%</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Status line / Enter button */}
          {!isReady ? (
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 font-bold tracking-[0.1em] drop-shadow-sm">
              <span>
                {phase === 'install' && `${items.filter(i => i.status === 'done').length}/${items.length} installed`}
                {phase === 'verify' && `Verifying ${verifyCount}/${items.length}...`}
              </span>
              <span>
                {phase === 'install' && 'INSTALLING'}
                {phase === 'verify' && 'VERIFYING'}
              </span>
            </div>
          ) : showEnter && (
            <div className="flex flex-col items-center gap-5 pt-4" style={{ animation: 'fadeIn 0.6s ease' }}>
              {isTouch && (
                <div className="w-full max-w-[300px] px-4 py-3.5 rounded-xl border border-amber-500/20 bg-amber-50/80 text-center shadow-sm">
                  <p className="text-amber-800 text-[14px] font-semibold">移动端尚未优化完成</p>
                  <p className="text-amber-700/70 text-[12px] mt-1">建议使用电脑端访问以获得最佳体验</p>
                </div>
              )}

              <button
                onClick={handleEnter}
                className="group relative px-16 py-4 bg-slate-800 text-white hover:bg-slate-700 active:bg-slate-900 transition-all duration-300 rounded-2xl w-full max-w-[280px] shadow-[0_8px_20px_rgba(30,41,59,0.15)] hover:shadow-[0_12px_24px_rgba(30,41,59,0.2)] hover:-translate-y-0.5"
              >
                <span className="text-[12px] tracking-[0.5em] uppercase font-mono font-bold">
                  {isTouch ? '继续使用移动端' : '开 始'}
                </span>
              </button>

              {!isTouch && !isFullscreen && (
                <button
                  onClick={() => { playClick(); requestFullscreen(); }}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors duration-300 font-bold drop-shadow-sm"
                >
                  <Maximize2 size={10} />
                  <span className="text-[8px] tracking-[0.2em] font-mono">FULLSCREEN RECOMMENDED</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      </>
      )}

      <style>{`
        @keyframes introFadeIn {
          from { opacity: 0; filter: blur(8px); transform: translateY(6px); }
          to { opacity: 1; filter: blur(0px); transform: translateY(0); }
        }
        @keyframes introFadeOut {
          from { opacity: 1; filter: blur(0px); }
          to { opacity: 0; filter: blur(12px); transform: scale(1.02); }
        }
        @keyframes bouncingDot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes welcomeBlur {
          from { opacity: 0; filter: blur(10px); transform: translateY(12px); }
          to { opacity: 1; filter: blur(0px); transform: translateY(0); }
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
