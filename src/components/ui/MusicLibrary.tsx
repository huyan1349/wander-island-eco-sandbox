import { useState, useEffect } from 'react';
import { AudioSystem } from '../../lib/audio';
import { TRACKS, renderTrackTexture } from './musicData';

// 音乐收藏库：曲目扇形摊开（双层结构避免 hover 抖动），点卡放大查看，详情里播放。
export function MusicLibrary({ onClose }: { onClose: () => void }) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(AudioSystem.getCurrentBGMUrl());
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

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
  const n = TRACKS.length;
  const mid = (n - 1) / 2;

  return (
    <div className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-lg animate-in fade-in duration-300" onClick={onClose}>
      <style>{`@keyframes libEnter{from{opacity:0;transform:translateY(50px) scale(0.85)}to{opacity:1}}`}</style>

      <p className="hand-drawn-title text-4xl text-white mb-2 -rotate-1">音乐收藏库</p>
      <p className="text-white/40 text-[11px] font-mono tracking-[0.3em] uppercase mb-12">{n} TRACKS · 点击卡片查看</p>

      <div className="relative flex items-end justify-center" style={{ height: 320, width: '92vw', maxWidth: 880 }} onClick={(e) => e.stopPropagation()}>
        {TRACKS.map((t, i) => {
          const off = i - mid;
          const isPlaying = t.url === playingUrl;
          return (
            <div
              key={i}
              className="absolute w-44 h-64"
              style={{
                transform: `translateX(${off * 148}px) translateY(${Math.abs(off) * 16}px) rotate(${off * 7}deg)`,
                zIndex: 30 - Math.abs(off),
                willChange: 'transform',
                animation: `libEnter 0.45s ease-out ${i * 0.07}s both`,
              }}
            >
              {/* 内层：纯 CSS hover，不与外层定位冲突 */}
              <div
                onClick={() => setSelected(i)}
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
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelected(null)}>
          <div
            className="relative w-72 h-[420px] rounded-3xl overflow-hidden hand-drawn-panel animate-in zoom-in-95 duration-300"
            style={{ boxShadow: '0 30px 70px rgba(0,0,0,0.6)' }}
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
