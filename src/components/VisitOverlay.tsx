import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { ArrowLeft, Compass, Send, Check, MessageSquarePlus } from 'lucide-react';

// 可留下的小礼物（贴在访客留言上，主人能在访客簿看到）
const GIFTS = ['🌸', '🐚', '🍃', '⭐', '🎁', '☕'];

export const VisitOverlay: React.FC = () => {
  const visitingIsland = useGameStore(state => state.visitingIsland);
  const setVisitingIsland = useGameStore(state => state.setVisitingIsland);
  const loadGame = useGameStore(state => state.loadGame);
  const islandId = useGameStore(state => state.islandId);

  const [phase, setPhase] = useState<'arriving' | 'visiting'>('arriving');
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [gift, setGift] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // 短暂"前往中"过场后揭开岛屿
  useEffect(() => {
    setPhase('arriving');
    const t = setTimeout(() => setPhase('visiting'), 1300);
    return () => clearTimeout(t);
  }, [visitingIsland?.islandId]);

  if (!visitingIsland) return null;

  const handleReturn = () => {
    AudioSystem.playClose();
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
      setTimeout(() => setShowForm(false), 1200);
    } catch (e: any) { alert(e?.message || '留言失败'); }
    finally { setSending(false); }
  };

  // 过场：短暂的全屏"前往中"
  if (phase === 'arriving') {
    return (
      <div className="absolute inset-0 z-[150] flex items-center justify-center cinematic-vignette bg-slate-950/55 animate-in fade-in duration-300">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-20 h-20 animate-compass-spin">
            <div className="w-full h-full rounded-full border-4 border-slate-800 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-800/30" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-800/30" />
              <div className="absolute inset-0 flex items-center justify-center"><Compass size={28} className="text-emerald-600" /></div>
            </div>
          </div>
          <h2 className="hand-drawn-title text-2xl text-white drop-shadow">正在前往 {visitingIsland.islandName}…</h2>
        </div>
      </div>
    );
  }

  // 做客中：不挡视线的顶部小横幅，能看到对方的岛
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[150] flex flex-col items-center gap-2 pointer-events-none">
      <div className="pointer-events-auto hand-drawn-panel px-4 py-2.5 shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 fade-in" style={{ borderWidth: '2px' }}>
        <Compass size={18} className="text-emerald-600 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-800 leading-none">做客中 · {visitingIsland.islandName}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">by {visitingIsland.ownerName}</p>
        </div>
        <button onClick={() => { AudioSystem.playTap(); setShowForm(s => !s); }} className="hand-drawn-btn px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 shrink-0">
          <MessageSquarePlus size={13} /> 留言
        </button>
        <button onClick={handleReturn} className="hand-drawn-btn px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 shrink-0">
          <ArrowLeft size={13} /> 返回
        </button>
      </div>

      {/* 留言 + 小礼物 弹出 */}
      {showForm && (
        <div className="pointer-events-auto hand-drawn-panel px-4 py-3 shadow-lg w-[300px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-top-2 fade-in" style={{ borderWidth: '2px' }}>
          {sent ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm py-1"><Check size={16} /> 已留下足迹 {gift}</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-center gap-2">
                {GIFTS.map(g => (
                  <button key={g} onClick={() => { AudioSystem.playTap(); setGift(gift === g ? '' : g); }}
                    className={`w-8 h-8 rounded-full border-2 text-base flex items-center justify-center transition-transform hover:scale-110 ${gift === g ? 'border-emerald-500 bg-emerald-50 scale-110' : 'border-slate-300'}`}>
                    {g}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text" value={msg} maxLength={120} autoFocus
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
        </div>
      )}
    </div>
  );
};
