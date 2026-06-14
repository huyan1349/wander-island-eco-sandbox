import { useState, useEffect } from 'react';
import { AudioSystem } from '../../lib/audio';
import { TRACKS, renderTrackTexture } from './musicData';

// 音乐收藏库：曲目扇形摊开（双层结构避免 hover 抖动），点卡放大查看，详情里播放。
export function MusicLibrary({ onClose }: { onClose: () => void }) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(AudioSystem.getCurrentBGMUrl());
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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
    if (url === AudioSystem.getCurrentBGMUrl()) return; // 已在播放，避免对同曲重复切换导致崩溃
    AudioSystem.switchBGM(url);
    setPlayingUrl(url);
  };

  const openDetail = (i: number) => {
    setSelected(i);
    requestAnimationFrame(() => requestAnimationFrame(() => setDetailOpen(true)));
  };
  const closeDetail = () => {
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
          return (
            <div
              key={i}
              className="absolute w-44 h-64"
              style={{
                transform: mounted
                  ? `translateX(${off * 148}px) translateY(${Math.abs(off) * 16}px) rotate(${off * 7}deg)`
                  : 'translateX(0px) translateY(130px) rotate(0deg) scale(0.7)',
                opacity: mounted ? 1 : 0,
                zIndex: 30 - Math.abs(off),
                willChange: 'transform, opacity',
                transition: `transform 0.65s cubic-bezier(0.34,1.45,0.64,1) ${i * 0.07}s, opacity 0.45s ease ${i * 0.07}s`,
              }}
            >
              {/* 内层：纯 CSS hover，不与外层定位冲突 */}
              <div
                onClick={() => openDetail(i)}
                className="group relative w-full h-full rounded-2xl overflow-hidden hand-drawn-panel cursor-pointer transition-transform duration-300 hover:scale-[1.06] hover:-translate-y-3"
                style={{ boxShadow: isPlaying ? '0 0 0 3px #15803d, 0 14px 38px rgba(0,0,0,0.55)' : '0 10px 28px rgba(0,0,0,0.4)' }}
              >
                <div className="absolute inset-0" style={{ background: t.bg }} />
                {renderTrackTexture(i)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
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

      <button onClick={onClose} className="mt-12 hand-drawn-btn px-8 py-3 font-bold bg-white">收起</button>

      {/* 查看大卡详情 */}
      {selected !== null && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); closeDetail(); }}
          style={{ background: `rgba(2,6,23,${detailOpen ? 0.72 : 0})`, backdropFilter: `blur(${detailOpen ? 8 : 0}px)`, WebkitBackdropFilter: `blur(${detailOpen ? 8 : 0}px)`, transition: 'background 0.3s ease, backdrop-filter 0.3s ease' }}
        >
          <div
            className="relative w-72 h-[420px] rounded-3xl overflow-hidden hand-drawn-panel"
            style={{
              boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
              transform: detailOpen ? 'scale(1) translateY(0)' : 'scale(0.72) translateY(28px)',
              opacity: detailOpen ? 1 : 0,
              transition: 'transform 0.42s cubic-bezier(0.34,1.45,0.64,1), opacity 0.3s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0" style={{ background: TRACKS[selected].bg }} />
            {renderTrackTexture(selected)}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
            <div className="absolute top-5 left-5">
              <p className="text-white/60 text-[10px] font-mono tracking-[0.3em] uppercase mb-1">TRACK {selected + 1} / {n}</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-white text-2xl font-bold drop-shadow-lg mb-2 leading-tight">{TRACKS[selected].title}</p>
              <p className="text-white/75 text-[13px] leading-relaxed mb-4 italic">{(TRACKS[selected] as any).story}</p>
              <button
                onClick={() => play(TRACKS[selected].url)}
                className="w-full hand-drawn-btn px-5 py-3 font-bold bg-white"
              >
                {TRACKS[selected].url === playingUrl ? '♪ 正在播放' : '▶ 播放这首'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
