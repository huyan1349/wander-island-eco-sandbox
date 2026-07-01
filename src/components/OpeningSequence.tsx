import React, { useEffect, useRef, useState } from 'react';
import { AudioSystem } from '../lib/audio';

/**
 * 开场仪式 —— 28 秒无交互电影感序列
 *
 * 节拍：
 *   0 – 3s   黑屏 + 诗句「在云海之下，有人仍在倾听。」
 *   3 – 7s   云海下方仰视，水面波光，远处暖光浮现
 *   7 – 13s  镜头穿透云海，色彩由深蓝转向紫曙
 *   13 – 19s 岛屿剪影自云海中浮现，黎明色温
 *   19 – 23s 辞的梦呓碎片浮现（等待 / 光 / 循环）
 *   23 – 28s 标题渐显：「流浪岛 · Wander Island」
 *
 * 全程 Canvas 2D 渲染（不引入 Three.js，保护首屏体积）。
 * 按 ESC / 空格 / 点击任意处可跳过。
 */

interface OpeningSequenceProps {
  onDone: () => void;
  skipIntro?: boolean;
}

const DURATION = 28000;

const PHASE = {
  BLACK: 0,
  UNDER: 3000,
  THROUGH: 7000,
  ISLAND: 11000,
  WHISPER: 19000,
  TITLE: 23000,
};

interface Subtitle {
  text: string;
  tIn: number;
  tOut: number;
}

const SUBTITLES: Subtitle[] = [
  { text: '在云海之下，有人仍在倾听。', tIn: 600, tOut: 3500 },
  { text: '岛屿不会自己诞生。', tIn: 7800, tOut: 11500 },
  { text: '它需要一个名字，一段呼吸，', tIn: 13500, tOut: 17000 },
  { text: '和一个愿意留下来的人。', tIn: 17000, tOut: 20500 },
];

interface Whisper {
  text: string;
  tIn: number;
  tOut: number;
  x: number; // 0-1 相对位置
  y: number;
}

const WHISPERS: Whisper[] = [
  { text: '等待', tIn: 19500, tOut: 21800, x: 0.28, y: 0.42 },
  { text: '光',   tIn: 20100, tOut: 22400, x: 0.64, y: 0.55 },
  { text: '循环', tIn: 20700, tOut: 23000, x: 0.46, y: 0.70 },
];

interface Particle {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  range: number;
  phase: number;
  size: number;
  brightness: number;
}

// ─── 数学小工具 ──────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return `rgb(${Math.round(lerp(r1, r2, t))}, ${Math.round(lerp(g1, g2, t))}, ${Math.round(lerp(b1, b2, t))})`;
}

// 当前时刻的「天-地」渐变颜色
function getSkyColors(t: number): { top: string; mid: string; bottom: string } {
  // 关键帧 (time, top, mid, bottom)
  const keyframes: Array<[number, string, string, string]> = [
    [0,      '#000000', '#000000', '#000000'], // 纯黑
    [3000,   '#050816', '#0a1228', '#15203f'], // 深海蓝
    [7000,   '#1a1340', '#3a1f5c', '#5b2a7a'], // 紫曙
    [13000,  '#2d1b3d', '#704050', '#b8704a'], // 黎明
    [19000,  '#3d2b4f', '#a06460', '#e8b27c'], // 暖橙
    [23000,  '#2a1f3d', '#7a5570', '#c97c5d'], // 转黄昏
    [28000,  '#1a1a2e', '#3d2b4f', '#6b4970'], // 收束
  ];
  for (let i = 0; i < keyframes.length - 1; i++) {
    const [t0, top0, mid0, bot0] = keyframes[i];
    const [t1, top1, mid1, bot1] = keyframes[i + 1];
    if (t >= t0 && t <= t1) {
      const k = easeInOutCubic((t - t0) / (t1 - t0));
      return {
        top: lerpColor(top0, top1, k),
        mid: lerpColor(mid0, mid1, k),
        bottom: lerpColor(bot0, bot1, k),
      };
    }
  }
  const last = keyframes[keyframes.length - 1];
  return { top: last[1], mid: last[2], bottom: last[3] };
}

// 镜头 Y 偏移（模拟从云海下方向上穿透）
function getCameraOffset(t: number, H: number): number {
  const progress = clamp(t / 13000, 0, 1);
  return lerp(H * 0.25, -H * 0.08, easeInOutCubic(progress));
}

// 云海不透明度（穿云期最盛，岛屿期消散）
function getCloudOpacity(t: number): number {
  if (t < 3000) return 0;
  if (t < 7000) return easeInOutCubic((t - 3000) / 4000) * 0.85;
  if (t < 13000) return 0.85;
  if (t < 19000) return lerp(0.85, 0.35, easeInOutCubic((t - 13000) / 6000));
  return lerp(0.35, 0.5, clamp((t - 19000) / 5000, 0, 1));
}

// 远处光晕强度
function getGlowIntensity(t: number): number {
  if (t < 5000) return 0;
  if (t < 13000) return easeOutCubic((t - 5000) / 8000) * 0.9;
  if (t < 19000) return 0.9;
  return lerp(0.9, 0.3, easeInOutCubic((t - 19000) / 5000));
}

// 岛屿浮现进度
function getIslandProgress(t: number): number {
  if (t < PHASE.ISLAND) return 0;
  if (t > PHASE.ISLAND + 5000) return 1;
  return easeInOutCubic((t - PHASE.ISLAND) / 5000);
}

// ─── 主组件 ──────────────────────────────────────────
export const OpeningSequence: React.FC<OpeningSequenceProps> = ({ onDone, skipIntro }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const bgmStartedRef = useRef(false);
  const finishedRef = useRef(false);

  const [elapsed, setElapsed] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [pressedSkip, setPressedSkip] = useState(false);

  // 如果用户在 SettingsModal 中已经选择跳过开场，则立刻 onDone
  useEffect(() => {
    if (skipIntro) {
      onDone();
    }
  }, [skipIntro, onDone]);

  // 初始化粒子（注册到模块级缓存，供 drawParticles 读取）
  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const particles: Particle[] = [];
    const count = Math.min(12, Math.max(6, Math.floor((W * H) / 200000)));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: H * 0.3 + Math.random() * H * 0.5,
        speedX: 0.5 + Math.random() * 0.8,
        speedY: 0.4 + Math.random() * 0.6,
        range: 20 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
        size: 1.2 + Math.random() * 1.6,
        brightness: 0.4 + Math.random() * 0.5,
      });
    }
    _registerOpeningParticles(particles);
    return () => { _registerOpeningParticles([]); };
  }, []);

  // 主循环
  useEffect(() => {
    if (skipIntro) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    startRef.current = performance.now();
    const tick = (now: number) => {
      const t = now - startRef.current;
      setElapsed(t);

      // BGM 在第 3.5s 渐入（黑屏诗结束才进入情绪）
      if (!bgmStartedRef.current && t > 3500) {
        bgmStartedRef.current = true;
        try {
          AudioSystem.ensureResumed();
          AudioSystem.switchBGM('/Before_the_First_Snow.mp3');
          AudioSystem.setBGMVolume(0);
          let v = 0;
          const fadeIn = window.setInterval(() => {
            v += 0.02;
            if (v >= 0.5) { v = 0.5; window.clearInterval(fadeIn); }
            AudioSystem.setBGMVolume(v);
          }, 120);
        } catch (e) {
          // 音频不可用，继续无声播放
        }
      }

      draw(ctx, window.innerWidth, window.innerHeight, t);

      if (t >= DURATION) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFadingOut(true);
    // BGM 渐出，让 TitleScreen 的 useScreenBgm 接管
    try {
      let v = 0.5;
      const fadeOut = window.setInterval(() => {
        v -= 0.05;
        if (v <= 0) { v = 0; window.clearInterval(fadeOut); }
        AudioSystem.setBGMVolume(v);
      }, 60);
    } catch (e) {
      // ignore
    }
    window.setTimeout(() => {
      onDone();
    }, 900);
  };

  const skip = () => {
    if (finishedRef.current || pressedSkip) return;
    setPressedSkip(true);
    finish();
  };

  // 跳过：ESC / 空格 / 回车
  useEffect(() => {
    if (skipIntro) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        skip();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 字幕可见性 ───────────────────────────────────
  const activeSubtitle = SUBTITLES.find(s => elapsed >= s.tIn && elapsed <= s.tOut) || null;
  const activeWhispers = WHISPERS.filter(w => elapsed >= w.tIn && elapsed <= w.tOut);
  const titleVisible = elapsed >= PHASE.TITLE;
  const titleProgress = titleVisible
    ? clamp((elapsed - PHASE.TITLE) / 2000, 0, 1)
    : 0;

  // 跳过按钮的可见度（前 2 秒隐藏，2s 后渐显，鼠标移动后高亮）
  const [skipHover, setSkipHover] = useState(false);
  const skipVisible = elapsed > 2000 && !fadingOut;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black overflow-hidden select-none"
      onClick={skip}
      style={{ cursor: 'pointer' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* 字幕层 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 主诗句 */}
        {activeSubtitle && (
          <div
            key={activeSubtitle.text}
            className="absolute left-1/2 -translate-x-1/2 text-center text-white/90 font-light tracking-[0.35em] text-base sm:text-xl md:text-2xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
            style={{
              bottom: '28%',
              opacity: 1,
              animation: 'wanderOpeningSubtitleFade 0.9s ease both',
              fontFamily: "'ZCOOL KuaiLe', 'Nunito', cursive",
            }}
          >
            {activeSubtitle.text}
          </div>
        )}

        {/* 辞的梦呓碎片 */}
        {activeWhispers.map(w => {
          const localProgress = clamp((elapsed - w.tIn) / 600, 0, 1);
          const fadeOut = clamp((w.tOut - elapsed) / 800, 0, 1);
          const opacity = Math.min(localProgress, fadeOut);
          return (
            <div
              key={w.text}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-white/80 font-light tracking-[0.6em] text-lg sm:text-2xl"
              style={{
                left: `${w.x * 100}%`,
                top: `${w.y * 100}%`,
                opacity,
                filter: `blur(${(1 - opacity) * 6}px)`,
                textShadow: '0 0 18px rgba(255, 220, 150, 0.6), 0 0 4px rgba(255, 240, 200, 0.8)',
                fontFamily: "'ZCOOL KuaiLe', cursive",
              }}
            >
              {w.text}
            </div>
          );
        })}

        {/* 主标题 */}
        {titleVisible && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              opacity: titleProgress,
              transform: `scale(${0.96 + titleProgress * 0.04})`,
              transition: 'none',
            }}
          >
            <div
              className="text-white text-5xl sm:text-7xl md:text-8xl font-bold tracking-[0.15em] text-center"
              style={{
                fontFamily: "'ZCOOL KuaiLe', cursive",
                textShadow: '0 0 30px rgba(255, 220, 180, 0.5), 0 4px 24px rgba(0, 0, 0, 0.6)',
                filter: `blur(${(1 - titleProgress) * 8}px)`,
              }}
            >
              流浪岛
            </div>
            <div
              className="mt-6 text-white/70 text-xs sm:text-sm tracking-[0.8em] uppercase font-mono font-bold"
              style={{
                opacity: clamp((elapsed - PHASE.TITLE - 600) / 1200, 0, 1),
              }}
            >
              Wander Island
            </div>
            <div
              className="mt-10 text-white/40 text-[10px] tracking-[0.4em] uppercase font-mono"
              style={{
                opacity: clamp((elapsed - PHASE.TITLE - 1500) / 1000, 0, 1),
              }}
            >
              A Game By HUYAN &amp; XYH
            </div>
          </div>
        )}
      </div>

      {/* 跳过按钮 */}
      {skipVisible && (
        <button
          onClick={(e) => { e.stopPropagation(); skip(); }}
          onMouseEnter={() => setSkipHover(true)}
          onMouseLeave={() => setSkipHover(false)}
          className="absolute bottom-8 right-8 z-10 flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white/60 hover:text-white/95 transition-colors text-[10px] font-mono tracking-[0.3em] uppercase"
          style={{ pointerEvents: 'auto' }}
        >
          <span>Skip</span>
          <span className={`inline-block transition-transform ${skipHover ? 'translate-x-1' : ''}`}>→</span>
          <span className="ml-2 px-1.5 py-0.5 rounded border border-white/20 text-[8px] opacity-70">ESC</span>
        </button>
      )}

      {/* 进度条（极细，底部） */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5 pointer-events-none">
        <div
          className="h-full bg-white/40 transition-none"
          style={{ width: `${Math.min(100, (elapsed / DURATION) * 100)}%` }}
        />
      </div>

      {/* 渐出黑幕 */}
      <div
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-700"
        style={{ opacity: fadingOut ? 1 : 0 }}
      />

      <style>{`
        @keyframes wanderOpeningSubtitleFade {
          from { opacity: 0; filter: blur(8px); transform: translate(-50%, 8px); }
          to   { opacity: 1; filter: blur(0);  transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

// ─── Canvas 绘制 ─────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.clearRect(0, 0, W, H);

  // 1. 背景渐变（天 / 中 / 地）
  const colors = getSkyColors(t);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, colors.top);
  grad.addColorStop(0.55, colors.mid);
  grad.addColorStop(1, colors.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 2. 远处光晕（云海下的暖光，逐渐被岛屿遮挡）
  const glow = getGlowIntensity(t);
  if (glow > 0) {
    const cameraY = getCameraOffset(t, H);
    const cx = W / 2;
    const cy = H * 0.62 - cameraY;
    const r = Math.max(80, lerp(60, 220, clamp((t - 5000) / 8000, 0, 1)));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255, 220, 150, ${glow * 0.7})`);
    g.addColorStop(0.45, `rgba(255, 180, 100, ${glow * 0.3})`);
    g.addColorStop(1, 'rgba(255, 150, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // 3. 云海（多层）
  drawClouds(ctx, W, H, t);

  // 4. 岛屿剪影
  drawIsland(ctx, W, H, t);

  // 5. 粒子（萤火虫）
  drawParticles(ctx, W, H, t);

  // 6. 镜头暗角
  drawVignette(ctx, W, H, t);
}

function drawClouds(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const opacity = getCloudOpacity(t);
  if (opacity <= 0.01) return;

  const cameraY = getCameraOffset(t, H);

  // 三层云：远景（薄、快）、中景、近景（厚、慢）
  const layers = [
    { baseY: H * 0.55, amp: 18, freq: 0.008, speed: 0.0006, color: 'rgba(220, 200, 220, 0.5)', op: 0.4 },
    { baseY: H * 0.62, amp: 28, freq: 0.006, speed: 0.0008, color: 'rgba(180, 160, 200, 0.7)', op: 0.6 },
    { baseY: H * 0.72, amp: 40, freq: 0.005, speed: 0.0010, color: 'rgba(120, 100, 150, 0.9)', op: 0.8 },
  ];

  ctx.save();
  ctx.translate(0, cameraY);

  for (let i = 0; i < layers.length; i++) {
    const L = layers[i];
    ctx.globalAlpha = opacity * L.op;
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(-50, H + 50);
    for (let x = -50; x <= W + 50; x += 6) {
      const y = L.baseY
        + Math.sin(x * L.freq + t * L.speed + i * 1.3) * L.amp
        + Math.sin(x * L.freq * 2.3 + t * L.speed * 1.7 + i * 2.1) * L.amp * 0.35
        + Math.sin(x * L.freq * 0.5 + t * L.speed * 0.5 + i * 0.7) * L.amp * 0.6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 50, H + 50);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawIsland(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const progress = getIslandProgress(t);
  if (progress <= 0) return;

  const cameraY = getCameraOffset(t, H);
  const yOffset = lerp(60, 0, easeOutCubic(progress)) + cameraY;

  const cx = W / 2;
  const cy = H * 0.52 + yOffset;
  const islandW = Math.min(W * 0.42, 540);
  const islandH = Math.min(H * 0.16, 130);

  // 用稳定种子生成轮廓（不每帧重算，但这里点数少可接受）
  const points = 32;
  const wobbleSeed = 1.7; // 固定种子让形状稳定

  ctx.save();
  ctx.globalAlpha = progress;

  // 主体（岛屿底面 + 立面）
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI;
    const x = cx + Math.cos(a) * islandW;
    const wobble = Math.sin(i * 1.3 + wobbleSeed) * 0.18 + Math.sin(i * 2.7 + wobbleSeed) * 0.10;
    const y = cy + Math.sin(a) * islandH * (1 + wobble);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // 岛屿立体渐变
  const islandGrad = ctx.createLinearGradient(0, cy - islandH, 0, cy + islandH * 1.5);
  islandGrad.addColorStop(0, '#3a4a3e');
  islandGrad.addColorStop(0.4, '#1f2a23');
  islandGrad.addColorStop(1, '#0a0f0a');
  ctx.fillStyle = islandGrad;
  ctx.fill();

  // 顶部草地高光
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI;
    const x = cx + Math.cos(a) * islandW;
    const wobble = Math.sin(i * 1.3 + wobbleSeed) * 0.18 + Math.sin(i * 2.7 + wobbleSeed) * 0.10;
    const y = cy + Math.sin(a) * islandH * (1 + wobble);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(cx + islandW, cy);
  ctx.lineTo(cx - islandW, cy);
  ctx.closePath();

  const topGrad = ctx.createLinearGradient(0, cy - islandH, 0, cy);
  topGrad.addColorStop(0, '#6a8a5a');
  topGrad.addColorStop(1, '#3a4a3e');
  ctx.fillStyle = topGrad;
  ctx.fill();

  // 一棵孤树（中央偏左）
  if (progress > 0.5) {
    const treeOp = clamp((progress - 0.5) / 0.3, 0, 1);
    ctx.globalAlpha = progress * treeOp;
    const tx = cx - islandW * 0.15;
    const ty = cy - islandH * 0.8;
    // 树干
    ctx.fillStyle = '#2a1f1a';
    ctx.fillRect(tx - 1.5, ty, 3, 18);
    // 树冠
    ctx.beginPath();
    ctx.arc(tx, ty - 4, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#4a6a3e';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx - 5, ty - 2, 7, 0, Math.PI * 2);
    ctx.arc(tx + 5, ty - 2, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawParticles(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // 通过 closure 拿不到 particlesRef，这里用模块级缓存
  const particles = (window as any).__wanderOpeningParticles as Particle[] | undefined;
  if (!particles || particles.length === 0) return;

  // 萤火虫只在岛屿浮现后出现
  const visibility = clamp((t - 13000) / 4000, 0, 1);
  if (visibility <= 0) return;

  ctx.save();
  for (const p of particles) {
    const x = p.x + Math.sin(t * 0.0008 * p.speedX + p.phase) * p.range;
    const y = p.y + Math.cos(t * 0.0007 * p.speedY + p.phase * 1.3) * p.range * 0.6;
    const pulse = (Math.sin(t * 0.003 + p.phase * 2) + 1) * 0.5;
    const alpha = pulse * p.brightness * visibility;

    if (alpha < 0.02) continue;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fde68a';
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // 边缘暗角，营造电影感
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// 把 particles 暴露给绘制函数（避免在组件内反复创建闭包）
export function _registerOpeningParticles(particles: Particle[]) {
  (window as any).__wanderOpeningParticles = particles;
}
