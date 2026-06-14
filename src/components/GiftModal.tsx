import { useState, useEffect } from 'react';
import { createGiftLink, fetchGift, applyIslandData, captureScreenshot, GiftPayload } from '../utils/islandIO';

// 高级 3D 翻转礼物卡：正面=截图底图+岛名，背面=留言+赠送人/接收人。
// mode='create' 生成礼物卡+链接；mode='claim' 拆开收到的礼物卡。
export function GiftModal({ mode, giftId, fromName, islandName, onClose }: {
  mode: 'create' | 'claim';
  giftId?: string;
  fromName?: string;
  islandName?: string;
  onClose: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  // create
  const [shot, setShot] = useState('');
  const [toName, setToName] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // claim
  const [gift, setGift] = useState<GiftPayload | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (mode === 'create') {
      setShot(captureScreenshot());
    } else if (giftId) {
      fetchGift(giftId)
        .then((g) => { setGift(g); setTimeout(() => setFlipped(true), 700); })
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
  const backMsg = mode === 'create' ? message : (gift?.message || '');
  const backFrom = mode === 'create' ? (fromName || '匿名') : (gift?.fromName || '匿名');
  const backTo = mode === 'create' ? toName : (ge?.toName || '');

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
        {/* 3D 翻转卡 */}
        <div style={{ perspective: 1200 }}>
          <div
            onClick={() => setFlipped((f) => !f)}
            className="relative w-64 h-96 cursor-pointer"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transition: 'transform 0.7s cubic-bezier(0.4,0.2,0.2,1)',
              animation: 'giftHover 4s ease-in-out infinite',
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
            </div>

            {/* 背面：留言 + 落款 */}
            <div
              className="absolute inset-0 rounded-3xl overflow-hidden hand-drawn-panel bg-[#fcf8ec] p-6 flex flex-col"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <p className="text-slate-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-4 text-center">致 · {backTo || '你'}</p>
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-700 text-base leading-relaxed text-center italic">
                  {backMsg ? `「${backMsg}」` : '愿这座小岛陪你慢下来。'}
                </p>
              </div>
              <div className="border-t-2 border-dashed border-slate-300 pt-3 text-right">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest">From</p>
                <p className="text-slate-800 font-bold">{backFrom}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-white/40 text-[10px] font-mono tracking-widest">点击卡片翻面</p>

        {/* 操作区 */}
        {mode === 'create' ? (
          <div className="w-64 flex flex-col gap-2">
            {!link ? (
              <>
                <input value={toName} onChange={(e) => setToName(e.target.value)} placeholder="送给谁（接收人）"
                  className="px-3 py-2 rounded-xl border-2 border-slate-300 focus:border-slate-700 outline-none text-sm bg-white/95" />
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="写一句话…" rows={2}
                  className="px-3 py-2 rounded-xl border-2 border-slate-300 focus:border-slate-700 outline-none text-sm resize-none bg-white/95" />
                <button onClick={handleGenerate} disabled={busy} className="hand-drawn-btn px-5 py-3 font-bold bg-white">
                  {busy ? '封装中…' : '🎁 生成礼物卡'}
                </button>
              </>
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
