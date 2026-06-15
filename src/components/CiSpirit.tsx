import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';

/**
 * 辞（岛灵）浮层组件
 * - 左下角显示辞的头像（呼吸动画暗示存在）
 * - 有气泡时显示手绘气泡，约 8s 自动淡出
 * - 点击辞头像 → 打开 PlayerPanel 社交 tab 定位到辞
 * - 定时器只依赖 ci.bubbleAt，避免 effect cleanup 误清（参考 AchievementSystem 写法）
 */
export const CiSpirit: React.FC = () => {
  const ci = useGameStore(s => s.ci);
  const clearCiBubble = useGameStore(s => s.clearCiBubble);
  const addAffinity = useGameStore(s => s.addAffinity);
  const setOpenPlayerPanel = useGameStore(s => s.setOpenPlayerPanel);
  const setPanelInitialTab = useGameStore(s => s.setPanelInitialTab);

  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const lastBubbleAtRef = useRef(0);

  // 气泡显示/淡出：只依赖 ci.bubbleAt，不依赖 ci.bubble 内容
  // 这样定时器不会被 effect cleanup 误清
  useEffect(() => {
    if (ci.bubbleAt !== lastBubbleAtRef.current && ci.bubble) {
      lastBubbleAtRef.current = ci.bubbleAt;
      setBubbleVisible(true);
      const t = setTimeout(() => {
        setBubbleVisible(false);
        // 淡出动画结束后再清除 store 中的气泡
        setTimeout(() => clearCiBubble(), 500);
      }, 8000);
      return () => clearTimeout(t);
    }
  }, [ci.bubbleAt, ci.bubble, clearCiBubble]);

  // 点击辞头像 → 打开社交面板定位到辞
  const handleClickCi = () => {
    AudioSystem.playClick();
    addAffinity(1);
    setPanelInitialTab('social');
    setOpenPlayerPanel(true);
  };

  // 手动关闭气泡
  const handleCloseBubble = () => {
    AudioSystem.playClose();
    setBubbleVisible(false);
    setTimeout(() => clearCiBubble(), 300);
  };

  return (
    <div className="fixed bottom-28 left-6 z-[90] flex items-end gap-3 pointer-events-none">
      {/* 气泡 */}
      {ci.bubble && (
        <div
          className="pointer-events-auto max-w-[280px] transition-all duration-500"
          style={{
            opacity: bubbleVisible ? 1 : 0,
            transform: bubbleVisible ? 'translateY(0)' : 'translateY(8px)',
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
              {/* 小头像 */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 border-2 border-slate-800 flex items-center justify-center shrink-0 shadow-[2px_2px_0_rgba(15,23,42,0.25)]">
                <span className="hand-drawn-title text-sm text-slate-900">辞</span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-600 mb-1">辞 · 岛灵</p>
                <p className="text-[13px] text-slate-700 leading-relaxed">{ci.bubble}</p>
              </div>
            </div>

            {/* 气泡尾巴（指向左下头像） */}
            <div className="absolute -bottom-2 left-6 w-4 h-4 overflow-hidden">
              <div className="w-4 h-4 bg-[#fbf7ec] border-b-2 border-r-2 border-slate-800/20 transform rotate-45 -translate-y-2" />
            </div>
          </div>
        </div>
      )}

      {/* 辞头像（始终可见，呼吸动画） */}
      <div
        className="pointer-events-auto cursor-pointer group"
        onMouseEnter={() => setAvatarHovered(true)}
        onMouseLeave={() => setAvatarHovered(false)}
        onClick={handleClickCi}
      >
        <div
          className={`relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-800 shadow-[3px_3px_0_rgba(15,23,42,0.3)] transition-all duration-300 ${avatarHovered ? 'scale-110 shadow-[4px_4px_0_rgba(15,23,42,0.4)]' : ''}`}
          style={{ animation: 'ciBreathe 3s ease-in-out infinite' }}
        >
          <img
            src="/ci-avatar.png"
            alt="辞"
            className="w-full h-full object-cover"
            onError={(e) => {
              // 图片加载失败时显示文字
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* 图片加载失败的 fallback */}
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center">
            <span className="hand-drawn-title text-xl text-slate-900">辞</span>
          </div>
        </div>

        {/* hover 提示 */}
        {avatarHovered && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 hand-drawn-panel px-3 py-1 text-[11px] font-bold text-slate-800 whitespace-nowrap pointer-events-none z-50">
            和辞说话
          </div>
        )}

        {/* 好感度小徽章 */}
        {ci.affinity > 0 && (
          <div className="absolute -top-1 -right-1 bg-gradient-to-tr from-amber-300 to-yellow-500 text-slate-900 text-[8px] font-black min-w-[16px] h-[16px] flex items-center justify-center rounded-full border border-slate-800 shadow-sm">
            {ci.affinity > 99 ? '99+' : ci.affinity}
          </div>
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
