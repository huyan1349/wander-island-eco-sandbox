import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import type { PlacedAsset } from '../store';
import { AudioSystem } from '../lib/audio';
import { ArrowRight, X, Check } from 'lucide-react';

// 注册后首次进岛的「实操型」新手引导。
// 不再是连点「下一步」的旁白巡游——每一步都让玩家亲手做一个动作，
// 完成后才推进，并借机展示游戏最核心的「共生」机制（水土丰茂绿波 + 和弦）。
//
// 完成判定：进入某步时快照「匹配物件」的数量，玩家放下新的目标物件、
// 数量增加即视为完成 → 播放正反馈 → 自动进入下一步。无需任何「下一步」按钮。

const isTree = (t: string) => t === 'treeA' || t === 'treeB';

interface Mission {
  /** 辞的指令文案 */
  text: string;
  /** 完成时辞的肯定文案（动作步专用） */
  done?: string;
  /** 高亮的分类按钮名（guide-cat-<name>） */
  cat?: string;
  /** 高亮的工具按钮 id（分类展开后优先高亮它，guide-tool-<id>） */
  tool?: string;
  /** 哪种物件算作完成本步 */
  match?: (a: PlacedAsset) => boolean;
  /** 旁白步：靠按钮推进，而非动作 */
  manual?: boolean;
  /** 旁白步：本步结束即收尾整个引导 */
  finish?: boolean;
}

const MISSIONS: Mission[] = [
  {
    manual: true,
    text: '欢迎来到漫游岛，漫游者。我是「辞」，这座岛沉睡了很久……你愿意陪我，把它一点点唤醒吗？',
  },
  {
    cat: '自然', tool: 'treeA', match: (a) => isTree(a.type),
    text: '先种下第一棵树吧。点开下方『自然』，选一棵『松树』，再点地面种下——听听风穿过叶子的声音。',
    done: '种下了。你听，风的声音，好像不一样了。',
  },
  {
    cat: '自然', tool: 'spring', match: (a) => a.type === 'spring',
    text: '树有点渴了。在它旁边放一口『生命之泉』，给它一点水。',
    done: '你看——土地开始呼吸了。当事物彼此靠近、产生连接，岛屿就会一点点苏醒。',
  },
  {
    cat: '生物', tool: 'deer', match: (a) => a.type === 'deer',
    text: '有了树，也有了水，也许会有访客。试着在树林边引来一只『鹿』。',
    done: '它愿意留下来，说明这里让它安心了。',
  },
  {
    cat: '建筑', tool: 'campfire', match: (a) => a.type === 'campfire',
    text: '天色暗下来了。为自己生一堆『营火』吧——作为我们故事开始的地方。',
    done: '火亮起来了。从今天起，这座岛上有了你。',
  },
  {
    manual: true, finish: true,
    text: '岛……好像开始想起一些事了。以后你每照料它一点，它就会多醒来一点，也会多告诉你一点它记得的事。慢慢来，我一直在。',
  },
];

const PAD = 10;

export const WelcomeGuide: React.FC = () => {
  const setShowWelcomeGuide = useGameStore(s => s.setShowWelcomeGuide);
  const assets = useGameStore(s => s.assets);

  const [shown, setShown] = useState(false);
  const [step, setStep] = useState(0);
  const [celebrating, setCelebrating] = useState(false); // 动作完成 → 展示 done 文案的过渡态
  const [rect, setRect] = useState<DOMRect | null>(null);

  const baselineRef = useRef(0);     // 进入动作步时，匹配物件的基准数量
  const advancingRef = useRef(false); // 防止一次放置触发多次推进

  const mission = MISSIONS[step];
  const isAction = !mission.manual;

  // 入场
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 600);
    return () => clearTimeout(t);
  }, []);

  // 进入新步：重置基准数量与状态
  useEffect(() => {
    advancingRef.current = false;
    setCelebrating(false);
    if (mission.match) {
      baselineRef.current = useGameStore.getState().assets.filter(mission.match).length;
    }
  }, [step]);

  // 动作完成检测：匹配物件数量超过基准 → 完成
  useEffect(() => {
    if (!isAction || !mission.match || advancingRef.current) return;
    const count = assets.filter(mission.match).length;
    if (count > baselineRef.current) {
      advancingRef.current = true;
      setCelebrating(true);
      AudioSystem.playSynergyChord();
      const t = setTimeout(() => {
        if (step >= MISSIONS.length - 1) finish();
        else setStep(s => s + 1);
      }, 2600); // 给玩家时间看 done 文案 + 绿波/和弦正反馈
      return () => clearTimeout(t);
    }
  }, [assets, step, isAction]);

  // 跟踪当前步高亮目标的真实位置：工具按钮可见就高亮它，否则高亮其分类按钮
  useEffect(() => {
    if (!mission.cat && !mission.tool) { setRect(null); return; }
    const measure = () => {
      const toolEl = mission.tool ? document.getElementById(`guide-tool-${mission.tool}`) : null;
      const catEl = mission.cat ? document.getElementById(`guide-cat-${mission.cat}`) : null;
      const el = (toolEl && toolEl.offsetParent !== null) ? toolEl : catEl;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    const iv = setInterval(measure, 350);
    return () => { window.removeEventListener('resize', measure); clearInterval(iv); };
  }, [step, celebrating]);

  const finish = () => {
    AudioSystem.playClose();
    setShown(false);
    setTimeout(() => setShowWelcomeGuide(false), 320);
  };

  const next = () => {
    if (mission.finish || step >= MISSIONS.length - 1) { finish(); return; }
    AudioSystem.playTap();
    setStep(s => s + 1);
  };

  const bubbleText = celebrating && mission.done ? mission.done : mission.text;

  return (
    <>
      {/* 高亮圈：按目标元素真实位置绘制（动作完成后撤掉） */}
      {rect && !celebrating && (
        <div
          className="fixed z-[149] pointer-events-none rounded-2xl border-2 border-amber-300"
          style={{
            left: rect.left - PAD, top: rect.top - PAD,
            width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            animation: 'guidePulse 1.4s ease-in-out infinite',
            opacity: shown ? 1 : 0,
            transition: 'left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease, opacity 0.3s ease',
          }}
        />
      )}

      {/* 「辞」气泡 —— 固定屏幕中上空白区，绝不遮挡底部建造栏 */}
      <div className="fixed top-[11%] left-1/2 -translate-x-1/2 z-[151] pointer-events-none w-full flex justify-center px-4">
        <div
          className="relative pointer-events-auto hand-drawn-panel px-6 py-5 flex flex-col gap-4 w-full max-w-md transition-all duration-500"
          style={{ opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(-20px)' }}
        >
          <button onClick={finish} className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors" title="跳过引导">
            <X size={18} strokeWidth={2.5} />
          </button>

          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 border-2 border-slate-800 flex items-center justify-center shrink-0 shadow-[3px_3px_0_rgba(15,23,42,0.3)] ${celebrating ? 'animate-bounce' : ''}`}>
              <span className="hand-drawn-title text-2xl text-slate-900">辞</span>
            </div>
            <div className="flex-1 pt-0.5 pr-4">
              <p className="text-[11px] font-black tracking-[0.2em] uppercase text-emerald-600 mb-1">
                {celebrating ? '辞 · 做到了 ✓' : '辞 · 你的第一位岛友'}
              </p>
              <p className="text-[15px] text-slate-700 leading-relaxed">{bubbleText}</p>
            </div>
          </div>

          {/* 动作步：提示「亲手去做」；旁白步：给推进按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {MISSIONS.map((_, i) => (
                <span key={i} className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-emerald-500' : i < step ? 'w-2 h-2 bg-emerald-400' : 'w-2 h-2 bg-slate-300'}`} />
              ))}
            </div>

            {isAction ? (
              <div className="flex items-center gap-2 text-xs font-bold">
                {celebrating ? (
                  <span className="flex items-center gap-1.5 text-emerald-600"><Check size={15} strokeWidth={3} /> 很好</span>
                ) : (
                  <span className="flex items-center gap-2 text-amber-600">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" /> 跟着金色光圈，动手试试
                  </span>
                )}
              </div>
            ) : (
              <button onClick={next} className="hand-drawn-btn px-5 py-2.5 text-sm font-bold flex items-center gap-2">
                {mission.finish ? '开始漫游' : <>好 <ArrowRight size={15} /></>}
              </button>
            )}
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
