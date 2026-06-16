import { useState, useEffect } from 'react';
import { AudioSystem } from '../../lib/audio';
import { TRACKS, renderTrackTexture, isCardOwned, cardObtainedDate } from './musicData';

// 音乐收藏库：曲目扇形摊开（双层结构避免 hover 抖动），点卡放大查看，详情里播放。
export function MusicLibrary({ onClose }: { onClose: () => void }) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(AudioSystem.getCurrentBGMUrl());
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const RARITY = [64, 78, 41, 53, 29, 17];
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(r); }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPlayingUrl(AudioSystem.getCurrentBGMUrl());
      setProgress(AudioSystem.getBGMProgress());
    }, 400);
    return () => clearInterval(id);
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
  const n = TRACKS.length;
  const mid = (n - 1) / 2;

  return (
    <div className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-lg animate-in fade-in duration-300" onClick={onClose}>
      {/* 背景光晕 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 55%, rgba(125,211,252,0.12), transparent 55%)' }} />

      <p className="hand-drawn-title text-4xl text-white mb-2 -rotate-1 animate-in fade-in slide-in-from-top-4 duration-500">音乐收藏库</p>
      <p className="text-white/40 text-[11px] font-mono tracking-[0.3em] uppercase mb-12 animate-in fade-in duration-700 delay-200">{n} TRACKS · 点击卡片查看</p>

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
                className="relative w-full h-full rounded-2xl overflow-hidden hand-drawn-panel cursor-pointer"
                style={{
                  boxShadow: isPlaying
                    ? '0 0 0 3px #15803d, 0 18px 42px rgba(0,0,0,0.55)'
                    : (hovered === i ? '0 20px 44px rgba(0,0,0,0.55)' : '0 10px 28px rgba(0,0,0,0.4)'),
                  opacity: (selected === i && detailOpen) ? 0 : 1,
                  transform: hovered === i ? 'translateY(-16px) scale(1.07)' : 'translateY(0px) scale(1)',
                  transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease, opacity 0.4s ease',
                }}
              >
                <div className="absolute inset-0" style={{ background: owned ? t.bg : 'linear-gradient(160deg,#cbd5e1 0%,#64748b 100%)' }} />
                {owned && renderTrackTexture(i)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                {/* 未获得：标注 */}
                {!owned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-slate-900/75 border border-white/40 text-white/90 text-xs font-bold tracking-widest flex items-center gap-1">🔒 未获得</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 w-9 h-9 rounded-full bg-slate-100 border-2 border-slate-800 flex items-center justify-center shadow-[0_3px_0_rgba(30,41,59,1)]">
                  {isPlaying ? <span className="text-slate-900 text-sm">♪</span> : <span className="text-slate-500 text-xs font-bold">{i + 1}</span>}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-bold text-sm leading-tight drop-shadow">{t.title}</p>
                  {isPlaying && (
                    <div className="mt-2 h-1.5 rounded-full bg-white/30 overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-[width] duration-300 ease-linear" style={{ width: `${progress * 100}%` }} />
                    </div>
                  )}
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
              <div className="absolute inset-0 rounded-3xl overflow-hidden hand-drawn-panel" style={{ backfaceVisibility: 'hidden' }}>
                <div className="absolute inset-0" style={{ background: isCardOwned(TRACKS[selected].url) ? TRACKS[selected].bg : 'linear-gradient(160deg,#cbd5e1 0%,#64748b 100%)' }} />
                {isCardOwned(TRACKS[selected].url) && renderTrackTexture(selected)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
                <p className="absolute top-5 left-5 text-white/60 text-[10px] font-mono tracking-[0.3em] uppercase">TRACK {selected + 1} / {n}</p>
                {/* 翻面提示见卡片下方 */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white text-2xl font-bold drop-shadow-lg mb-2 leading-tight">{TRACKS[selected].title}</p>
                  <p className="text-white/75 text-[13px] leading-relaxed mb-4 italic">{(TRACKS[selected] as any).story}</p>
                  {isCardOwned(TRACKS[selected].url) ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); play(TRACKS[selected].url); }}
                      className="w-full hand-drawn-btn px-5 py-3 font-bold bg-white"
                    >
                      {TRACKS[selected].url === playingUrl ? '♪ 正在播放' : '▶ 播放这首'}
                    </button>
                  ) : (
                    <div className="w-full hand-drawn-btn px-5 py-3 font-bold bg-white/70 text-slate-500 text-center cursor-not-allowed">🔒 未获得 · 等「辞」的邮件领取</div>
                  )}
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
