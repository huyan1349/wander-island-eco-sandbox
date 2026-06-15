import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';
import { THEMES } from './OnboardingFlow';
import { GiftModal } from './GiftModal';
import { captureScreenshot } from '../utils/islandIO';
import { X, Globe, Gift, Sparkles, User, Image as ImageIcon, Award, Lock } from 'lucide-react';
import { ACHIEVEMENTS, getUnlocked } from '../lib/achievements';

// 小岛面板：概况 + 居民证(可重复查看) + 明信片导出 + 送礼物
export const IslandHubModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const authUser = useGameStore(s => s.authUser);
  const islandName = useGameStore(s => s.islandName);
  const ecoPoints = useGameStore(s => s.ecoPoints);
  const playerLevel = useGameStore(s => s.playerLevel);
  const stats = useGameStore(s => s.stats);

  const [tab, setTab] = useState<'overview' | 'card' | 'ach'>('overview');
  const unlockedAch = getUnlocked();
  const [flipped, setFlipped] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [showGift, setShowGift] = useState(false);
  const [busy, setBusy] = useState(false);

  // 居民证数据：优先持久化，缺失则从账号/存档回退
  const rc = (() => {
    try { const v = localStorage.getItem('resident_card'); if (v) return JSON.parse(v); } catch { /* ignore */ }
    const memberNo = authUser?.memberNo || 1;
    const d = new Date();
    return {
      name: authUser?.username || '漫游者', islandName, motto: authUser?.motto || '', themeIdx: 1, memberNo,
      joinDate: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
      uid: `WI-${d.getFullYear()}-${String(memberNo).padStart(6, '0')}`,
    };
  })();
  const theme = THEMES[rc.themeIdx] || THEMES[1];

  useEffect(() => {
    if (tab !== 'card') return;
    QRCode.toDataURL(`${location.origin}/?resident=${rc.uid}`, { margin: 1, width: 200, errorCorrectionLevel: 'M' }).then(setQrUrl).catch(() => {});
  }, [tab, rc.uid]);

  const downloadPostcard = async () => {
    setBusy(true);
    try {
      const shot = captureScreenshot(1200);
      const img = new window.Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error()); img.src = shot; });
      const W = 1200, H = 820, pad = 40, iw = W - pad * 2, ih = 560;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, pad, pad, iw, ih);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.strokeRect(pad, pad, iw, ih);
      ctx.textAlign = 'left'; ctx.fillStyle = '#1e293b'; ctx.font = "bold 52px 'ZCOOL KuaiLe', sans-serif";
      ctx.fillText(rc.islandName || islandName, pad, ih + pad + 78);
      ctx.fillStyle = '#64748b'; ctx.font = "500 26px sans-serif";
      ctx.fillText(`漫游岛 · ${rc.joinDate}`, pad, ih + pad + 120);
      ctx.textAlign = 'right'; ctx.fillStyle = '#15803d'; ctx.font = "bold 28px sans-serif";
      ctx.fillText('WANDER ISLAND', W - pad, ih + pad + 120);
      const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `${rc.islandName || 'island'}-明信片.png`; a.click();
    } catch (e) { console.error('明信片生成失败', e); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#fbf7ec] rounded-3xl border border-slate-300/70 shadow-[0_30px_80px_rgba(0,0,0,0.45)] w-[560px] max-w-[92vw] max-h-[88vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2"><Globe size={20} className="text-emerald-600" /><h2 className="text-xl font-bold text-slate-800">小岛面板</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"><X size={20} /></button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          <button onClick={() => { AudioSystem.playTap(); setTab('overview'); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'overview' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>小岛概况</button>
          <button onClick={() => { AudioSystem.playTap(); setTab('card'); setFlipped(false); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'card' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>居民证</button>
          <button onClick={() => { AudioSystem.playTap(); setTab('ach'); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'ach' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>成就 {unlockedAch.size}/{ACHIEVEMENTS.length}</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {tab === 'overview' ? (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">我的岛屿</p>
                <p className="text-2xl font-bold text-slate-800">{islandName}</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {([['等级', playerLevel, 'text-emerald-600'], ['生态点', ecoPoints, 'text-cyan-600'], ['物体', stats.itemsPlaced, 'text-amber-600'], ['访客', authUser?.visitorCount || 0, 'text-violet-600']] as const).map(([l, v, c], i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white/60 p-3 text-center">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">{l}</p>
                    <p className={`text-xl font-bold ${c}`}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={downloadPostcard} disabled={busy} className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 p-4 flex flex-col items-center gap-2 disabled:opacity-50 transition-colors">
                  <ImageIcon size={22} className="text-sky-600" /><span className="text-sm font-bold text-slate-700">{busy ? '生成中…' : '生成明信片'}</span>
                </button>
                <button onClick={() => { AudioSystem.playClick(); setShowGift(true); }} className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 p-4 flex flex-col items-center gap-2 transition-colors">
                  <Gift size={22} className="text-rose-500" /><span className="text-sm font-bold text-slate-700">赠送礼物</span>
                </button>
              </div>
            </div>
          ) : tab === 'card' ? (
            <div className="flex flex-col items-center gap-4" style={{ perspective: 1200 }}>
              <div onClick={() => { AudioSystem.playTap(); setFlipped(f => !f); }} className="relative w-[330px] h-[208px] cursor-pointer" style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)', transition: 'transform .6s cubic-bezier(.4,.2,.2,1)' }}>
                {/* 正面 */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden border-[3px] border-slate-900 shadow-[8px_10px_0_rgba(15,23,42,0.4)]" style={{ background: theme.bg, backfaceVisibility: 'hidden' }}>
                  <div className="flex items-center justify-between px-4 pt-3">
                    <p className="text-[12px] font-black tracking-[0.15em] text-slate-900">WANDER ISLAND</p>
                    <Sparkles size={14} style={{ color: theme.accent }} />
                  </div>
                  <div className="flex items-center gap-3 px-4 mt-2">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-900 bg-white shrink-0">
                      {authUser?.avatar ? <img src={authUser.avatar} alt="" className="w-full h-full object-cover" /> : <User size={28} className="text-slate-500 m-auto mt-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-bold tracking-[0.3em] uppercase text-slate-500">Resident</p>
                      <p className="text-xl font-black text-slate-900 truncate">{rc.name}</p>
                      {rc.islandName && <p className="text-[11px] font-bold truncate" style={{ color: theme.ink }}>{rc.islandName}</p>}
                    </div>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 px-4 py-2 flex items-end justify-between border-t-2 border-slate-900/15 bg-white/30">
                    <div><p className="text-[8px] uppercase tracking-widest text-slate-500">第 {rc.memberNo} 位</p><p className="text-base font-black font-mono" style={{ color: theme.accent }}>NO.{String(rc.memberNo).padStart(5, '0')}</p></div>
                    <p className="text-xs font-bold text-slate-700 font-mono">{rc.joinDate}</p>
                  </div>
                </div>
                {/* 背面 */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden border-[3px] border-slate-900 shadow-[8px_10px_0_rgba(15,23,42,0.4)] flex flex-col" style={{ background: theme.bg, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  <div className="flex-1 flex items-center px-5"><p className="text-lg text-slate-800" style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>{rc.motto ? `「${rc.motto}」` : ''}</p></div>
                  <div className="flex items-end justify-between px-4 py-2 border-t-2 border-slate-900/15 bg-white/30">
                    <div><p className="text-[8px] uppercase tracking-widest text-slate-500">专属编号</p><p className="text-sm font-black font-mono" style={{ color: theme.ink }}>{rc.uid}</p></div>
                    <div className="w-12 h-12 rounded border-2 border-slate-900 bg-white p-0.5">{qrUrl ? <img src={qrUrl} alt="" className="w-full h-full" /> : <div className="w-full h-full bg-slate-100 animate-pulse" />}</div>
                  </div>
                </div>
              </div>
              <p className="text-slate-400 text-xs">点击卡片 · 翻面</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {ACHIEVEMENTS.map(a => {
                const got = unlockedAch.has(a.id);
                return (
                  <div key={a.id} className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-colors ${got ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-white/50'}`}>
                    <div className={`w-10 h-10 rounded-full border-2 border-slate-800 flex items-center justify-center shrink-0 ${got ? 'bg-gradient-to-tr from-amber-300 to-yellow-500' : 'bg-slate-200'}`}>
                      {got ? <Award size={20} className="text-slate-900" /> : <Lock size={16} className="text-slate-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${got ? 'text-slate-800' : 'text-slate-400'}`}>{a.title}</p>
                      <p className="text-xs text-slate-400">{a.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showGift && <GiftModal mode="create" fromName={useGameStore.getState().playerName} islandName={islandName} onClose={() => setShowGift(false)} />}
    </div>
  );
};
