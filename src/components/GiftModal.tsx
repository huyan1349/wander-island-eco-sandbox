import { useState, useEffect } from 'react';
import { createGiftLink, fetchGift, applyIslandData, captureScreenshot, GiftPayload } from '../utils/islandIO';

// 真 3D 礼物卡：鼠标视差倾斜(rotateX/Y 跟随) + 跟随高光 + 翻面 + 漂浮 + 光环绽放。
// 层次：入场(scale)·漂浮(translateY)·倾斜(rotateX/Y 跟随)·翻转(rotateY)，各层独立不冲突。
export function GiftModal({ mode, giftId, fromName, islandName, onClose }: {
  mode: 'create' | 'claim';
  giftId?: string;
  fromName?: string;
  islandName?: string;
  onClose: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [shot, setShot] = useState('');
  const [toName, setToName] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [petals, setPetals] = useState(false);
  const [gift, setGift] = useState<GiftPayload | null>(null);
  const [err, setErr] = useState('');
  const [tilt, setTilt] = useState({ x: 0, y: 0, gx: 50, gy: 50, active: false });

  useEffect(() => {
    if (mode === 'create') {
      setShot(captureScreenshot());
    } else if (giftId) {
      fetchGift(giftId)
        .then((g) => { setGift(g); setTimeout(() => { setFlipped(true); setPetals(true); }, 900); })
        .catch(() => setErr('礼物不存在或已失效'));
    }
  }, [mode, giftId]);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const l = await createGiftLink({ fromName: fromName || '匿名', toName, message, screenshot: shot });
      setLink(l);
      setFlipped(false);
      setPetals(true);
    } finally {
      setBusy(false);
    }
  };
  const copy = () => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // 把礼物卡渲染成一张带游戏水印+链接的图片下载（用于宣传/分享）
  const downloadCard = () => {
    const W = 640, H = 900, imgH = Math.round(H * 0.64);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const wrap = (text: string, x: number, y: number, maxW: number, lh: number) => {
      let line = '', yy = y;
      for (const ch of [...text]) {
        if (ctx.measureText(line + ch).width > maxW && line) { ctx.fillText(line, x, yy); line = ch; yy += lh; }
        else line += ch;
      }
      ctx.fillText(line, x, yy);
    };

    const render = (img?: HTMLImageElement) => {
      // 顶部图片（cover 裁切）
      if (img) {
        const tar = W / imgH, ar = img.width / img.height;
        let sw = img.width, sh = img.height, sx = 0, sy = 0;
        if (ar > tar) { sw = img.height * tar; sx = (img.width - sw) / 2; }
        else { sh = img.width / tar; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, imgH);
      } else {
        const g = ctx.createLinearGradient(0, 0, W, imgH); g.addColorStop(0, '#a7f3d0'); g.addColorStop(1, '#bae6fd');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, imgH);
      }
      const vg = ctx.createLinearGradient(0, 0, 0, imgH);
      vg.addColorStop(0, 'rgba(0,0,0,0.05)'); vg.addColorStop(1, 'rgba(0,0,0,0.68)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, imgH);

      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '600 16px monospace';
      ctx.fillText('A GIFT ISLAND', 44, imgH - 80);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif';
      ctx.fillText(cardName, 42, imgH - 34);

      // 底部纸区
      ctx.fillStyle = '#fcf8ec'; ctx.fillRect(0, imgH, W, H - imgH);
      if (message) {
        ctx.fillStyle = '#475569'; ctx.font = 'italic 22px sans-serif'; ctx.textAlign = 'center';
        wrap(`「${message}」`, W / 2, imgH + 56, W - 110, 32);
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8'; ctx.font = '13px monospace';
      ctx.fillText('打开链接 · 收下这座小岛', W / 2, H - 96);
      ctx.fillStyle = '#64748b'; ctx.font = '12px monospace';
      ctx.fillText(link.length > 56 ? link.slice(0, 56) + '…' : link, W / 2, H - 74);
      ctx.textAlign = 'left';

      // 游戏水印
      ctx.fillStyle = '#15803d'; ctx.font = 'bold 24px sans-serif';
      ctx.fillText('🌿 Wander Island', 42, H - 30);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '12px monospace'; ctx.textAlign = 'right';
      ctx.fillText('漫游岛 · 生态沙盒', W - 42, H - 32); ctx.textAlign = 'left';

      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `wander-island-gift-${cardName}.png`;
      a.click();
    };

    if (shot) { const im = new Image(); im.onload = () => render(im); im.src = shot; } else render();
  };
  const enter = () => {
    if (!gift) return;
    const n = gift.fromName ? `${gift.name || '小岛'} (来自 ${gift.fromName})` : (gift.name || '礼物小岛');
    applyIslandData(gift.data, n);
    onClose();
  };

  const onMove = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ x: (0.5 - py) * 26, y: (px - 0.5) * 26, gx: px * 100, gy: py * 100, active: true });
  };
  const onLeave = () => setTilt({ x: 0, y: 0, gx: 50, gy: 50, active: false });

  const ge: any = (gift?.data as any)?._gift;
  const frontShot = mode === 'create' ? shot : (ge?.screenshot || '');
  const cardName = mode === 'create' ? (islandName || '我的小岛') : (gift?.name || '一座小岛');

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <style>{`
        @keyframes giftHover{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes sheen{0%{transform:translateX(-130%) skewX(-20deg);opacity:0}8%{opacity:.55}26%{transform:translateX(240%) skewX(-20deg);opacity:0}100%{transform:translateX(240%) skewX(-20deg);opacity:0}}
        @keyframes cardEnter{0%{opacity:0;transform:scale(0.6) translateY(40px)}60%{opacity:1;transform:scale(1.06) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes petalFall{0%{transform:translateY(-30px) rotate(0deg);opacity:0}15%{opacity:.95}100%{transform:translateY(460px) rotate(380deg);opacity:0}}
        @keyframes glowPulse{0%,100%{opacity:.35}50%{opacity:.6}}
        @keyframes ringBurst{0%{transform:translate(-50%,-50%) scale(0.5);opacity:.7}100%{transform:translate(-50%,-50%) scale(1.7);opacity:0}}
      `}</style>

      {/* 遮罩柔光晕 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 42%, rgba(251,207,232,0.18), transparent 55%)', animation: 'glowPulse 5s ease-in-out infinite' }} />

      {/* 樱花瓣飘落 */}
      {petals && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="absolute text-lg" style={{ left: `${i * 7 + (i % 3) * 3}%`, top: -24, animation: `petalFall ${2.6 + (i % 4) * 0.7}s ease-in ${i * 0.18}s forwards` }}>🌸</div>
          ))}
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()} className="relative flex flex-col items-center gap-5">
        {/* 进场光环绽放 */}
        <div className="absolute left-1/2 top-44 w-72 h-72 rounded-full pointer-events-none" style={{ border: '2px solid rgba(251,207,232,0.6)', animation: 'ringBurst 1.1s ease-out 0.2s both' }} />

        {/* 入场层 + 3D 透视 */}
        <div style={{ perspective: 1000, animation: 'cardEnter 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}>
          {/* 漂浮层 */}
          <div style={{ animation: tilt.active ? 'none' : 'giftHover 4s ease-in-out infinite' }}>
            {/* 倾斜层（跟随鼠标，真 3D） */}
            <div
              onPointerMove={onMove}
              onPointerLeave={onLeave}
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: tilt.active ? 'transform 0.08s linear' : 'transform 0.5s ease',
              }}
            >
              {/* 翻转层 */}
              <div
                className="relative w-64 h-96"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transition: 'transform 0.7s cubic-bezier(0.4,0.2,0.2,1)',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                  borderRadius: 24,
                }}
              >
                {/* 正面 */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden hand-drawn-panel" style={{ backfaceVisibility: 'hidden' }}>
                  {frontShot
                    ? <img src={frontShot} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    : <div className="absolute inset-0 bg-gradient-to-br from-emerald-200 to-sky-200" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" />
                  {/* 跟随鼠标的高光（全息感） */}
                  <div className="absolute inset-0 pointer-events-none mix-blend-overlay" style={{ background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.55), transparent 45%)`, opacity: tilt.active ? 1 : 0, transition: 'opacity 0.3s' }} />
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 -left-1/3 w-1/3 h-full bg-white/25" style={{ animation: 'sheen 6s ease-in-out infinite' }} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-white/60 text-[10px] font-mono tracking-[0.3em] uppercase mb-1">A Gift Island</p>
                    <p className="text-white text-2xl font-bold drop-shadow-lg leading-tight">{cardName}</p>
                  </div>
                  {mode === 'create' && !link && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
                      className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/90 text-slate-800 text-[11px] font-bold shadow-lg hover:bg-white transition-colors animate-pulse"
                    >
                      ✍ 翻面写寄语
                    </button>
                  )}
                </div>

                {/* 背面 */}
                <div
                  className="absolute inset-0 rounded-3xl overflow-hidden hand-drawn-panel bg-[#fcf8ec] p-6 flex flex-col"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {mode === 'create' ? (
                    <>
                      <p className="text-slate-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-3 text-center">写一张寄语卡</p>
                      <input
                        value={toName} onChange={(e) => setToName(e.target.value)} placeholder="致 · 谁"
                        className="mb-3 px-3 py-2 rounded-lg border-b-2 border-slate-300 focus:border-slate-700 outline-none text-sm bg-transparent text-center font-bold text-slate-800"
                      />
                      <textarea
                        value={message} onChange={(e) => setMessage(e.target.value)} placeholder="写下你想对 TA 说的话…"
                        className="flex-1 px-2 py-2 outline-none text-base resize-none bg-transparent text-slate-700 leading-relaxed text-center italic"
                      />
                      <div className="border-t-2 border-dashed border-slate-300 pt-3 text-right">
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest">From</p>
                        <p className="text-slate-800 font-bold">{fromName || '匿名'}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
                        className="absolute top-4 left-4 text-slate-400 text-[11px] font-bold hover:text-slate-700"
                      >← 看正面</button>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-4 text-center">致 · {ge?.toName || '你'}</p>
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-slate-700 text-base leading-relaxed text-center italic">
                          {gift?.message ? `「${gift.message}」` : '愿这座小岛陪你慢下来。'}
                        </p>
                      </div>
                      <div className="border-t-2 border-dashed border-slate-300 pt-3 text-right">
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest">From</p>
                        <p className="text-slate-800 font-bold">{gift?.fromName || '匿名'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 卡外操作区 */}
        {mode === 'create' ? (
          <div className="w-64 flex flex-col gap-2">
            {!link ? (
              <button onClick={handleGenerate} disabled={busy} className="hand-drawn-btn px-5 py-3 font-bold bg-white">
                {busy ? '✦ 封装中…' : '🎁 封装这张礼物卡'}
              </button>
            ) : (
              <>
                <div className="px-3 py-2 rounded-xl bg-white/95 border-2 border-slate-300 text-[11px] break-all text-slate-600 max-h-20 overflow-auto">{link}</div>
                <button onClick={copy} className="hand-drawn-btn px-5 py-3 font-bold bg-white">{copied ? '✓ 已复制链接' : '复制链接送给 TA'}</button>
                <button onClick={downloadCard} className="hand-drawn-btn px-5 py-3 font-bold bg-white">⬇ 下载礼物卡图片（含链接）</button>
              </>
            )}
            <button onClick={onClose} className="text-white/50 text-sm py-1">关闭</button>
          </div>
        ) : (
          <div className="w-64 flex flex-col gap-2">
            {err
              ? <p className="text-rose-300 text-center font-bold">{err}</p>
              : <button onClick={enter} disabled={!gift} className="hand-drawn-btn px-5 py-3 font-bold bg-white">{gift ? '🏝 收下并进入小岛' : '加载中…'}</button>}
            <button onClick={onClose} className="text-white/50 text-sm py-1">以后再说</button>
          </div>
        )}
      </div>
    </div>
  );
}
