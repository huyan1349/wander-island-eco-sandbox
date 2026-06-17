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

const isTree = (t: string) =>
  t === 'treeA' || t === 'treeB' || t === 'pine_tree' || t === 'cherry_tree' || t === 'bamboo' || t === 'willow_tree';

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
  /** 旁白步：推进按钮的自定义文案（默认「好」/「开始漫游」） */
  cta?: string;
  /** 旁白步：点推进按钮时附带执行的动作（如打开信箱） */
  action?: () => void;
  /** 动作步：本步需要新放置的匹配物件数量（默认 1，如「凑成树林」需多棵） */
  need?: number;
  /** 自定义高亮目标元素的 ID */
  targetId?: string;
  /** 自定义动作完成检查函数 */
  check?: () => boolean;
  /** 自定义覆盖在屏幕中央的精美提示 UI */
  overlay?: () => React.ReactNode;
}

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[80%] h-[3px] bg-white/10 rounded-full overflow-hidden shadow-inner">
    <div 
      className="h-full bg-amber-400 rounded-full transition-all duration-100 ease-out shadow-[0_0_8px_rgba(251,191,36,0.8)]"
      style={{ width: `${Math.max(0, progress * 100)}%` }}
    />
  </div>
);

const Keycap = ({ letter, active }: { letter: string; active: boolean }) => (
  <div className={`relative w-14 h-14 rounded-[14px] transition-all duration-200 flex items-center justify-center font-bold text-2xl font-mono
    ${active ? 'bg-slate-700 text-white translate-y-[6px] shadow-[0_0px_0_#1e293b,inset_0_3px_6px_rgba(0,0,0,0.6)]' 
             : 'bg-slate-800 text-slate-200 shadow-[0_6px_0_#1e293b,0_12px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]'}
    border border-slate-700/50`}
  >
    {letter}
  </div>
);

const WASDOverlay = () => {
  const [active, setActive] = useState('');
  const progress = useGameStore(s => s.tutorialPanProgress);
  useEffect(() => {
    let i = 0;
    const keys = ['W', 'A', 'S', 'D'];
    const iv = setInterval(() => {
      setActive(keys[i % 4]);
      i++;
    }, 600);
    return () => clearInterval(iv);
  }, []);
  
  return (
    <div className="flex flex-col items-center gap-3 drop-shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
      <Keycap letter="W" active={active === 'W'} />
      <div className="flex gap-3">
        <Keycap letter="A" active={active === 'A'} />
        <Keycap letter="S" active={active === 'S'} />
        <Keycap letter="D" active={active === 'D'} />
      </div>
      <div className="relative mt-8 px-6 py-2.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-slate-100 tracking-[0.2em] text-[13px] font-light shadow-2xl">
        按下按键，平移视角
        <ProgressBar progress={progress} />
      </div>
    </div>
  );
};

const MouseSVG = ({ activeLeft, scrollY }: { activeLeft?: boolean; scrollY?: number }) => (
  <svg width="60" height="96" viewBox="0 0 60 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
    <rect x="2" y="2" width="56" height="92" rx="28" fill="#1e293b" stroke="#334155" strokeWidth="4"/>
    <path d="M2 30C2 14.536 14.536 2 30 2V40H2V30Z" fill={activeLeft ? '#f59e0b' : '#334155'} className="transition-colors duration-300"/>
    <path d="M30 2C45.464 2 58 14.536 58 30V40H30V2Z" fill="#334155"/>
    <rect x="26" y="12" width="8" height="20" rx="4" fill="#64748b"/>
    {scrollY !== undefined && (
      <rect x="26" y={12 + scrollY} width="8" height="8" rx="4" fill="#fbbf24" style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.8))' }} />
    )}
  </svg>
);

const DragOverlay = () => {
  const progress = useGameStore(s => s.tutorialRotateProgress);
  return (
    <div className="flex flex-col items-center">
      <div className="animate-drag-mouse-smooth">
        <MouseSVG activeLeft={true} />
      </div>
      <div className="relative mt-8 px-6 py-2.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-slate-100 tracking-[0.2em] text-[13px] font-light shadow-2xl flex items-center gap-3">
        <span className="opacity-40">←</span>
        <span>按住左键拖动，旋转视角</span>
        <span className="opacity-40">→</span>
        <ProgressBar progress={progress} />
      </div>
    </div>
  );
};

const ScrollOverlay = () => {
  const [scrollY, setScrollY] = useState(0);
  const progress = useGameStore(s => s.tutorialZoomProgress);
  useEffect(() => {
    let t = 0;
    const iv = setInterval(() => {
      t += 0.15;
      setScrollY(Math.sin(t) * 6 + 6); // 0 to 12
    }, 50);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <MouseSVG scrollY={scrollY} />
      <div className="relative mt-8 px-6 py-2.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-slate-100 tracking-[0.2em] text-[13px] font-light shadow-2xl flex items-center gap-2">
        <span>上下滚动滚轮，缩放镜头</span>
        <ProgressBar progress={progress} />
      </div>
    </div>
  );
};

const MISSIONS: Mission[] = [
  {
    text: '你好，我是辞，这座岛的岛灵。在开始前，试着熟悉一下视角：使用键盘 W/A/S/D 键在岛屿上平移。',
    done: '很好。这是平移视角。',
    check: () => useGameStore.getState().tutorialPanDone,
    overlay: WASDOverlay,
  },
  {
    text: '接下来，按住鼠标左键拖动，可以旋转整个岛屿的视角。',
    done: '干得漂亮。这是旋转视角。',
    check: () => useGameStore.getState().tutorialRotateDone,
    overlay: DragOverlay,
  },
  {
    text: '最后，滚动鼠标滚轮，试着缩放镜头看看。',
    done: '现在，你已经完全掌握了注视这座岛屿的方式。',
    check: () => useGameStore.getState().tutorialZoomDone,
    overlay: ScrollOverlay,
  },
  {
    manual: true,
    text: '这里荒了很久了，我们从种下第一棵树开始吧。',
  },
  {
    cat: '自然', tool: 'treeA', match: (a) => isTree(a.type),
    text: '点开下方『自然』，挑一棵树，再点地面种下——听听风穿过叶子的声音。',
    done: '种下了。你听，风的声音，好像不一样了。',
  },
  {
    cat: '自然', tool: 'treeA', match: (a) => isTree(a.type), need: 2,
    text: '一棵树太孤单了。再种上两三棵，让它们挨在一起——树木成林，会引来更多生命。',
    done: '一片小树林。看，它们在彼此呼应。',
  },
  {
    cat: '自然', tool: 'spring', match: (a) => a.type === 'spring',
    text: '树有点渴了。在林子旁放一口『生命之泉』，给这片土地一点水。',
    done: '土地开始呼吸了。当事物彼此靠近、产生连接，岛屿就会一点点苏醒。',
  },
  {
    cat: '生物', tool: 'deer', match: (a) => a.type === 'deer',
    text: '有树有水，也该有访客了。在树林边引来一只『鹿』。',
    done: '它愿意留下来，说明这里让它安心了。',
  },
  {
    // 旁白步 + 高亮地形工具：地形塑造是自由操作，难以判定完成，靠玩家点「好」推进
    manual: true, cat: '地形', tool: 'terrainUp', cta: '好',
    text: '岛的模样也由你来塑。选『隆起地形』，在地面按住拖动，堆出一座小丘——弄好了点「好」继续。',
  },
  {
    cat: '地形', tool: 'pond', match: (a) => a.type === 'pond',
    text: '低洼处适合蓄水。选『水塘』，点在地势低的地方——它会自己挖出一汪水来。',
    done: '一汪清水落进了凹地，把天也映了进去。',
  },
  {
    cat: '建筑', tool: 'campfire', match: (a) => a.type === 'campfire',
    text: '天色暗了。为自己生一堆『营火』吧——作为我们故事开始的地方。',
    done: '火亮起来了。从今天起，这座岛上有了你。',
  },
  {
    targetId: 'guide-sundial',
    text: '顺便一提，你可以通过拖动左上角的「日晷」来自由改变岛屿的时间，光影会随之交替。试着拨动一下时间的指针吧。',
    done: '光线改变了。你甚至能掌控这里的日夜。',
    check: () => useGameStore.getState().isTimeScrubbing,
  },
  {
    manual: true, finish: true, cta: '去看看信箱',
    action: () => useGameStore.getState().setMailboxOpen(true),
    text: '岛……好像开始想起一些事了。对了——你的信箱里有几封信，去看看吧，有人想对你说些什么。',
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
  const isAction = !mission.manual || mission.check != null;

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

  // 动作完成检测：匹配物件数量超过基准 → 仅标记 celebrating。
  // 不在这里设推进定时器——生态循环每 2s 会替换 assets 数组，会把定时器误清掉。
  useEffect(() => {
    if (!isAction || !mission.match || advancingRef.current) return;
    const count = assets.filter(mission.match).length;
    if (count >= baselineRef.current + (mission.need ?? 1)) {
      advancingRef.current = true;
      setCelebrating(true);
      AudioSystem.playSynergyChord();
    }
  }, [assets, step, isAction]);

  // 庆祝过渡 → 推进下一步。只依赖 celebrating/step（不依赖 assets），故不会被生态循环打断。
  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(() => {
      if (step >= MISSIONS.length - 1) finish();
      else setStep(s => s + 1);
    }, 2600); // 给玩家时间看 done 文案 + 绿波/和弦正反馈
    return () => clearTimeout(t);
  }, [celebrating, step]);

  // 自定义条件检查（轮询）
  useEffect(() => {
    if (!isAction || !mission.check || advancingRef.current) return;
    const iv = setInterval(() => {
      if (mission.check && mission.check()) {
        advancingRef.current = true;
        setCelebrating(true);
        AudioSystem.playSynergyChord();
      }
    }, 500);
    return () => clearInterval(iv);
  }, [step, isAction, mission]);

  // 跟踪当前步高亮目标的真实位置：工具按钮可见就高亮它，否则高亮其分类按钮
  useEffect(() => {
    if (!mission.cat && !mission.tool && !mission.targetId) { setRect(null); return; }
    const measure = () => {
      let el = null;
      if (mission.targetId) {
        el = document.getElementById(mission.targetId);
      } else {
        const toolEl = mission.tool ? document.getElementById(`guide-tool-${mission.tool}`) : null;
        const catEl = mission.cat ? document.getElementById(`guide-cat-${mission.cat}`) : null;
        el = (toolEl && toolEl.offsetParent !== null) ? toolEl : catEl;
      }
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
    mission.action?.();
    if (mission.finish || step >= MISSIONS.length - 1) { finish(); return; }
    AudioSystem.playTap();
    setStep(s => s + 1);
  };

  const bubbleText = celebrating && mission.done ? mission.done : mission.text;

  return (
    <>
      {/* 屏幕中央的精美叠加动画（仅动作步且非庆祝阶段出现） */}
      {mission.overlay && !celebrating && (
        <div className="fixed top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[140] pointer-events-none transition-opacity duration-500" style={{ opacity: shown ? 1 : 0 }}>
          <mission.overlay />
        </div>
      )}

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
                {mission.cta ? <>{mission.cta} <ArrowRight size={15} /></> : mission.finish ? '开始漫游' : <>好 <ArrowRight size={15} /></>}
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
