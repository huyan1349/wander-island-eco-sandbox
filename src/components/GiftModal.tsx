import { useState, useEffect } from 'react';
import { createGiftLink, fetchGift, applyIslandData, captureScreenshot, GiftPayload } from '../utils/islandIO';

// 高级 3D 翻转礼物卡：正面=截图底图+岛名，背面=在卡上手写寄语(create)/展示寄语(claim)。
// 漂浮动画放外层、翻转放内层，避免 transform 冲突导致翻不动。
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
  const [gift, setGift] = useState<GiftPayload | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (mode === 'create') {
      setShot(captureScreenshot());
    } else if (giftId) {
      fetchGift(giftId)
        .then((g) => { setGift(g); setTimeout(() => setFlipped(true), 800); })
        .catch(() => setErr('礼物不存在或已失效'));
    }
  }, [mode, giftId]);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const l = await createGiftLink({ fromName: fromName || '匿名', toName, message, screenshot: shot });
      setLink(l);
    } finally {
      setBusy(false);
    }
  };
  const copy = () => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const enter = () => {
    if (!gift) return;
    const n = gift.fromName ? `${gift.name || '小岛'} (来自 ${gift.fromName})` : (gift.name || '礼物小岛');
    applyIslandData(gift.data, n);
    onClose();
  };

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
        @keyframes sheen{0%{transform:translateX(-130%) skewX(-20deg)}100%{transform:translateX(240%) skewX(-20deg)}}
      `}</style>

      <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-5">
        {/* 漂浮层（只做 translateY，不与翻转冲突） */}
        <div style={{ perspective: 1200 }}>
          <div style={{ animation: 'giftHover 4s ease-in-out infinite' }}>
            {/* 翻转层 */}
            <div
              className="relative w-64 h-96"
              style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.7s cubic-bezier(0.4,0.2,0.2,1)',
              }}
            >
              {/* 正面：截图 + 岛名 */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden hand-drawn-panel" style={{ backfaceVisibility: 'hidden' }}>
                {frontShot
                  ? <img src={frontShot} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 bg-gradient-to-br from-emerald-200 to-sky-200" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-0 -left-1/3 w-1/3 h-full bg-white/25" style={{ animation: 'sheen 4.5s ease-in-out infinite' }} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-white/60 text-[10px] font-mono tracking-[0.3em] uppercase mb-1">A Gift Island</p>
                  <p className="text-white text-2xl font-bold drop-shadow-lg leading-tight">{cardName}</p>
                </div>
                {/* 翻面引导 */}
                {mode === 'create' && !link && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
                    className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/90 text-slate-800 text-[11px] font-bold shadow-lg hover:bg-white transition-colors animate-pulse"
                  >
                    ✍ 翻面写寄语
                  </button>
                )}
              </div>

              {/* 背面：create=在卡上填写；claim=展示寄语 */}
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

        {/* 卡外操作区 */}
        {mode === 'create' ? (
          <div className="w-64 flex flex-col gap-2">
            {!link ? (
              <button onClick={handleGenerate} disabled={busy} className="hand-drawn-btn px-5 py-3 font-bold bg-white">
                {busy ? '封装中…' : '🎁 封装这张礼物卡'}
              </button>
            ) : (
              <>
                <div className="px-3 py-2 rounded-xl bg-white/95 border-2 border-slate-300 text-[11px] break-all text-slate-600 max-h-20 overflow-auto">{link}</div>
                <button onClick={copy} className="hand-drawn-btn px-5 py-3 font-bold bg-white">{copied ? '✓ 已复制链接' : '复制链接送给 TA'}</button>
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
