// 共享地形笔刷算法 —— 主岛(Terrain)与子岛(SubIsland)共用，避免两份实现分裂。
// 约定：positions 为 xyz 交错的 Float32Array；水平面用 (x,z)，高度改 y。
// 高度图笔刷可复刻：隆起山峦 / 深挖峡谷河谷 / 抹平台地地基 / 平滑绵延丘陵 / 粗糙嶙峋崖壁。

export type BrushMode = 'raise' | 'lower' | 'flatten' | 'smooth' | 'roughen';

export const BRUSH_MODES: { id: BrushMode; label: string }[] = [
  { id: 'raise', label: '隆起' },
  { id: 'lower', label: '凹陷' },
  { id: 'flatten', label: '抹平' },
  { id: 'smooth', label: '平滑' },
  { id: 'roughen', label: '粗糙' },
];

export interface BrushOptions {
  mode: BrushMode;
  size: number;       // 笔刷半径（世界单位）
  strength: number;   // 0..1 基础力度
  isDrag: boolean;    // 拖动时减半，避免连续笔触失控
  px: number;         // 笔刷中心 x
  pz: number;         // 笔刷中心 z
  targetY?: number;   // flatten 模式：向该高度收敛（落笔时记录的高度）
  minY?: number;      // 高度下限（默认 -3，可挖出真正的峡谷）
  maxY?: number;      // 高度上限
}

const DEFAULT_MIN_Y = -3.0;
const DEFAULT_MAX_Y = 8.0;

// 原地修改 positions；返回是否有顶点发生变化。
export function applyTerrainBrush(positions: Float32Array, opts: BrushOptions): boolean {
  const { mode, isDrag, px, pz } = opts;
  const minY = opts.minY ?? DEFAULT_MIN_Y;
  const maxY = opts.maxY ?? DEFAULT_MAX_Y;
  const radius = Math.max(0.5, opts.size);
  const intensity = opts.strength * (isDrag ? 0.5 : 1.0);

  const count = positions.length / 3;
  // 规则方格网格：顶点数为 (seg+1)^2，可由 sqrt 反推每行宽度，用于平滑取邻居
  const gridW = Math.round(Math.sqrt(count));
  const isGrid = gridW * gridW === count;

  let changed = false;

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const dx = positions[ix] - px;
    const dz = positions[ix + 2] - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist >= radius) continue;

    const influence = (radius - dist) / radius;
    const smoothInfluence = influence * influence * (3 - 2 * influence); // smoothstep
    const y = positions[ix + 1];
    let newY = y;

    switch (mode) {
      case 'raise':
        newY = y + intensity * smoothInfluence;
        break;
      case 'lower':
        newY = y - intensity * smoothInfluence;
        break;
      case 'flatten': {
        const target = opts.targetY ?? y;
        newY = y + (target - y) * Math.min(1, intensity * 2) * smoothInfluence;
        break;
      }
      case 'smooth': {
        if (isGrid) {
          const col = i % gridW;
          const row = (i / gridW) | 0;
          let sum = y, n = 1;
          if (col > 0) { sum += positions[(i - 1) * 3 + 1]; n++; }
          if (col < gridW - 1) { sum += positions[(i + 1) * 3 + 1]; n++; }
          if (row > 0) { sum += positions[(i - gridW) * 3 + 1]; n++; }
          if (row < gridW - 1) { sum += positions[(i + gridW) * 3 + 1]; n++; }
          newY = y + (sum / n - y) * smoothInfluence * Math.min(1, intensity * 2);
        }
        break;
      }
      case 'roughen':
        newY = y + (Math.random() - 0.5) * intensity * 2 * smoothInfluence;
        break;
    }

    newY = Math.max(minY, Math.min(maxY, newY));
    if (newY !== y) { positions[ix + 1] = newY; changed = true; }
  }

  return changed;
}
