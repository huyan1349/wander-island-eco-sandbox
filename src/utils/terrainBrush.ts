// 共享地形笔刷算法 —— 主岛(Terrain)与子岛(SubIsland)共用，避免两份实现分裂。
// 约定：positions 为 xyz 交错的 Float32Array；水平面用 (x,z)，高度改 y。
// 高度图笔刷可复刻：隆起山峦 / 深挖峡谷河谷 / 抹平台地地基 / 平滑绵延丘陵 / 侵蚀自然崖壁。

export type BrushMode = 'raise' | 'lower' | 'flatten' | 'smooth' | 'erode';

export const BRUSH_MODES: { id: BrushMode; label: string }[] = [
  { id: 'raise', label: '隆起' },
  { id: 'lower', label: '凹陷' },
  { id: 'flatten', label: '抹平' },
  { id: 'smooth', label: '平滑' },
  { id: 'erode', label: '侵蚀' },
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
      case 'erode': {
        // 热力侵蚀（thermal erosion）：超过休止角的物质坍塌到坡底
        // 算法：检查当前顶点与邻居的高度差，若差值超过 talus 角阈值，
        // 则将高处物质向低处搬运，形成自然崖壁和岩屑堆
        if (isGrid) {
          const col = i % gridW;
          const row = (i / gridW) | 0;
          const talusAngle = 0.4; // 休止角阈值（高度差超过此值则发生侵蚀）
          const transferRate = 0.5; // 物质搬运率
          let totalDiff = 0;
          let lowerCount = 0;
          const neighbors: number[] = [];
          if (col > 0) neighbors.push(i - 1);
          if (col < gridW - 1) neighbors.push(i + 1);
          if (row > 0) neighbors.push(i - gridW);
          if (row < gridW - 1) neighbors.push(i + gridW);
          for (const ni of neighbors) {
            const diff = y - positions[ni * 3 + 1];
            if (diff > talusAngle) {
              totalDiff += diff - talusAngle;
              lowerCount++;
            }
          }
          if (lowerCount > 0) {
            const erosion = (totalDiff * transferRate / lowerCount) * smoothInfluence * Math.min(1, intensity * 2);
            newY = y - erosion;
          }
        }
        break;
      }
    }

    newY = Math.max(minY, Math.min(maxY, newY));
    if (newY !== y) { positions[ix + 1] = newY; changed = true; }
  }

  return changed;
}
