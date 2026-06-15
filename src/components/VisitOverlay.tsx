import React, { useState } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { ArrowLeft, Compass, Send, Check } from 'lucide-react';

// 可留下的小礼物（贴在访客留言上，主人能在访客簿看到）
const GIFTS = ['🌸', '🐚', '🍃', '⭐', '🎁', '☕'];

export const VisitOverlay: React.FC = () => {
  const visitingIsland = useGameStore(state => state.visitingIsland);
  const setVisitingIsland = useGameStore(state => state.setVisitingIsland);
  const loadGame = useGameStore(state => state.loadGame);
  const islandId = useGameStore(state => state.islandId);

  const [msg, setMsg] = useState('');
  const [gift, setGift] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!visitingIsland) return null;

  const handleReturn = () => {
    loadGame(islandId!, true);
    setVisitingIsland(null);
  };

  const leaveMessage = async () => {
    if ((!msg.trim() && !gift) || sending) return;
    setSending(true);
    AudioSystem.playConfirm();
    const text = (gift ? gift + ' ' : '') + msg.trim();
    try {
      await api.leaveVisitorLog(visitingIsland.islandId, text, 5);
      setSent(true);
      setMsg('');
    } catch (e: any) { alert(e?.message || '留言失败'); }
    finally { setSending(false); }
  };

  return (
    <div className="absolute inset-0 z-[150] flex items-center justify-center cinematic-vignette bg-slate-950/60">
      <div className="hand-drawn-panel p-10 animate-slide-up flex flex-col items-center gap-6 max-w-md w-full mx-4">
        {/* 罗盘 */}
        <div className="relative w-20 h-20 animate-compass-spin">
          <div className="w-full h-full rounded-full border-4 border-slate-800 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-800/30" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-800/30" />
            <div className="absolute inset-0 flex items-center justify-center"><Compass size={28} className="text-emerald-600" /></div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="hand-drawn-title text-2xl">做客 · {visitingIsland.islandName}</h2>
          <p className="text-sm text-slate-600 mt-1">by {visitingIsland.ownerName}</p>
        </div>

        {/* 留言 + 小礼物 */}
        {sent ? (
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm animate-in zoom-in-50">
            <Check size={16} /> 已在访客簿留下足迹 {gift}
          </div>
        ) : (
          <div className="w-full flex flex-col gap-3">
            <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase text-center">留下足迹</p>
            {/* 小礼物选择 */}
            <div className="flex items-center justify-center gap-2">
              {GIFTS.map(g => (
                <button key={g} onClick={() => { AudioSystem.playTap(); setGift(gift === g ? '' : g); }}
                  className={`w-9 h-9 rounded-full border-2 text-lg flex items-center justify-center transition-transform hover:scale-110 ${gift === g ? 'border-emerald-500 bg-emerald-50 scale-110' : 'border-slate-300'}`}>
                  {g}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text" value={msg} maxLength={120}
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && leaveMessage()}
                placeholder="给主人留句话…"
                className="flex-1 hand-drawn-panel px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                style={{ borderWidth: '2px' }}
              />
              <button onClick={leaveMessage} disabled={sending || (!msg.trim() && !gift)} className="hand-drawn-btn px-3 py-2 disabled:opacity-40"><Send size={14} /></button>
            </div>
          </div>
        )}

        <button onClick={handleReturn} className="hand-drawn-btn flex items-center gap-2 px-5 py-2.5 text-sm font-bold tracking-widest">
          <ArrowLeft size={16} /> 返回我的岛屿
        </button>
      </div>
    </div>
  );
};
