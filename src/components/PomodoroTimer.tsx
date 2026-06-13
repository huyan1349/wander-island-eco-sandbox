import { useState, useEffect } from 'react';

// 番茄钟 —— 嵌在待机(Standby)沉浸界面里，沿用其电影遥测风格：
// font-mono / 宽字距 / 大写 / 白色半透明，极简无边框。
const WORK = 25 * 60;
const BREAK = 5 * 60;

export function PomodoroTimer() {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [left, setLeft] = useState(WORK);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) { setRunning(false); return 0; }
        return s - 1;
      });
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

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-5 select-none">
      <div className="flex gap-6 font-mono text-[10px] tracking-[0.3em] uppercase">
        <button
          onClick={() => switchMode('work')}
          className={`transition-colors ${mode === 'work' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
        >Focus</button>
        <button
          onClick={() => switchMode('break')}
          className={`transition-colors ${mode === 'break' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
        >Break</button>
      </div>

      <div className="font-mono text-7xl font-extralight tracking-[0.1em] text-white tabular-nums drop-shadow-lg">
        {mm}:{ss}
      </div>

      <div className="flex items-center gap-8 font-mono text-[10px] tracking-[0.3em] uppercase text-white/60">
        <button onClick={() => setRunning((r) => !r)} className="hover:text-white transition-colors">
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={() => switchMode(mode)} className="hover:text-white transition-colors">
          Reset
        </button>
      </div>
    </div>
  );
}
