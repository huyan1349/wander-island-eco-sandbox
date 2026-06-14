import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';
import { ArrowRight, X } from 'lucide-react';

type Target = 'none' | 'bottomCenter' | 'modes' | 'right' | 'bottomLeft';

interface Step { text: string; target: Target; }

// 注册后首次进岛的详细引导。「辞」气泡固定在屏幕中上空白区，
// 每步在对应 UI 栏旁显示脉冲高亮圈，气泡本身绝不覆盖任何栏。
const STEPS: Step[] = [
  { text: '欢迎来到漫游岛，漫游者。我是「辞」，你的第一位岛友——接下来带你认识这座岛。', target: 'none' },
  { text: '按住鼠标拖动可以旋转视角，滚轮缩放。先随意看看你的小岛吧。', target: 'none' },
  { text: '屏幕下方是建造栏：先选一个分类，再挑一件物品，然后点地面就能放下它。', target: 'bottomCenter' },
  { text: '建造栏最左边是「选择 / 观察」和「橡皮擦」——想挪动观察或移除物体时用它们。', target: 'modes' },
  { text: '右侧是生态面板，能查看小岛的生态状态、并解锁更多物种与建筑。', target: 'right' },
  { text: '左下角的音乐卡片里，藏着你刚收到的 5 段记忆——点开收藏库慢慢听 ♪', target: 'bottomLeft' },
];

const RING: Record<Exclude<Target, 'none'>, React.CSSProperties> = {
  bottomCenter: { bottom: 78, left: '50%', transform: 'translateX(-50%)', width: 360, height: 78 },
  modes:        { bottom: 78, left: 'calc(50% - 250px)', transform: 'translateX(-50%)', width: 126, height: 78 },
  right:        { right: 14, top: '20%', width: 92, height: 320 },
  bottomLeft:   { left: 16, bottom: 16, width: 300, height: 150 },
};

export const WelcomeGuide: React.FC = () => {
  const setShowWelcomeGuide = useGameStore(s => s.setShowWelcomeGuide);
  const [shown, setShown] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 600);
    return () => clearTimeout(t);
  }, []);

  const finish = () => {
    AudioSystem.playClose();
    setShown(false);
    setTimeout(() => setShowWelcomeGuide(false), 300);
  };

  const next = () => {
    if (step >= STEPS.length - 1) { finish(); return; }
    AudioSystem.playTap();
    setStep(s => s + 1);
  };

  const cur = STEPS[step];
  const ring = cur.target !== 'none' ? RING[cur.target] : null;
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* 高亮圈：指向当前步骤对应的栏 */}
      {ring && (
        <div
          className="fixed z-[149] pointer-events-none rounded-2xl border-2 border-amber-300"
          style={{
            ...ring,
            animation: 'guidePulse 1.4s ease-in-out infinite',
            opacity: shown ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* 「辞」气泡 —— 固定屏幕中上空白区 */}
      <div className="fixed top-[12%] left-1/2 -translate-x-1/2 z-[151] pointer-events-none w-full flex justify-center px-4">
        <div
          className="pointer-events-auto hand-drawn-panel px-6 py-5 flex flex-col gap-4 w-full max-w-md transition-all duration-500"
          style={{ opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(-20px)' }}
        >
          {/* 关闭/跳过 */}
          <button onClick={finish} className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors" title="跳过引导">
            <X size={18} strokeWidth={2.5} />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 border-2 border-slate-800 flex items-center justify-center shrink-0 shadow-[3px_3px_0_rgba(15,23,42,0.3)]">
              <span className="hand-drawn-title text-2xl text-slate-900">辞</span>
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-[11px] font-black tracking-[0.2em] uppercase text-emerald-600 mb-1">辞 · 你的第一位岛友</p>
              <p className="text-[15px] text-slate-700 leading-relaxed">{cur.text}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* 步骤圆点 */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span key={i} className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-emerald-500' : 'w-2 h-2 bg-slate-300'}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isLast && (
                <button onClick={finish} className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">跳过</button>
              )}
              <button onClick={next} className="hand-drawn-btn px-5 py-2.5 text-sm font-bold flex items-center gap-2">
                {isLast ? '开始漫游' : <>下一步 <ArrowRight size={15} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes guidePulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(252,211,77,0.18), 0 0 22px rgba(252,211,77,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(252,211,77,0.32), 0 0 36px rgba(252,211,77,0.7); }
        }
      `}</style>
    </>
  );
};
