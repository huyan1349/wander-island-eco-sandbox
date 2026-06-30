import { useState, useEffect } from 'react';
import { AudioSystem } from '../../lib/audio';
import {
  TRACKS,
  MusicCardCoverMode,
  cardObtainedDate,
  isCardOwned,
  readMusicCardCoverMode,
  renderTrackArtwork,
  writeMusicCardCoverMode,
} from './musicData';

// 音乐收藏库：曲目扇形摊开（双层结构避免 hover 抖动），点卡放大查看，详情里播放。
export function MusicLibrary({ onClose }: { onClose: () => void }) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(AudioSystem.getCurrentBGMUrl());
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const RARITY = [64, 78, 41, 53, 29, 17];
  const RARITY_TAG = ['COMMON', 'UNCOMMON', 'RARE', 'UNCOMMON', 'RARE', 'EPIC'];
  const [mounted, setMounted] = useState(false);
  const [coverMode, setCoverMode] = useState<MusicCardCoverMode>(() => readMusicCardCoverMode());
  useEffect(() => { const r = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(r); }, []);

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

  const play = (url: string) => {
    AudioSystem.playTap();
    if (url === AudioSystem.getCurrentBGMUrl()) return; // 已在播放，避免对同曲重复切换导致崩溃
    AudioSystem.switchBGM(url);
    setPlayingUrl(url);
  };

  const openDetail = (i: number) => {
    AudioSystem.playClick();
    setSelected(i);
    setFlipped(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setDetailOpen(true)));
  };
  const closeDetail = () => {
    AudioSystem.playClose();
    setDetailOpen(false);
    setTimeout(() => setSelected(null), 300);
  };
  const switchCoverMode = (mode: MusicCardCoverMode) => {
    AudioSystem.playTap();
    setCoverMode(mode);
    writeMusicCardCoverMode(mode);
  };
  const paperDotStyle = {
    backgroundColor: '#f8f0e2',
    backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.075) 0.8px, transparent 0.8px)',
    backgroundSize: '12px 12px',
  } as const;
  const n = TRACKS.length;
  const mid = (n - 1) / 2;

  return (
    <div className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-lg animate-in fade-in duration-300" onClick={onClose}>
      {/* 背景光晕 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 55%, rgba(125,211,252,0.12), transparent 55%)' }} />

      <p className="hand-drawn-title text-4xl text-white mb-2 -rotate-1 animate-in fade-in slide-in-from-top-4 duration-500">音乐收藏库</p>
      <div className="flex items-center gap-4 mb-10 animate-in fade-in duration-700 delay-200" onClick={(e) => e.stopPropagation()}>
        <p className="text-white/40 text-[11px] font-mono tracking-[0.3em] uppercase">{n} TRACKS · 点击卡片查看</p>
        <div className="flex items-center gap-1 rounded-full bg-white/10 border border-white/15 p-1 backdrop-blur">
          {(['illustrated', 'classic'] as MusicCardCoverMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => switchCoverMode(mode)}
              className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest transition-colors ${coverMode === mode ? 'bg-white text-slate-900' : 'text-white/55 hover:text-white'}`}
            >
              {mode === 'illustrated' ? '新封面' : '经典'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex items-end justify-center" style={{ height: 320, width: '92vw', maxWidth: 880 }} onClick={(e) => e.stopPropagation()}>
        {TRACKS.map((t, i) => {
          const off = i - mid;
          const isPlaying = t.url === playingUrl;
          const owned = isCardOwned(t.url);
          return (
            <div
              key={i}
              className="absolute w-44 h-64"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                transform: mounted
                  ? `translateX(${off * 148}px) translateY(${Math.abs(off) * 16}px) rotate(${off * 7}deg)`
                  : 'translateX(0px) translateY(130px) rotate(0deg) scale(0.7)',
                opacity: mounted ? 1 : 0,
                zIndex: hovered === i ? 60 : 30 - Math.abs(off),
                willChange: 'transform, opacity',
                transition: `transform 0.65s cubic-bezier(0.34,1.45,0.64,1) ${i * 0.07}s, opacity 0.45s ease ${i * 0.07}s`,
              }}
            >
              {/* 内层：纯 CSS hover，不与外层定位冲突 */}
              <div
                onClick={() => openDetail(i)}
                className="relative w-full h-full rounded-[18px] overflow-hidden cursor-pointer bg-[#f8f0e2] border border-[#d8c7ac]"
                style={{
                  boxShadow: isPlaying
                    ? '0 0 0 3px #f7e6bf, 0 0 0 6px #15803d, 0 18px 42px rgba(0,0,0,0.55)'
                    : (hovered === i ? '0 22px 48px rgba(0,0,0,0.55)' : '0 10px 28px rgba(0,0,0,0.4)'),
                  opacity: (selected === i && detailOpen) ? 0 : 1,
                  transform: hovered === i ? 'translateY(-16px) scale(1.07)' : 'translateY(0px) scale(1)',
                  transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease, opacity 0.4s ease',
                }}
              >
                <div className="relative h-[45%] overflow-hidden bg-slate-300">
                  {owned ? renderTrackArtwork(i, coverMode) : <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-500" />}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
                  <div className="absolute left-3 top-3 rounded-md bg-slate-900/85 px-2.5 py-1 text-[8px] font-black tracking-[0.22em] text-amber-100 shadow-sm">
                    {RARITY_TAG[i]}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 h-4 w-8 -translate-x-1/2 rounded-t-full bg-[#f8f0e2]" />
                  {!owned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px]">
                      <span className="px-3 py-1 rounded-full bg-slate-900/80 border border-white/40 text-white/90 text-xs font-bold tracking-widest">未获得</span>
                    </div>
                  )}
                </div>

                <div className="relative h-[55%] px-4 py-3 text-slate-800" style={paperDotStyle}>
                  <p className="font-mono text-[8px] font-black tracking-[0.22em] text-slate-400">TRACK {String(i + 1).padStart(2, '0')}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] font-black leading-tight text-slate-900">{t.title}</p>
                  <p className="mt-1 text-[10px] font-black tracking-[0.16em] text-slate-500">{t.subtitle}</p>
                  <div className="my-3 h-px w-full bg-slate-900/12" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2.5px] border-slate-800 bg-[#fbf5e8] text-slate-900 shadow-[0_2px_0_rgba(15,23,42,0.45)]">
                      {isPlaying ? <span className="text-xs">♪</span> : <span className="ml-0.5 text-[10px]">▶</span>}
                    </div>
                    <div className="h-1.5 flex-1 rounded-full bg-slate-300/70">
                      <div className="h-full rounded-full bg-slate-800 transition-[width] duration-300 ease-linear" style={{ width: `${isPlaying ? progress * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => { AudioSystem.playClose(); onClose(); }} className="mt-12 hand-drawn-btn px-8 py-3 font-bold bg-white">收起</button>

      {/* 查看大卡详情 */}
      {selected !== null && (
        <div
          className="fixed inset-0 z-[220] flex flex-col items-center justify-center gap-5"
          onClick={(e) => { e.stopPropagation(); closeDetail(); }}
          style={{ background: `rgba(2,6,23,${detailOpen ? 0.72 : 0})`, backdropFilter: `blur(${detailOpen ? 8 : 0}px)`, WebkitBackdropFilter: `blur(${detailOpen ? 8 : 0}px)`, transition: 'background 0.3s ease, backdrop-filter 0.3s ease' }}
        >
          <div
            style={{
              perspective: 1200,
              transform: detailOpen
                ? 'translate(0px, 0px) scale(1)'
                : `translate(${(selected - mid) * 148}px, ${40 + Math.abs(selected - mid) * 16}px) rotate(${(selected - mid) * 7}deg) scale(0.6)`,
              opacity: detailOpen ? 1 : 0,
              transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.45s cubic-bezier(0.22,1,0.36,1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onClick={() => { AudioSystem.playTap(); setFlipped((f) => !f); }}
              className="relative w-72 h-[420px] cursor-pointer"
              style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.6s cubic-bezier(0.4,0.2,0.2,1)', boxShadow: '0 30px 70px rgba(0,0,0,0.6)', borderRadius: 24 }}
            >
              {/* 正面 */}
              <div className="absolute inset-0 rounded-[24px] overflow-hidden bg-[#f8f0e2] border border-[#d8c7ac]" style={{ backfaceVisibility: 'hidden' }}>
                <div className="relative h-[43%] overflow-hidden bg-slate-300">
                  {isCardOwned(TRACKS[selected].url)
                    ? renderTrackArtwork(selected, coverMode)
                    : <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-500" />}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
                  <div className="absolute left-5 top-5 rounded-md bg-slate-900/85 px-3 py-1.5 text-[9px] font-black tracking-[0.24em] text-amber-100 shadow-sm">
                    {RARITY_TAG[selected]}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 h-4 w-9 -translate-x-1/2 rounded-t-full bg-[#f8f0e2]" />
                </div>
                <div className="relative flex h-[57%] flex-col p-6 text-slate-900" style={paperDotStyle}>
                  <p className="font-mono text-[10px] font-black tracking-[0.3em] text-slate-400">TRACK {String(selected + 1).padStart(2, '0')}</p>
                  <p className="mt-2 text-2xl font-black leading-tight">{TRACKS[selected].title}</p>
                  <p className="mt-1 text-[12px] font-black tracking-[0.18em] text-slate-500">{TRACKS[selected].subtitle}</p>
                  <div className="my-5 h-px w-full bg-slate-900/12" />
                  <div className="mt-auto">
                    {isCardOwned(TRACKS[selected].url) ? (
                      <div className="flex flex-col items-center gap-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); play(TRACKS[selected].url); }}
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-slate-800 bg-[#fbf5e8] text-slate-900 shadow-[0_4px_0_rgba(15,23,42,0.45)] transition-transform hover:-translate-y-0.5 active:translate-y-1"
                          title={TRACKS[selected].url === playingUrl ? '正在播放' : '播放这首'}
                        >
                          {TRACKS[selected].url === playingUrl ? <span className="text-xl">♪</span> : <span className="ml-1 text-lg">▶</span>}
                        </button>
                        <div className="w-full">
                          <div className="flex justify-between font-mono text-[10px] font-black text-slate-400">
                            <span>01:24</span>
                            <span>03:47</span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-300/80">
                            <div className="h-full rounded-full bg-slate-800 transition-[width] duration-300 ease-linear" style={{ width: `${TRACKS[selected].url === playingUrl ? progress * 100 : 0}%` }} />
                          </div>
                          <div className="mt-4 flex justify-between border-t border-slate-900/10 pt-3 font-mono text-[9px] font-black tracking-[0.12em] text-slate-500">
                            <span>已获得 {cardObtainedDate(TRACKS[selected].url) ?? '----.--.--'}</span>
                            <span>作曲 · Huyan</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full rounded-2xl border-2 border-slate-300 bg-white/55 px-5 py-3 text-center text-sm font-bold text-slate-500">未获得 · 等「辞」的邮件领取</div>
                    )}
                  </div>
                </div>
              </div>
              {/* 背面：获得信息 */}
              <div
                className="absolute inset-0 rounded-3xl overflow-hidden hand-drawn-panel bg-[#fcf8ec] p-7 flex flex-col"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <p className="text-slate-400 text-[10px] font-mono tracking-[0.3em] uppercase text-center mb-5">CARD · 记忆回声</p>
                <p className="hand-drawn-title text-2xl text-slate-800 text-center mb-8 -rotate-1">{TRACKS[selected].title}</p>
                <div className="flex-1 flex flex-col justify-center gap-7">
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">获得于</p>
                    <p className="text-slate-800 text-xl font-bold">{cardObtainedDate(TRACKS[selected].url) ?? '— 未获得 —'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">稀有度</p>
                    <p className="text-emerald-700 text-xl font-bold">{RARITY[selected]}%</p>
                    <p className="text-slate-400 text-[11px] mt-1">的漫游者拥有这张卡</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-white/55 text-xs font-mono tracking-[0.25em] pointer-events-none" style={{ opacity: detailOpen ? 1 : 0, transition: 'opacity 0.3s' }}>
            {flipped ? '点击卡片 · 翻回正面' : '点击卡片 · 查看背面'}
          </p>
        </div>
      )}
    </div>
  );
}
