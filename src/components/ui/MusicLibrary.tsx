import { useState, useEffect } from 'react';
import { AudioSystem } from '../../lib/audio';
import { TRACKS, renderTrackTexture } from './musicData';

// 音乐收藏库：所有曲目扇形摊开（像展开的牌），点卡播放，当前曲浮起+进度条。
export function MusicLibrary({ onClose }: { onClose: () => void }) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(AudioSystem.getCurrentBGMUrl());
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPlayingUrl(AudioSystem.getCurrentBGMUrl());
      setProgress(AudioSystem.getBGMProgress());
    }, 250);
    return () => clearInterval(id);
  }, []);

  const play = (url: string) => { AudioSystem.switchBGM(url); setPlayingUrl(url); };
  const n = TRACKS.length;
  const mid = (n - 1) / 2;

  return (
    <div className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-lg animate-in fade-in duration-300" onClick={onClose}>
      <style>{`@keyframes libEnter{0%{opacity:0;transform:translateY(60px) rotate(0deg) scale(0.8)}100%{opacity:1}}`}</style>

      <p className="hand-drawn-title text-4xl text-white mb-2 -rotate-1">音乐收藏库</p>
      <p className="text-white/40 text-[11px] font-mono tracking-[0.3em] uppercase mb-12">{n} TRACKS · 点击卡片播放</p>

      <div className="relative flex items-end justify-center" style={{ height: 320, width: '92vw', maxWidth: 880 }} onClick={(e) => e.stopPropagation()}>
        {TRACKS.map((t, i) => {
          const off = i - mid;
          const isPlaying = t.url === playingUrl;
          const rot = off * 7;
          const tx = off * 148;
          const ty = Math.abs(off) * 16;
          return (
            <div
              key={i}
              onClick={() => play(t.url)}
              className="absolute w-44 h-64 rounded-2xl overflow-hidden hand-drawn-panel cursor-pointer"
              style={{
                transform: `translateX(${tx}px) translateY(${isPlaying ? -44 : ty}px) rotate(${isPlaying ? 0 : rot}deg) scale(${isPlaying ? 1.12 : 1})`,
                transition: 'transform 0.45s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.3s',
                zIndex: isPlaying ? 60 : 30 - Math.abs(off),
                boxShadow: isPlaying ? '0 24px 55px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.45)',
                animation: `libEnter 0.5s ease-out ${i * 0.08}s both`,
              }}
              onMouseEnter={(e) => { if (!isPlaying) e.currentTarget.style.transform = `translateX(${tx}px) translateY(${ty - 24}px) rotate(${rot}deg) scale(1.05)`; }}
              onMouseLeave={(e) => { if (!isPlaying) e.currentTarget.style.transform = `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg) scale(1)`; }}
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
          );
        })}
      </div>

      <button onClick={onClose} className="mt-12 hand-drawn-btn px-8 py-3 font-bold bg-white">收起</button>
    </div>
  );
}
