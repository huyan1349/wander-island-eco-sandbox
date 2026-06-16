import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';
import {
  emitHermitJoin, emitHermitLeave, emitHermitChat,
  onHermitState, onHermitPlaced, onHermitRemove, onHermitPresence, onHermitChat, onHermitFull,
} from '../lib/socket';
import { Users, Send, LogOut, MessageCircle, X } from 'lucide-react';

// 归隐之岛联机控制器 + HUD（沿用游戏手绘高级风）
export const HermitOnline: React.FC = () => {
  const setOnline = useGameStore(s => s.setOnline);
  const setScreen = useGameStore(s => s.setScreen);
  const addAsset = useGameStore(s => s.addAsset);
  const removeAssetAt = useGameStore(s => s.removeAssetAt);
  const addToast = useGameStore(s => s.addToast);

  const [presence, setPresence] = useState<{ count: number; cap: number; members: any[] }>({ count: 1, cap: 20, members: [] });
  const [chat, setChat] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    emitHermitJoin();
    const offs = [
      // 叠加到本地预置底图（辞的隐者之岛）之上，而非替换
      onHermitState((d) => {
        const extra = d.assets || [];
        if (extra.length) useGameStore.setState((s) => ({ assets: [...s.assets, ...extra] }));
      }),
      onHermitPlaced((a) => addAsset(a)),
      onHermitRemove((d) => removeAssetAt({ x: d.x, y: 0, z: d.z }, d.radius)),
      onHermitPresence((p) => setPresence(p)),
      onHermitChat((m) => { setChat(prev => [...prev.slice(-49), m]); setUnread(u => (chatOpen ? 0 : u + 1)); }),
      onHermitFull((d) => { addToast(`归隐之岛已满（${d.cap} 人），稍后再来`, 'info'); setOnline(false); setScreen('SAVE_SELECT'); }),
    ];
    return () => { offs.forEach(off => off && off()); emitHermitLeave(); };
  }, []); // eslint-disable-line

  useEffect(() => { if (chatOpen) { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnread(0); } }, [chat, chatOpen]);

  const send = () => { if (!input.trim()) return; emitHermitChat(input.trim()); setInput(''); };
  const leave = () => { AudioSystem.playClose(); setOnline(false); setScreen('SAVE_SELECT'); };

  return (
    <>
      {/* 顶部：归隐之岛铭牌（手绘高级风） */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-auto flex items-center gap-3">
        <div className="hand-drawn-panel px-5 py-2.5 flex items-center gap-3">
          <span className="hand-drawn-title text-lg text-slate-800 -rotate-1 leading-none">归隐之岛</span>
          <span className="w-px h-5 bg-slate-300" />
          <span className="flex items-center gap-1.5 text-emerald-700 text-sm font-bold">
            <Users size={15} /> {presence.count}<span className="text-slate-400 font-normal">/{presence.cap}</span>
          </span>
        </div>
        <button onClick={leave} className="hand-drawn-btn px-4 py-2.5 text-sm font-bold text-red-600 flex items-center gap-2">
          <LogOut size={15} /> 离岛
        </button>
      </div>

      {/* 右下：聊天（手绘卡片） */}
      <div className="absolute bottom-6 right-6 z-[70] pointer-events-auto flex flex-col items-end gap-2">
        {chatOpen && (
          <div className="hand-drawn-panel w-72 flex flex-col overflow-hidden" style={{ height: 300 }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-slate-800/15">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2"><MessageCircle size={15} className="text-emerald-600" /> 岛上对话</span>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1.5">
              {chat.length === 0 && <p className="text-slate-400 text-xs text-center mt-6">岛上很安静……打个招呼吧 🌿</p>}
              {chat.map((m) => (
                <div key={m.id} className="text-xs leading-snug">
                  {m.system
                    ? <span className="text-amber-600/80 italic">— {m.text} —</span>
                    : <span className="text-slate-700"><span className="text-emerald-700 font-bold">{m.from}</span><span className="text-slate-400">：</span>{m.text}</span>}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex items-center gap-2 p-2 border-t-2 border-slate-800/15">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send(); }}
                placeholder="说点什么…"
                maxLength={200}
                className="flex-1 px-3 py-2 rounded-lg border-2 border-slate-300 bg-white/70 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
              />
              <button onClick={send} className="hand-drawn-btn p-2 text-emerald-700"><Send size={15} /></button>
            </div>
          </div>
        )}
        {!chatOpen && (
          <button onClick={() => setChatOpen(true)} className="hand-drawn-btn px-4 py-2.5 text-sm font-bold text-slate-800 flex items-center gap-2 relative">
            <MessageCircle size={16} className="text-emerald-600" /> 对话
            {unread > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white">{unread > 9 ? '9+' : unread}</span>}
          </button>
        )}
      </div>
    </>
  );
};
