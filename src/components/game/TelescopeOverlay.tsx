import { useState, useEffect } from 'react';
import { useGameStore } from '../../store';
import { CONSTELLATIONS, type Constellation } from '../../game/constellations';
import { AudioSystem } from '../../lib/audio';

const zcool = { fontFamily: "'ZCOOL KuaiLe', cursive" };
const zoomBy = (d: number) => (window as any).__telescopeZoom?.(d);

// 把星座节点偏移映射到卡面 SVG 坐标（100×100，留白 18）
function constellationSvg(c: Constellation) {
  const xs = c.nodes.map((n) => n[0]), ys = c.nodes.map((n) => n[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1), span = Math.max(spanX, spanY);
  const map = (n: [number, number]): [number, number] => [
    50 + ((n[0] - (minX + maxX) / 2) / span) * 64,
    50 - ((n[1] - (minY + maxY) / 2) / span) * 64, // 仰角向上 → SVG 向上
  ];
  return { pts: c.nodes.map(map), edges: c.edges };
}

// 观星台的 2D 覆层：望远镜目镜镜筒 + 准星 + 变焦 + 星图进度 + 连成星座的揭晓星卡。
// 手绘绘本风（奶油底 / 黑描边 / 硬阴影 / 黄铜镜圈），对齐游戏 UI。
export function TelescopeOverlay() {
  const isObservatoryMode = useGameStore((s) => s.isObservatoryMode);
  const unlocked = useGameStore((s) => s.unlockedConstellations);
  const revealId = useGameStore((s) => s.revealedStarCardId);
  const dismiss = useGameStore((s) => s.dismissStarCard);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { setFlipped(false); }, [revealId]); // 新卡默认正面

  if (!isObservatoryMode) return null;
  const con = revealId ? CONSTELLATIONS.find((c) => c.id === revealId) ?? null : null;
  const card = con?.card ?? null;

  return (
    <>
      <style>{`
        @keyframes scopeMaskIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scopeRingIn { from { opacity: 0; transform: translate(-50%,-50%) scale(1.12) } to { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
        @keyframes starCardIn { 0% { opacity: 0; transform: rotate(-1.5deg) scale(.82) } 62% { opacity: 1; transform: rotate(-1.5deg) scale(1.04) } 100% { transform: rotate(-1.5deg) scale(1) } }
        @keyframes chipIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      {/* 目镜镜筒：圆形暗角，外圈全黑，中心透亮 */}
      <div className="absolute inset-0 z-40 pointer-events-none" style={{
        background: 'radial-gradient(circle 52vmin at 50% 50%, transparent 0 36vmin, rgba(6,5,16,0.55) 40vmin, rgba(4,3,10,0.97) 50vmin)',
        animation: 'scopeMaskIn 0.8s ease both',
      }} />
      {/* 黄铜镜圈 */}
      <div className="absolute left-1/2 top-1/2 z-40 pointer-events-none rounded-full"
        style={{
          width: '76vmin', height: '76vmin', transform: 'translate(-50%,-50%)',
          border: '7px solid #0f172a',
          boxShadow: 'inset 0 0 0 7px #c8a05a, inset 0 0 60px rgba(0,0,0,0.9), inset 0 0 24px rgba(255,221,150,0.12), 0 0 0 3px #0f172a, 8px 8px 0 rgba(15,23,42,0.6)',
          animation: 'scopeRingIn 0.8s cubic-bezier(.2,.8,.2,1) both',
        }} />
      {/* 准星 */}
      <div className="absolute left-1/2 top-1/2 z-40 pointer-events-none" style={{ transform: 'translate(-50%,-50%)', animation: 'scopeMaskIn 1.1s ease 0.3s both' }}>
        <div className="absolute bg-amber-200/25" style={{ width: '1px', height: '14vmin', left: 0, top: '-7vmin' }} />
        <div className="absolute bg-amber-200/25" style={{ height: '1px', width: '14vmin', top: 0, left: '-7vmin' }} />
        <div className="absolute rounded-full border border-amber-200/30" style={{ width: '3.2vmin', height: '3.2vmin', left: '-1.6vmin', top: '-1.6vmin' }} />
      </div>

      {/* 操作提示 */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="bg-[#fcf8ec]/90 border-2 border-slate-800 px-4 py-1.5 rounded-full shadow-[2px_2px_0_rgba(30,41,59,1)] text-slate-700 font-bold text-sm" style={zcool}>
          拖动摆镜 · 滚轮变焦 · 点星连成图
        </div>
      </div>

      {/* 变焦按钮 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 pointer-events-auto">
        {[['－', -0.2], ['＋', 0.2]].map(([t, d]) => (
          <button key={t as string}
            className="w-12 h-12 bg-[#fcf8ec] hover:bg-amber-200 border-[3px] border-slate-800 rounded-full shadow-[3px_3px_0_rgba(30,41,59,1)] hover:shadow-[1px_1px_0_rgba(30,41,59,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-slate-800 text-2xl font-black flex items-center justify-center"
            style={zcool}
            onClick={() => { zoomBy(d as number); AudioSystem.playPop(); }}>
            {t}
          </button>
        ))}
      </div>

      {/* 星图进度 */}
      <div className="absolute top-16 right-6 z-50 pointer-events-none">
        <div className="bg-[#fcf8ec] border-[3px] border-slate-800 px-4 py-2 rounded-full shadow-[3px_3px_0_rgba(30,41,59,1)] rotate-[2deg] flex items-center gap-2">
          <span className="text-slate-800 font-black" style={zcool}>星图</span>
          <span className="text-amber-600 font-black text-lg">{unlocked.length}</span>
          <span className="text-slate-500 font-bold">/ {CONSTELLATIONS.length}</span>
        </div>
      </div>

      {/* 揭晓星卡：竖版翻面卡，对齐音乐长廊 */}
      {card && con && (() => {
        const svg = constellationSvg(con);
        return (
          <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-slate-950/72 backdrop-blur-md pointer-events-auto"
            onClick={() => { dismiss(); AudioSystem.playClose(); }}>
            <div style={{ perspective: 1200, animation: 'starCardIn 0.55s cubic-bezier(.2,.8,.25,1.3) both' }} onClick={(e) => e.stopPropagation()}>
              <div onClick={() => { AudioSystem.playTap(); setFlipped((f) => !f); }}
                className="relative w-72 h-[420px] cursor-pointer"
                style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.6s cubic-bezier(0.4,0.2,0.2,1)', boxShadow: '0 30px 70px rgba(0,0,0,0.6)', borderRadius: 24 }}>
                {/* 正面：星座图 + 名 + 神谕 */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden hand-drawn-panel" style={{ backfaceVisibility: 'hidden' }}>
                  <div className="absolute inset-0" style={{ background: card.bg, backgroundColor: '#0b1020' }} />
                  {/* 星座连线纹理 */}
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-90" preserveAspectRatio="xMidYMid meet">
                    {svg.edges.map(([a, b], i) => (
                      <line key={i} x1={svg.pts[a][0]} y1={svg.pts[a][1]} x2={svg.pts[b][0]} y2={svg.pts[b][1]}
                        stroke="#ffd9a0" strokeWidth={0.6} strokeLinecap="round" opacity={0.7} />
                    ))}
                    {svg.pts.map((p, i) => (
                      <circle key={i} cx={p[0]} cy={p[1]} r={1.5} fill="#fff3d6" stroke="#ffcf87" strokeWidth={0.5} />
                    ))}
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/15" />
                  <p className="absolute top-5 left-5 text-white/55 text-[10px] font-mono tracking-[0.3em] uppercase">{card.latin}</p>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="hand-drawn-title text-3xl text-white drop-shadow-lg mb-2 leading-tight">{card.title}座</p>
                    <p className="text-amber-100/90 text-[13px] leading-relaxed italic">{card.oracle}</p>
                  </div>
                </div>
                {/* 背面：岛屿故事 */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden hand-drawn-panel bg-[#fcf8ec] p-7 flex flex-col"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  <p className="text-slate-400 text-[10px] font-mono tracking-[0.3em] uppercase text-center mb-4">星之卡 · 岛屿絮语</p>
                  <p className="hand-drawn-title text-2xl text-slate-800 text-center mb-6 -rotate-1">{card.title}座</p>
                  <p className="flex-1 text-slate-600 text-[13px] leading-loose">{card.story}</p>
                  <div className="mt-4 text-center">
                    <span className="inline-block px-4 py-1 border-2 border-slate-300 rounded-full text-slate-500 text-sm font-bold tracking-widest">{card.keyword}</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-white/50 text-xs font-mono tracking-[0.25em] pointer-events-none">{flipped ? '点击卡片 · 翻回正面' : '点击卡片 · 看背面'}</p>
            <button className="hand-drawn-btn px-8 py-3 font-bold bg-white" style={zcool}
              onClick={() => { dismiss(); AudioSystem.playTap(); }}>收下这片星光</button>
          </div>
        );
      })()}
    </>
  );
}
