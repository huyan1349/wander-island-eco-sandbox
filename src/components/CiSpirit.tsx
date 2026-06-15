import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { emitChatSend, onChatMessage, isSocketConnected } from '../lib/socket';
import { Send, Maximize2, X } from 'lucide-react';

const CI_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * 辞（织潮者的回音）浮层组件 — 最右下角
 * - 头像始终可见（呼吸动画）；单击 → 展开一个小聊天窗，在原地聊天
 * - 小窗内对话走 socket（chat:send → 辞 AI 回复），与"角色卡好友聊天"共用同一份历史，上下文不丢
 * - 小窗右上角「展开」按钮 → 打开完整角色卡好友聊天界面
 * - 辞主动发话时在头像上方显示手绘气泡，约 8s 自动淡出（只依赖 ci.bubbleAt，避免 cleanup 误清）
 */
export const CiSpirit: React.FC = () => {
  const ci = useGameStore(s => s.ci);
  const clearCiBubble = useGameStore(s => s.clearCiBubble);
  const addAffinity = useGameStore(s => s.addAffinity);
  const setOpenPlayerPanel = useGameStore(s => s.setOpenPlayerPanel);
  const setPanelInitialTab = useGameStore(s => s.setPanelInitialTab);
  const setPanelInitialSocialTab = useGameStore(s => s.setPanelInitialSocialTab);
  const authUser = useGameStore(s => s.authUser);

  const [isSending, setIsSending] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const lastBubbleAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 气泡显示/淡出：只依赖 ci.bubbleAt
  useEffect(() => {
    if (ci.bubbleAt !== lastBubbleAtRef.current && ci.bubble) {
      lastBubbleAtRef.current = ci.bubbleAt;
      setBubbleVisible(true);
      const t = setTimeout(() => {
        setBubbleVisible(false);
        setTimeout(() => clearCiBubble(), 500);
      }, 8000);
      return () => clearTimeout(t);
    }
  }, [ci.bubbleAt, ci.bubble, clearCiBubble]);

  // 监听辞的聊天消息（小窗 + 全屏共用同一条 socket 流）
  useEffect(() => {
    const unsub = onChatMessage((msg) => {
      if (msg.from_id !== CI_USER_ID && msg.to_id !== CI_USER_ID) return;
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.from_id === CI_USER_ID) setIsSending(false);
    });
    return () => { unsub(); };
  }, []);

  // 展开小窗时：聚焦 + 拉取历史（保留上下文）
  useEffect(() => {
    if (!chatOpen) return;
    inputRef.current?.focus();
    if (authUser) {
      api.getChatMessages(CI_USER_ID).then(res => setMessages(res.messages || [])).catch(() => {});
    }
  }, [chatOpen, authUser]);

  useEffect(() => {
    if (chatOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text || isSending) return;
    AudioSystem.playConfirm();
    addAffinity(1);
    setIsSending(true);
    setChatInput('');
    // 附带实时岛屿上下文，让辞"看见"当前的岛
    const s = useGameStore.getState();
    const ctx = {
      timeOfDay: s.timeOfDay, weather: s.weather, season: s.season,
      grassHealth: s.grassHealth, deerCount: s.deerCount, wolfCount: s.wolfCount,
      assetsCount: s.assets.length, islandName: s.islandName,
      affinityLevel: s.ci.affinity >= 61 ? 'close' : s.ci.affinity >= 21 ? 'familiar' : 'stranger',
    };

    // 在线（已登录 + socket 已连）：走 socket，持久化且与全屏聊天共用历史
    if (authUser && isSocketConnected()) {
      emitChatSend(CI_USER_ID, text, ctx);
      return;
    }

    // 离线兜底：本地显示 + HTTP 生成回复（不持久化，但保证辞会回应）
    setMessages(prev => [...prev, { id: 'local-' + Date.now(), from_id: 'me', to_id: CI_USER_ID, content: text }]);
    api.generateEvent({ ...ctx, userMessage: text, memorySummary: s.ci.memory.slice(-5).join('；') })
      .then(r => setMessages(prev => [...prev, { id: 'ci-' + Date.now(), from_id: CI_USER_ID, to_id: 'me', content: r.narration }]))
      .catch(() => setMessages(prev => [...prev, { id: 'ci-' + Date.now(), from_id: CI_USER_ID, to_id: 'me', content: '……潮水声太响，我没听清。' }]))
      .finally(() => setIsSending(false));
  };

  // 头像单击 → 展开/收起小窗
  const toggleChat = () => {
    AudioSystem.playClick();
    setChatOpen(o => !o);
  };

  // 展开到完整角色卡好友聊天界面
  const expandToPanel = () => {
    AudioSystem.playClick();
    setChatOpen(false);
    setPanelInitialTab('social');
    setPanelInitialSocialTab('chat');
    setOpenPlayerPanel(true);
  };

  const handleCloseBubble = () => {
    AudioSystem.playClose();
    setBubbleVisible(false);
    setTimeout(() => clearCiBubble(), 300);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-2 pointer-events-none">
      {/* 辞主动发话气泡（仅小窗关闭时显示，避免重复） */}
      {ci.bubble && bubbleVisible && !chatOpen && (
        <div
          className="pointer-events-auto max-w-[280px] transition-all duration-500"
          style={{ opacity: bubbleVisible ? 1 : 0, transform: bubbleVisible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.96)' }}
        >
          <div className="relative hand-drawn-panel px-5 py-4 shadow-lg">
            <button onClick={handleCloseBubble} className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 transition-colors" title="关闭">
              <span className="text-xs font-bold">✕</span>
            </button>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-800 shrink-0 shadow-[2px_2px_0_rgba(15,23,42,0.25)]">
                <img src="/ci-avatar.png" alt="辞" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-600 mb-1">辞 · 织潮者的回音</p>
                <p className="text-[13px] text-slate-700 leading-relaxed">{ci.bubble}</p>
              </div>
            </div>
            <div className="absolute -bottom-2 right-8 w-4 h-4 overflow-hidden">
              <div className="w-4 h-4 bg-[#fbf7ec] border-b-2 border-l-2 border-slate-800/20 transform -rotate-45 -translate-y-2" />
            </div>
          </div>
        </div>
      )}

      {/* 小聊天窗 */}
      {chatOpen && (
        <div className="pointer-events-auto w-[300px] max-w-[calc(100vw-2.5rem)] h-[400px] max-h-[60vh] flex flex-col hand-drawn-panel shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-300 overflow-hidden" style={{ borderWidth: '2px' }}>
          {/* 头部 */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b-2 border-slate-800 shrink-0">
            <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-slate-800 shrink-0">
              <img src="/ci-avatar.png" alt="辞" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800 leading-none">辞</p>
              <p className="text-[9px] text-emerald-600 tracking-wide">织潮者的回音 · 在线</p>
            </div>
            <button onClick={expandToPanel} className="hand-drawn-btn p-1.5" title="展开完整聊天界面"><Maximize2 size={13} /></button>
            <button onClick={() => { AudioSystem.playClose(); setChatOpen(false); }} className="hand-drawn-btn p-1.5" title="收起"><X size={13} /></button>
          </div>

          {/* 消息区 */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
            {messages.length === 0 && (
              <p className="text-center text-[11px] text-slate-400 py-6">和辞说点什么吧……<br />它一直在听潮声。</p>
            )}
            {messages.map((msg) => {
              const isMine = msg.from_id !== CI_USER_ID;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] px-3 py-2 text-[13px] leading-relaxed hand-drawn-panel ${isMine ? 'bg-emerald-50' : ''}`} style={{ borderWidth: '2px' }}>
                    <p className="text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            {isSending && <p className="text-[11px] text-slate-400 pl-1">辞正在听……</p>}
            <div ref={endRef} />
          </div>

          {/* 输入区 */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t-2 border-slate-800 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="和辞说点什么..."
              className="flex-1 min-w-0 hand-drawn-panel px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
              style={{ borderWidth: '2px' }}
            />
            <button onClick={handleSend} disabled={isSending} className="hand-drawn-btn w-9 h-9 flex items-center justify-center shrink-0 disabled:opacity-50" title="发送">
              {isSending ? <span className="text-indigo-500 animate-spin text-sm">⟳</span> : <Send size={14} className="text-indigo-500" />}
            </button>
          </div>
        </div>
      )}

      {/* 辞头像（始终可见，呼吸动画） */}
      <div className="pointer-events-auto cursor-pointer group relative" onClick={toggleChat}>
        <div
          className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-slate-800 shadow-[3px_3px_0_rgba(15,23,42,0.3)] transition-all duration-300 hover:scale-110 hover:shadow-[4px_4px_0_rgba(15,23,42,0.4)]"
          style={{ animation: 'ciBreathe 3s ease-in-out infinite' }}
        >
          <img src="/ci-avatar.png" alt="辞" className="w-full h-full object-cover" />
        </div>

        {/* 好感度小徽章 */}
        {ci.affinity > 0 && (
          <div className="absolute -top-1 -left-1 bg-gradient-to-tr from-amber-300 to-yellow-500 text-slate-900 text-[7px] font-black min-w-[14px] h-[14px] flex items-center justify-center rounded-full border border-slate-800 shadow-sm">
            {ci.affinity > 99 ? '99+' : ci.affinity}
          </div>
        )}

        {/* 未读：辞主动发话且小窗未开 */}
        {ci.bubble && bubbleVisible && !chatOpen && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border border-slate-800 animate-pulse" />
        )}
      </div>

      <style>{`
        @keyframes ciBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
};
