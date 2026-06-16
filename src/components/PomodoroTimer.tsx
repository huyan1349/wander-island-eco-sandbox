import { useState, useEffect } from 'react';

// 番茄钟 —— 嵌在待机(Standby)沉浸界面，沿用其电影遥测风格。
// 数字切换用「模糊上浮」翻页式动画：每位数字仅在变化时重播。
const WORK = 25 * 60;
const BREAK = 5 * 60;

export function PomodoroTimer() {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [left, setLeft] = useState(WORK);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((s) => { if (s <= 1) { setRunning(false); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const switchMode = (m: 'work' | 'break') => {
    setMode(m);
    setLeft(m === 'work' ? WORK : BREAK);
    setRunning(false);
  };

  const mm = Math.floor(left / 60).toString().padStart(2, '0');
  const ss = (left % 60).toString().padStart(2, '0');
  const chars = `${mm}:${ss}`.split('');

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-6 select-none">
      <style>{`@keyframes pomoFlip{0%{filter:blur(12px);opacity:0;transform:translateY(-0.4em)}55%{filter:blur(3px);opacity:.7}100%{filter:blur(0);opacity:1;transform:translateY(0)}}`}</style>

      <div className="flex gap-6 font-mono text-[10px] tracking-[0.4em] uppercase">
        <button onClick={() => switchMode('work')} className={`transition-colors ${mode === 'work' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}>Focus</button>
        <button onClick={() => switchMode('break')} className={`transition-colors ${mode === 'break' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}>Break</button>
      </div>

      <div className="flex font-mono text-8xl font-thin tracking-[0.08em] text-white tabular-nums drop-shadow-[0_2px_20px_rgba(255,255,255,0.25)]">
        {chars.map((c, i) => (
          <span
            key={`${i}-${c}`}
            className="inline-block text-center"
            style={{ width: c === ':' ? '0.42em' : '0.62em', animation: 'pomoFlip 0.5s cubic-bezier(0.2,0.8,0.2,1)' }}
          >
            {c}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-10 font-mono text-[10px] tracking-[0.4em] uppercase text-white/50">
        <button onClick={() => setRunning((r) => !r)} className="hover:text-white transition-colors">{running ? 'Pause' : 'Start'}</button>
        <button onClick={() => switchMode(mode)} className="hover:text-white transition-colors">Reset</button>
      </div>
    </div>
  );
}
