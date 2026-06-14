import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';
import {
  emitHermitJoin, emitHermitLeave, emitHermitChat,
  onHermitState, onHermitPlaced, onHermitRemove, onHermitPresence, onHermitChat, onHermitFull,
} from '../lib/socket';
import { Users, Send, LogOut, Globe } from 'lucide-react';

// 归隐之岛联机控制器 + HUD：进入即同步共享岛，实时收发放置/擦除/聊天/在场
export const HermitOnline: React.FC = () => {
  const setOnline = useGameStore(s => s.setOnline);
  const setScreen = useGameStore(s => s.setScreen);
  const addAsset = useGameStore(s => s.addAsset);
  const removeAssetAt = useGameStore(s => s.removeAssetAt);
  const addToast = useGameStore(s => s.addToast);

  const [presence, setPresence] = useState<{ count: number; cap: number; members: any[] }>({ count: 1, cap: 20, members: [] });
  const [chat, setChat] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    emitHermitJoin();
    const offs = [
      onHermitState((d) => { useGameStore.setState({ assets: d.assets || [], _history: [], _future: [] }); }),
      onHermitPlaced((a) => addAsset(a)),
      onHermitRemove((d) => removeAssetAt({ x: d.x, y: 0, z: d.z }, d.radius)),
      onHermitPresence((p) => setPresence(p)),
      onHermitChat((m) => setChat(prev => [...prev.slice(-49), m])),
      onHermitFull((d) => {
        addToast(`归隐之岛已满（${d.cap} 人），稍后再来`, 'info');
        setOnline(false);
        setScreen('SAVE_SELECT');
      }),
    ];
    return () => { offs.forEach(off => off && off()); emitHermitLeave(); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const send = () => {
    if (!input.trim()) return;
    emitHermitChat(input.trim());
    setInput('');
  };

  const leave = () => {
    AudioSystem.playClose();
    setOnline(false);
    setScreen('SAVE_SELECT');
  };

  return (
    <>
      {/* 顶部：归隐之岛标识 + 在场 + 退出 */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-auto flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/10 shadow-lg">
          <Globe size={16} className="text-emerald-400" />
          <span className="text-white text-sm font-bold tracking-wide">归隐之岛</span>
          <span className="flex items-center gap-1 text-emerald-300 text-xs font-bold ml-1"><Users size={13} /> {presence.count}/{presence.cap}</span>
        </div>
        <button onClick={leave} className="px-3 py-2 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/10 text-white/80 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
          <LogOut size={13} /> 离岛
        </button>
      </div>

      {/* 右下：聊天 */}
      <div className="absolute bottom-6 right-6 z-[70] pointer-events-auto w-72">
        <button onClick={() => setChatOpen(o => !o)} className="mb-2 px-3 py-1.5 rounded-xl bg-slate-900/60 backdrop-blur-md border border-white/10 text-white/80 text-xs font-bold shadow-lg">
          {chatOpen ? '收起聊天 ▾' : `展开聊天 ▴ ${chat.length ? `(${chat.length})` : ''}`}
        </button>
        {chatOpen && (
          <div className="rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden flex flex-col" style={{ height: 280 }}>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1.5">
              {chat.length === 0 && <p className="text-white/30 text-xs text-center mt-4">岛上很安静……打个招呼吧</p>}
              {chat.map((m) => (
                <div key={m.id} className="text-xs leading-snug">
                  {m.system ? (
                    <span className="text-amber-300/70 italic">— {m.text} —</span>
                  ) : (
                    <span className="text-white/90"><span className="text-emerald-300 font-bold">{m.from}</span><span className="text-white/40">：</span>{m.text}</span>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex items-center gap-2 p-2 border-t border-white/10">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send(); }}
                placeholder="说点什么…"
                maxLength={200}
                className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder:text-white/30 focus:outline-none"
              />
              <button onClick={send} className="p-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 text-white"><Send size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
