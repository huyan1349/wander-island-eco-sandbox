import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';
import { Send } from 'lucide-react';

/**
 * 辞（织潮者的回音）浮层组件 — 右下角
 * - 替代原有 Sparkles AI 按钮，整合为辞的头像 + 快速对话
 * - 头像用 /ci-avatar.png 真实图片
 * - 单击头像 → 打开完整聊天界面（定位到辞）
 * - 有气泡时在头像上方显示手绘气泡，约 8s 自动淡出
 * - 定时器只依赖 ci.bubbleAt，避免 effect cleanup 误清
 */
export const CiSpirit: React.FC = () => {
  const ci = useGameStore(s => s.ci);
  const clearCiBubble = useGameStore(s => s.clearCiBubble);
  const addAffinity = useGameStore(s => s.addAffinity);
  const setOpenPlayerPanel = useGameStore(s => s.setOpenPlayerPanel);
  const setPanelInitialTab = useGameStore(s => s.setPanelInitialTab);
  const setPanelInitialSocialTab = useGameStore(s => s.setPanelInitialSocialTab);
  const aiNarration = useGameStore(s => s.aiNarration);
  const setAiNarration = useGameStore(s => s.setAiNarration);

  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const lastBubbleAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // 展开输入框时自动聚焦
  useEffect(() => {
    if (chatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatOpen]);

  // 快速对话：发送消息
  const handleQuickChat = () => {
    if (!chatInput.trim() || isGeneratingAi) return;
    setIsGeneratingAi(true);
    AudioSystem.playConfirm();
    const state = useGameStore.getState();
    const affinityLevel = state.ci.affinity >= 61 ? 'close' : state.ci.affinity >= 21 ? 'familiar' : 'stranger';
    const memorySummary = state.ci.memory.slice(-5).join('；');
    const messageContent = chatInput.trim();
    setChatInput('');

    fetch('/api/generate-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeOfDay: state.timeOfDay,
        weather: state.weather,
        grassHealth: state.grassHealth,
        deerCount: state.deerCount,
        wolfCount: state.wolfCount,
        assetsCount: state.assets.length,
        userMessage: messageContent,
        affinityLevel,
        memorySummary,
        islandName: state.islandName,
        season: state.season,
      })
    })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(data => {
      if (data.narration) {
        setAiNarration(data.narration);
        state.ciSay(data.narration);
      }
    })
    .catch(() => {
      const fallbackLines = [
        '……风太大了，等一下。',
        '潮水声太响，我没听清。',
        '嗯……让我想想怎么说。',
      ];
      const line = fallbackLines[Math.floor(Math.random() * fallbackLines.length)];
      setAiNarration(line);
      state.ciSay(line);
    })
    .finally(() => setIsGeneratingAi(false));
  };

  // 单击头像 → 直接打开完整聊天界面（定位到辞）
  const handleClickCi = () => {
    AudioSystem.playClick();
    addAffinity(1);
    setPanelInitialTab('social');
    setPanelInitialSocialTab('chat');
    setOpenPlayerPanel(true);
  };

  // 手动关闭气泡
  const handleCloseBubble = () => {
    AudioSystem.playClose();
    setBubbleVisible(false);
    setTimeout(() => clearCiBubble(), 300);
  };

  // 显示内容：优先气泡，其次 AI narration
  const displayText = ci.bubble || aiNarration;
  const isVisible = bubbleVisible || (aiNarration && !ci.bubble);

  return (
    <div className="fixed bottom-28 right-6 z-[90] flex flex-col items-end gap-2 pointer-events-none">
      {/* 气泡 / AI 回复浮层 — 手绘风格 */}
      {displayText && isVisible && (
        <div
          className="pointer-events-auto max-w-[280px] transition-all duration-500"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.96)',
          }}
        >
          <div className="relative hand-drawn-panel px-5 py-4 shadow-lg">
            {/* 关闭按钮 */}
            <button
              onClick={handleCloseBubble}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 transition-colors pointer-events-auto"
              title="关闭"
            >
              <span className="text-xs font-bold">✕</span>
            </button>

            <div className="flex items-start gap-3">
              {/* 小头像 — 用真实图片 */}
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-800 shrink-0 shadow-[2px_2px_0_rgba(15,23,42,0.25)]">
                <img
                  src="/ci-avatar.png"
                  alt="辞"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-600 mb-1">辞 · 织潮者的回音</p>
                <p className="text-[13px] text-slate-700 leading-relaxed">{displayText}</p>
              </div>
            </div>

            {/* 气泡尾巴（指向右下头像） */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 overflow-hidden">
              <div className="w-4 h-4 bg-[#fbf7ec] border-b-2 border-l-2 border-slate-800/20 transform -rotate-45 -translate-y-2" />
            </div>
          </div>
        </div>
      )}

      {/* 快速对话输入框 */}
      {chatOpen && (
        <div className="pointer-events-auto flex items-center gap-2 animate-in slide-in-from-right-2 fade-in duration-300">
          <input
            ref={inputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickChat(); }}
            placeholder="和辞说点什么..."
            className="w-48 hand-drawn-panel px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            style={{ borderWidth: '2px' }}
          />
          <button
            onClick={handleQuickChat}
            disabled={isGeneratingAi}
            className="hand-drawn-btn w-9 h-9 flex items-center justify-center shrink-0"
            title="发送"
          >
            {isGeneratingAi ? (
              <span className="text-indigo-500 animate-spin text-sm">⟳</span>
            ) : (
              <Send size={14} className="text-indigo-500" />
            )}
          </button>
        </div>
      )}

      {/* 辞头像（始终可见，呼吸动画） */}
      <div
        className="pointer-events-auto cursor-pointer group relative"
        onClick={handleClickCi}
      >
        <div
          className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-slate-800 shadow-[3px_3px_0_rgba(15,23,42,0.3)] transition-all duration-300 hover:scale-110 hover:shadow-[4px_4px_0_rgba(15,23,42,0.4)]"
          style={{ animation: 'ciBreathe 3s ease-in-out infinite' }}
        >
          <img
            src="/ci-avatar.png"
            alt="辞"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 好感度小徽章 */}
        {ci.affinity > 0 && (
          <div className="absolute -top-1 -left-1 bg-gradient-to-tr from-amber-300 to-yellow-500 text-slate-900 text-[7px] font-black min-w-[14px] h-[14px] flex items-center justify-center rounded-full border border-slate-800 shadow-sm">
            {ci.affinity > 99 ? '99+' : ci.affinity}
          </div>
        )}

        {/* 生成中动画指示 */}
        {isGeneratingAi && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border border-slate-800 animate-pulse" />
        )}
      </div>

      {/* 呼吸动画 keyframes */}
      <style>{`
        @keyframes ciBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
};
