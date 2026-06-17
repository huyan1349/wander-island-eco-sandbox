// 共享地形笔刷算法 —— 主岛(Terrain)与子岛(SubIsland)共用，避免两份实现分裂。
// 约定：positions 为 xyz 交错的 Float32Array；水平面用 (x,z)，高度改 y。
// 笔刷集：隆起山峦 / 深挖河谷 / 找平台地 / 柔化丘陵 / 地表材质(沙/石/雪/路/花草)
// 对标：Unreal Landscape Sculpt / World Creator（falloff 羽化 + 强度/半径 + 预览圈）

// ── 笔刷模式 ──────────────────────────────────────────
export type BrushMode = 'raise' | 'lower' | 'flatten' | 'smooth' | 'paint';

export type BrushFalloff = 'smooth' | 'linear' | 'sharp' | 'flat_center';

// 地表材质类型（与 Terrain.tsx 的 types 数组对应）
export type SurfaceType = 0 | 1 | 2 | 3 | 4 | 5;
// 0=草(默认) 1=路 2=沙 3=石 4=雪 5=花草

export const SURFACE_LABELS: Record<SurfaceType, string> = {
  0: '草地', 1: '小路', 2: '沙滩', 3: '石滩', 4: '雪地', 5: '花草',
};

export const BRUSH_MODES: { id: BrushMode; label: string }[] = [
  { id: 'raise', label: '隆起' },
  { id: 'lower', label: '挖低' },
  { id: 'flatten', label: '找平' },
  { id: 'smooth', label: '柔化' },
  { id: 'paint', label: '材质' },
];

// ── 笔刷参数 ──────────────────────────────────────────
export interface BrushOptions {
  mode: BrushMode;
  size: number;          // 笔刷半径（世界单位）
  strength: number;      // 0..1 基础力度
  falloff: BrushFalloff; // 羽化曲线
  isDrag: boolean;       // 拖动时减半，避免连续笔触失控
  px: number;            // 笔刷中心 x
  pz: number;            // 笔刷中心 z
  targetY?: number;      // flatten 模式：向该高度收敛（落笔时记录的高度）
  paintType?: SurfaceType; // paint 模式：目标材质类型
  minY?: number;         // 高度下限（默认 -3，可挖出真正的峡谷）
  maxY?: number;         // 高度上限
}

// 海平面约在 y=-0.4（与 Water.tsx 的海面基准一致）。挖掘最深只允许到海平面
// 下方约 1.6 个单位——再深地形就会突兀地穿到海底以下、海水也托不住，故在此封顶。
// 挖到这条线附近时海水自然漫入，不需要另外生成水塘。
export const SEA_LEVEL = -0.4;
const DEFAULT_MIN_Y = SEA_LEVEL - 1.6; // = -2.0
const DEFAULT_MAX_Y = 500.0;

// ── 羽化曲线 ──────────────────────────────────────────
function applyFalloff(normalizedDist: number, falloff: BrushFalloff): number {
  // normalizedDist: 0(中心) ~ 1(边缘)
  switch (falloff) {
    case 'smooth':
      // smoothstep: 中心平、边缘急降
      return (1 - normalizedDist) * (1 - normalizedDist) * (3 - 2 * (1 - normalizedDist));
    case 'linear':
      // 线性衰减
      return 1 - normalizedDist;
    case 'sharp':
      // 中心几乎满，边缘极陡
      const t = 1 - normalizedDist;
      return t * t * t;
    case 'flat_center':
      // 内部 70% 是绝对平坦的 (influence = 1)，仅在边缘 30% 发生平滑过渡
      if (normalizedDist < 0.7) return 1.0;
      const t_flat = 1 - (normalizedDist - 0.7) / 0.3;
      return t_flat * t_flat * (3 - 2 * t_flat);
  }
}

// ── 高度笔刷 ──────────────────────────────────────────
// 原地修改 positions；返回是否有顶点发生变化。
export function applyTerrainBrush(positions: Float32Array, opts: BrushOptions): boolean {
  const { mode, isDrag, px, pz, falloff = 'smooth' } = opts;
  const minY = opts.minY ?? DEFAULT_MIN_Y;
  const maxY = opts.maxY ?? DEFAULT_MAX_Y;
  const radius = Math.max(0.5, opts.size);
  const intensity = opts.strength * (isDrag ? 0.5 : 1.0);

  const count = positions.length / 3;
  // 规则方格网格：顶点数为 (seg+1)^2，可由 sqrt 反推每行宽度
  const gridW = Math.round(Math.sqrt(count));
  const isGrid = gridW * gridW === count;

  // ── 性能优化：只遍历包围盒内顶点 ──
  // 按 px±radius 反推网格索引范围，不全扫
  let startIdx = 0;
  let endIdx = count;
  if (isGrid) {
    // 网格间距 = 地形宽度 / (gridW-1)，需要从 positions 推算
    // 简化：用第一个和第二个顶点的 x 差作为间距
    const spacing = count > 1 ? Math.abs(positions[3] - positions[0]) : 1;
    if (spacing > 0) {
      const colMin = Math.max(0, Math.floor((px - radius - positions[0]) / spacing));
      const colMax = Math.min(gridW - 1, Math.ceil((px + radius - positions[0]) / spacing));
      const rowMin = Math.max(0, Math.floor((pz - radius - positions[2]) / spacing));
      const rowMax = Math.min(gridW - 1, Math.ceil((pz + radius - positions[2]) / spacing));
      startIdx = rowMin * gridW + colMin;
      endIdx = rowMax * gridW + colMax + 1;
    }
  }

  let changed = false;

  for (let i = startIdx; i < endIdx; i++) {
    const ix = i * 3;
    const dx = positions[ix] - px;
    const dz = positions[ix + 2] - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist >= radius) continue;

    const normalizedDist = dist / radius;
    const influence = applyFalloff(normalizedDist, falloff);
    const y = positions[ix + 1];
    let newY = y;

    switch (mode) {
      case 'raise':
        newY = y + intensity * influence;
        break;
      case 'lower':
        newY = y - intensity * influence;
        break;
      case 'flatten': {
        const target = opts.targetY ?? y;
        newY = y + (target - y) * Math.min(1, intensity * 2) * influence;
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
          newY = y + (sum / n - y) * influence * Math.min(1, intensity * 2);
        }
        break;
      }
      case 'paint':
        // paint 模式不改高度，由 paintSurface 单独处理 types
        break;
    }

    newY = Math.max(minY, Math.min(maxY, newY));
    if (newY !== y) { positions[ix + 1] = newY; changed = true; }
  }

  return changed;
}

// ── 地表材质笔刷 ──────────────────────────────────────
// 原地修改 types 数组；返回是否有面发生变化。
// types 按**面**（每 3 顶点一组）存储，与 refreshTerrainColors 的遍历方式一致。
export function paintSurface(
  types: Uint8Array,
  positions: Float32Array,
  opts: BrushOptions,
): boolean {
  const { px, pz, falloff = 'smooth', paintType = 2 } = opts;
  const radius = Math.max(0.5, opts.size);
  const intensity = opts.strength * (opts.isDrag ? 0.5 : 1.0);

  let changed = false;

  // types 按 3 顶点一组（一个面），与 refreshTerrainColors 一致
  for (let i = 0; i < types.length; i += 3) {
    // 面中心坐标
    const cx = (positions[i * 3] + positions[(i + 1) * 3] + positions[(i + 2) * 3]) / 3;
    const cz = (positions[i * 3 + 2] + positions[(i + 1) * 3 + 2] + positions[(i + 2) * 3 + 2]) / 3;
    const dx = cx - px;
    const dz = cz - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist >= radius) continue;

    const normalizedDist = dist / radius;
    const influence = applyFalloff(normalizedDist, falloff);

    // 概率式覆盖：influence 越大越可能覆盖，边缘有自然过渡
    if (influence * intensity > 0.3) {
      const newType = paintType as number;
      if (types[i] !== newType || types[i + 1] !== newType || types[i + 2] !== newType) {
        types[i] = newType;
        types[i + 1] = newType;
        types[i + 2] = newType;
        changed = true;
      }
    }
  }

  return changed;
}
