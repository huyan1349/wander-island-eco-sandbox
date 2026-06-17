import { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import { getFragmentById } from '../game/fragments';
import { AudioSystem } from '../lib/audio';

const PICK_COUNT = 10;

// 每签满幅手绘纹理（对齐音乐卡 renderTrackTexture：渐变之上的低透明笔触）。
function renderFortuneTexture(motif: string, accent: string) {
  const p = { fill: 'none', stroke: accent } as const;
  switch (motif) {
    case 'wave':
      return <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {[18, 34, 50, 66, 82, 100].map((y, i) => <path key={i} d={`M-5,${y} Q12,${y - 7} 30,${y} T65,${y} T100,${y} T135,${y}`} {...p} strokeWidth="1.1" opacity={0.42 - i * 0.05} strokeLinecap="round" />)}
      </svg>;
    case 'sprout':
      return <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {Array.from({ length: 18 }).map((_, i) => { const x = (i * 53) % 100, y = 16 + ((i * 37) % 100); return <path key={i} d={`M${x} ${y} v-11 M${x} ${y - 5} q-5 -3 -8 -9 M${x} ${y - 5} q5 -3 8 -9`} {...p} strokeWidth="0.7" opacity="0.26" strokeLinecap="round" />; })}
      </svg>;
    case 'petal':
      return <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {Array.from({ length: 16 }).map((_, i) => { const x = (i * 41) % 100, y = (i * 67) % 120; return <path key={i} d={`M${x} ${y} q3.5 -6 7 0 q-3.5 6 -7 0 Z`} fill={accent} stroke="none" opacity="0.22" />; })}
      </svg>;
    case 'wind':
      return <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {[18, 40, 62, 84, 106].map((y, i) => <path key={i} d={`M-6 ${y} C26 ${y - 16} 56 ${y + 14} 106 ${y - 6}`} {...p} strokeWidth="1" opacity={0.34 - i * 0.05} strokeLinecap="round" />)}
      </svg>;
    case 'lantern':
      return <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {[16, 38, 60, 82].map((x, i) => <g key={i} opacity={0.3 - i * 0.03}><line x1={x} y1="-5" x2={x} y2="125" stroke={accent} strokeWidth="0.5" />{[26, 58, 90].map(y => <circle key={y} cx={x} cy={y} r="2.4" fill={accent} opacity="0.5" />)}</g>)}
      </svg>;
    case 'moon':
      return <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {[0, 1, 2].map(i => <circle key={i} cx="50" cy="18" r={32 + i * 24} {...p} strokeWidth="0.7" opacity={0.26 - i * 0.06} />)}
        {Array.from({ length: 12 }).map((_, i) => <circle key={'s' + i} cx={(i * 31) % 100} cy={(i * 47) % 120} r="0.9" fill={accent} opacity="0.4" />)}
      </svg>;
    case 'leaf':
      return <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path d="M50 -5 L50 125" {...p} strokeWidth="0.7" opacity="0.32" />
        {Array.from({ length: 10 }).map((_, i) => { const y = 8 + i * 12; return <g key={i} opacity="0.22"><path d={`M50 ${y} l-28 -11`} {...p} strokeWidth="0.6" /><path d={`M50 ${y} l28 -11`} {...p} strokeWidth="0.6" /></g>; })}
      </svg>;
    case 'ripple':
      return <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {[10, 22, 34, 46, 58, 70].map((r, i) => <circle key={i} cx="50" cy="60" r={r} {...p} strokeWidth="0.8" opacity={0.32 - i * 0.045} />)}
      </svg>;
    case 'star':
      return <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {Array.from({ length: 18 }).map((_, i) => { const x = (i * 43) % 100, y = (i * 29) % 120; return <circle key={i} cx={x} cy={y} r={i % 4 ? 0.9 : 1.7} fill={accent} opacity="0.42" />; })}
        <path d="M14 24 L40 16 L58 40 L84 30" {...p} strokeWidth="0.5" opacity="0.3" />
      </svg>;
    case 'bare':
    default:
      return <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {[20, 50, 80].map((x, i) => <g key={i} opacity="0.22"><path d={`M${x} 125 L${x} 36`} {...p} strokeWidth="0.7" /><path d={`M${x} 72 l-13 -11 M${x} 60 l13 -13 M${x} 84 l-10 -9`} {...p} strokeWidth="0.6" /></g>)}
      </svg>;
  }
}

export function FragmentRevealModal() {
  const pendingFragment = useGameStore(s => s.pendingFragment);
  const dismissFragment = useGameStore(s => s.dismissFragment);
  const frag = pendingFragment ? getFragmentById(pendingFragment) : null;

  const [phase, setPhase] = useState<'pick' | 'reveal'>('pick');
  const [picked, setPicked] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!pendingFragment) return;
    setPhase('pick'); setPicked(null); setFlipped(false); setMounted(false);
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, [pendingFragment]);

  if (!frag) return null;

  const mid = (PICK_COUNT - 1) / 2;
  const choose = (i: number) => {
    AudioSystem.playClick();
    setPicked(i);
    setTimeout(() => setPhase('reveal'), 280);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      onClick={() => { if (phase === 'reveal') dismissFragment(); }}
      style={{ background: 'rgba(6,12,10,0.8)', backdropFilter: 'blur(10px)', animation: 'fragOverlayIn 0.4s ease forwards' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 44%, ${phase === 'reveal' ? frag.tierColor + '2e' : 'rgba(74,222,128,0.12)'}, transparent 58%)`, transition: 'background 0.6s ease' }} />

      {phase === 'pick' ? (
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center">
          <p className="hand-drawn-title text-4xl text-[#f0fdf4] mb-2" style={{ textShadow: '0 4px 18px rgba(0,0,0,0.55)' }}>神树落叶</p>
          <p className="text-white/45 text-[11px] tracking-[0.4em] mb-10">挑一片 · 读它没说完的话</p>

          <div className="relative flex items-end justify-center" style={{ height: 220, width: '92vw', maxWidth: 820 }}>
            {Array.from({ length: PICK_COUNT }).map((_, i) => {
              const off = i - mid;
              const isPicked = picked === i;
              return (
                <div
                  key={i}
                  onClick={() => picked === null && choose(i)}
                  className="absolute"
                  style={{
                    width: 116, height: 166, cursor: picked === null ? 'pointer' : 'default', transformOrigin: 'bottom center',
                    transform: mounted
                      ? `translateX(${off * 62}px) translateY(${Math.abs(off) * 9}px) rotate(${off * 5}deg) ${isPicked ? 'translateY(-46px) scale(1.14)' : ''}`
                      : 'translateY(150px) scale(0.7)',
                    opacity: mounted ? (picked !== null && !isPicked ? 0 : 1) : 0,
                    zIndex: isPicked ? 80 : 40 - Math.abs(off),
                    transition: `transform 0.6s cubic-bezier(0.34,1.45,0.64,1) ${mounted ? 0 : i * 0.05}s, opacity 0.5s ease ${picked !== null && !isPicked ? 0 : i * 0.05}s`,
                    willChange: 'transform, opacity',
                  }}
                >
                  <div
                    className="w-full h-full hand-drawn-panel overflow-hidden"
                    style={{ background: 'radial-gradient(ellipse at 50% 0%, #245538 0%, #16321f 60%, #0e2017 100%)' }}
                    onMouseEnter={(e) => { if (picked === null) { e.currentTarget.style.transform = 'translateY(-16px)'; e.currentTarget.style.boxShadow = '7px 7px 0 #2d3436'; AudioSystem.playTap(); } }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" style={{ opacity: 0.5 }}>
                      <path d="M50 12 V142" fill="none" stroke="#86efac" strokeWidth="1" opacity="0.5" />
                      {[28, 48, 68, 88, 108, 128].map((y, k) => <g key={k} opacity={0.4 - k * 0.03}><path d={`M50 ${y} q-22 -7 -34 -23`} fill="none" stroke="#4ade80" strokeWidth="0.8" /><path d={`M50 ${y} q22 -7 34 -23`} fill="none" stroke="#4ade80" strokeWidth="0.8" /></g>)}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-md flex items-center justify-center text-[#bbf7d0] text-base font-black" style={{ border: '1.5px solid rgba(134,239,172,0.5)', background: 'rgba(20,50,31,0.5)' }}>签</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-white/30 text-[11px] tracking-[0.3em] mt-9">悬停拾起 · 点击翻开</p>
        </div>
      ) : (
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-4">
          <div style={{ perspective: 1200, animation: 'fragCardIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div
              onClick={(e) => { e.stopPropagation(); AudioSystem.playToggle(); setFlipped(f => !f); }}
              className="relative w-72 h-[420px] cursor-pointer"
              style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.65s cubic-bezier(0.4,0.2,0.2,1)', boxShadow: `0 30px 70px rgba(0,0,0,0.6)`, borderRadius: 24 }}
            >
              {/* 正面：神谕 + 故事 */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden hand-drawn-panel" style={{ backfaceVisibility: 'hidden' }}>
                <div className="absolute inset-0" style={{ background: frag.bg }} />
                {renderFortuneTexture(frag.motif, frag.tierColor)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/15" />
                <div className="absolute top-4 left-4 w-12 h-12 rounded-full flex flex-col items-center justify-center bg-[#fcf8ec] border-2 border-slate-800" style={{ boxShadow: '0 3px 0 rgba(45,52,54,1)' }}>
                  <span className="text-[7px] text-slate-500 tracking-widest leading-none">今日</span>
                  <span className="text-lg font-black leading-none" style={{ color: frag.tierColor }}>{frag.tier}</span>
                </div>
                <p className="absolute top-5 right-5 text-white/55 text-[10px] font-mono tracking-[0.3em] uppercase">神树 · 今日签</p>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white text-2xl font-black drop-shadow-lg mb-2 leading-tight tracking-widest">{frag.title}</p>
                  <p className="text-white text-[15px] font-bold leading-snug mb-3 drop-shadow">{frag.oracle}</p>
                  <p className="text-white/75 text-[12.5px] leading-relaxed italic">{frag.story}</p>
                </div>
              </div>

              {/* 背面：宜 / 忌 / 印记 */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden hand-drawn-panel bg-[#fcf8ec] p-7 flex flex-col" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <p className="text-slate-400 text-[10px] font-mono tracking-[0.3em] uppercase text-center mb-4">叶笺 · 宜忌</p>
                <p className="hand-drawn-title text-2xl text-center mb-7" style={{ color: frag.tierColor }}>{frag.title}</p>
                <div className="flex-1 flex flex-col justify-center gap-6">
                  <div className="text-center">
                    <p className="text-emerald-600 text-xs tracking-[0.3em] mb-1 font-bold">宜</p>
                    <p className="text-slate-700 text-[15px] font-bold">{frag.good}</p>
                  </div>
                  <div className="w-16 h-px bg-slate-300 self-center" />
                  <div className="text-center">
                    <p className="text-rose-600 text-xs tracking-[0.3em] mb-1 font-bold">忌</p>
                    <p className="text-slate-700 text-[15px] font-bold">{frag.avoid}</p>
                  </div>
                </div>
                <div className="self-center mt-4 w-12 h-12 rounded-md flex items-center justify-center font-black text-base" style={{ border: `2px solid ${frag.tierColor}`, color: frag.tierColor, background: `${frag.tierColor}14`, writingMode: 'vertical-rl', transform: 'rotate(-5deg)' }}>{frag.keyword.slice(0, 2)}</div>
              </div>
            </div>
          </div>

          <p className="text-white/55 text-xs tracking-[0.25em] pointer-events-none">{flipped ? '点击卡片 · 翻回正面' : '点击卡片 · 看宜忌'}</p>
          <button onClick={dismissFragment} className="hand-drawn-btn px-9 py-3 font-bold bg-white" style={{ animation: 'fragTextIn 0.5s 0.3s both' }}>收 下 这 片 叶</button>
        </div>
      )}
    </div>
  );
}
