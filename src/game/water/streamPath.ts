import * as THREE from 'three';
import { buildHeightSampler, getTerrainHeight } from '../../utils/terrain';
import { applyTerrainBrush } from '../../utils/terrainBrush';
import { useGameStore } from '../../store';

/**
 * 溪流 / 瀑布几何构建。
 *
 * 溪流 = 玩家拖出的一条折线 polyline（世界 x,z）。沿折线生成一条「贴地水带」
 * （三角带 ribbon），y 取地形高度 + 微抬，UV 沿流向给 StylizedWater 滚动出流动感。
 * 相邻点落差超过阈值 → 记为瀑布段，渲染竖直水帘 + 底部水花。
 */

export interface Vec2 { x: number; z: number; }

export interface Waterfall {
  /** 顶部中点世界坐标。 */
  x: number;
  z: number;
  topY: number;
  bottomY: number;
  /** 流向（水平单位向量），用于摆放水帘朝向。 */
  dir: Vec2;
  width: number;
  /** 落水线：从崖顶到崖底的世界坐标点（含水位 Y），供扫掠圆弧截面水柱网格。 */
  poly: { x: number; y: number; z: number }[];
}

export interface StreamBuild {
  ribbon: THREE.BufferGeometry | null;
  falls: Waterfall[];
  /** 顺流单位方向的平均值（给 ribbon 的 UV 流速）。 */
  flowDir: Vec2;
}

const FILL = 0.5;         // 水位相对河床的填充高度（低于岸 → 岸壁裁出水线，像池塘）
const FALL_DROP = 0.5;    // 落差阈值：超过则成瀑布
const WSEG = 6;           // 横向细分段数（低多边形分面）
const RESAMPLE = 0.6;     // 沿程重采样间距（均匀facet）

/** 把玩家折线按弧长重采样成均匀间距点，保证低多边形水带分面均匀。 */
function resample(points: Vec2[], step: number): Vec2[] {
  const out: Vec2[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    let ax = points[i - 1].x, az = points[i - 1].z;
    const dx = points[i].x - ax, dz = points[i].z - az;
    let len = Math.hypot(dx, dz);
    if (len < 1e-4) continue;
    const ux = dx / len, uz = dz / len;
    let d = step - carry;
    while (d <= len) {
      out.push({ x: ax + ux * d, z: az + uz * d });
      d += step;
    }
    carry = len - (d - step);
  }
  const last = points[points.length - 1];
  if (Math.hypot(out[out.length - 1].x - last.x, out[out.length - 1].z - last.z) > step * 0.4) out.push(last);
  return out;
}

export function buildStream(points: Vec2[], width = 2.2): StreamBuild {
  if (!points || points.length < 2) return { ribbon: null, falls: [], flowDir: { x: 0, z: 1 } };

  // 精确贴地：用高度图双线性采样器（含笔刷形变）。
  const sampleH = buildHeightSampler();
  const path = resample(points, RESAMPLE);
  if (path.length < 2) return { ribbon: null, falls: [], flowDir: { x: 0, z: 1 } };

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const falls: Waterfall[] = [];
  const VPR = WSEG + 1; // 每行顶点数

  // 累计弧长（UV v 用真实米数 → 波长在世界系恒定）。
  const arc: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    arc.push(arc[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
  }

  // 水位：横向恒定（真正的水平面），沿程只降不升（水不倒流）→ 在凹陷处自然蓄水，
  // 岸壁高于水位、由地形 depthTest 遮裁出水线（与池塘碗形同一机制）。
  const level: number[] = [];
  for (let i = 0; i < path.length; i++) {
    const bed = sampleH(path[i].x, path[i].z);
    const raw = bed + FILL;
    // 只降不升，但绝不低于本地河床 → 水始终可见，不会"消失"在地下
    level.push(i === 0 ? raw : Math.max(bed + 0.06, Math.min(level[i - 1], raw)));
  }

  // 陡降行：让河面在此断开，交给瀑布水柱接管（避免平面重影）
  const steepRow: boolean[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const d = level[i] - level[i + 1];
    const h = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z) || 1;
    steepRow.push(d > 0.12 && d / h > 0.3);
  }

  let flowX = 0, flowZ = 0;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(path.length - 1, i + 1)];
    let tx = next.x - prev.x, tz = next.z - prev.z;
    const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    flowX += tx; flowZ += tz;
    const nx = -tz, nz = tx; // 横向法线
    const y = level[i];
    // 横向铺 WSEG+1 个顶点（低多边形）
    for (let j = 0; j <= WSEG; j++) {
      const s = (j / WSEG - 0.5) * width;
      positions.push(p.x + nx * s, y, p.z + nz * s);
      uvs.push(j / WSEG, arc[i]); // u 横向(0..1)、v 弧长(米)
    }
    if (i < path.length - 1) { // 河流连续成面（瀑布已拆为独立工具）
      const base = i * VPR;
      for (let j = 0; j < WSEG; j++) {
        const a = base + j, b = a + 1, c = a + VPR, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }

  // 瀑布检测：把「连续的陡降」合并成一整道瀑布（不再每行各出一片 → 杜绝阶梯式裂开）
  {
    let i = 0;
    while (i < path.length - 1) {
      const d0 = level[i] - level[i + 1];
      const h0 = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z) || 1;
      if (!(d0 > 0.25 && d0 / h0 > 0.4)) { i++; continue; } // 起一段陡降
      let j = i;
      while (j < path.length - 1) {
        const d = level[j] - level[j + 1];
        const h = Math.hypot(path[j + 1].x - path[j].x, path[j + 1].z - path[j].z) || 1;
        if (d > 0.12 && d / h > 0.3) j++; else break;        // 续段（滞回更松，小平台不打断）
      }
      const top = i, bot = j + 1;
      if (level[top] - level[bot] > FALL_DROP) {
        let tx = path[bot].x - path[top].x, tz = path[bot].z - path[top].z;
        const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        const poly: { x: number; y: number; z: number }[] = [];
        for (let k = top; k <= bot; k++) poly.push({ x: path[k].x, y: level[k], z: path[k].z });
        falls.push({
          x: (path[top].x + path[bot].x) / 2, z: (path[top].z + path[bot].z) / 2,
          topY: level[top], bottomY: level[bot], dir: { x: tx, z: tz }, width, poly,
        });
      }
      i = j + 1;
    }
  }

  const ribbon = new THREE.BufferGeometry();
  ribbon.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  ribbon.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  ribbon.setIndex(indices);
  ribbon.computeVertexNormals();

  const fl = Math.hypot(flowX, flowZ) || 1;
  return { ribbon, falls, flowDir: { x: flowX / fl, z: flowZ / fl } };
}

/**
 * 河流笔刷：沿折线挖出河床（复用湖泊的 flatten 逻辑）。
 *  - 平缓处：像湖泊一样把路面压低 DEPTH，挖出可蓄水的河床，两侧自然成岸。
 *  - 陡峭处（坡度 > STEEP）：跳过不挖，保留崖壁 → 由 buildStream 检测成瀑布。
 * 挖完写回 terrainData，再返回可序列化的折线状态。
 */
const RIVER_STEP = 0.4;   // 沿路径采样间距
const RIVER_DEPTH = 0.95; // 河床较周围地面下沉量（够深 → 岸明显高于水位，能裁出水线）
const RIVER_STEEP = 0.5;  // 坡度阈值：超过即视为瀑布段，不挖

export function carveRiverAndEncode(points: Vec2[], width = 1.5): string {
  const store = useGameStore.getState();
  const td = store.terrainData;
  if (td.positions && points.length >= 2) {
    const positions = Float32Array.from(td.positions);
    const bankDist = width * 0.9; // 取样到河槽外的原始岸地
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len, uz = dz / len;
      const perpX = -uz, perpZ = ux; // 横向
      for (let d = 0; d <= len; d += RIVER_STEP) {
        const px = a.x + ux * d, pz = a.z + uz * d;
        // 本地坡度（rise / run，run=1）
        const sx = getTerrainHeight(px + 0.5, pz) - getTerrainHeight(px - 0.5, pz);
        const sz = getTerrainHeight(px, pz + 0.5) - getTerrainHeight(px, pz - 0.5);
        if (Math.hypot(sx, sz) > RIVER_STEEP) continue; // 陡 → 留给瀑布
        // 关键：挖深基准取「两岸较高的原始地面」，而非中心线当前高度。
        // 这样多条河重合时不会层层加深；已够深处直接跳过复用，避免越挖越宽（消除"传播"）。
        const bankH = Math.max(
          getTerrainHeight(px + perpX * bankDist, pz + perpZ * bankDist),
          getTerrainHeight(px - perpX * bankDist, pz - perpZ * bankDist),
        );
        const target = bankH - RIVER_DEPTH;
        if (getTerrainHeight(px, pz) <= target + 0.05) continue; // 已是足够深的河床 → 复用，不再挖
        // 河槽半径略窄于水带（width/2），使水边缘探进升起的岸壁、被地形遮裁出岸线
        applyTerrainBrush(positions, {
          mode: 'flatten',
          targetY: target,
          size: width * 0.42,
          strength: 1.0,
          falloff: 'flat_center',
          isDrag: false,
          px, pz,
        });
      }
    }
    store.setTerrainData(positions, td.types, td.size, td.segments);
  }
  return encodeStreamState(points);
}

export function encodeStreamState(points: Vec2[]): string {
  return 'stream:' + points.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(';');
}

/* ===================== 瀑布：连线放置 + 地形整形 ===================== */

export interface WaterfallSpec {
  lip: { x: number; y: number; z: number };  // 崖口出水点
  base: { x: number; y: number; z: number }; // 落潭水面点
  width: number;
}

/**
 * 沿地形「最陡下降」追踪一条自然水流折线（参考河网生成的 steepest-descent 思路：
 * Red Blob Games / flowing-terrain / mapgen_rivers——每点朝最低邻居流）。
 *  - 以梯度下降方向为主 + 朝目标点的弱偏置（保证大致流向用户点的落点）
 *  - 惯性平滑 → 路径圆顺、不生硬
 *  - 进洼地/到目标/兜底里程 → 停止
 * 解决「两点直连 → 浮空、生硬」：水像真的一样顺着山坡流到最低处。
 */
function traceFlowPath(start: Vec2, target: Vec2, sampleH: (x: number, z: number) => number): Vec2[] {
  const STEP = 0.5, MAX = 120, EPS = 0.35, BIAS = 0.45, INERT = 0.55;
  const out: Vec2[] = [{ x: start.x, z: start.z }];
  let px = start.x, pz = start.z;
  let dirx = target.x - start.x, dirz = target.z - start.z;
  { const l = Math.hypot(dirx, dirz) || 1; dirx /= l; dirz /= l; }
  const span = Math.hypot(target.x - start.x, target.z - start.z) || 1;
  const targetH = sampleH(target.x, target.z); // 落点高度 → 降到这个高度就停（到最低处）
  for (let i = 0; i < MAX; i++) {
    // 最陡下降方向（中心差分求梯度，取负）
    const gx = sampleH(px + EPS, pz) - sampleH(px - EPS, pz);
    const gz = sampleH(px, pz + EPS) - sampleH(px, pz - EPS);
    let dnx = -gx, dnz = -gz; const dn = Math.hypot(dnx, dnz);
    // 朝目标方向（单位向量）
    let hx = target.x - px, hz = target.z - pz; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    if (dn > 1e-4) { dnx /= dn; dnz /= dn; } else { dnx = hx; dnz = hz; } // 平地 → 直接朝目标
    // 梯度为主 + 目标弱偏置
    const bx = dnx * (1 - BIAS) + hx * BIAS, bz = dnz * (1 - BIAS) + hz * BIAS;
    // 惯性平滑（圆顺）
    dirx = dirx * INERT + bx * (1 - INERT); dirz = dirz * INERT + bz * (1 - INERT);
    const l = Math.hypot(dirx, dirz) || 1; const ux = dirx / l, uz = dirz / l;
    px += ux * STEP; pz += uz * STEP;
    out.push({ x: px, z: pz });
    const traveled = Math.hypot(px - start.x, pz - start.z);
    const curH = sampleH(px, pz);
    if (Math.hypot(px - target.x, pz - target.z) < STEP * 1.5) break;  // 到达目标附近
    if (curH <= targetH + 0.05 && traveled > STEP * 2) break;          // 已降到落点高度（最低处）
    if (dn < 0.012 && traveled > span * 0.5) break;                    // 进洼地（平处）
    if (traveled > span * 1.8) break;                                  // 兜底里程
  }
  return out;
}

export function encodeWaterfall(s: WaterfallSpec): string {
  const { lip, base, width } = s;
  return `wf:${lip.x.toFixed(2)},${lip.y.toFixed(2)},${lip.z.toFixed(2)},${base.x.toFixed(2)},${base.y.toFixed(2)},${base.z.toFixed(2)},${width.toFixed(2)}`;
}

export function decodeWaterfall(str: string | undefined): WaterfallSpec | null {
  if (!str || !str.startsWith('wf:')) return null;
  const n = str.slice(3).split(',').map(parseFloat);
  if (n.length < 7 || n.some(Number.isNaN)) return null;
  return { lip: { x: n[0], y: n[1], z: n[2] }, base: { x: n[3], y: n[4], z: n[5] }, width: n[6] };
}

/**
 * 放置瀑布：取 A/B 两点 → 从高点开始沿地形「最陡下降」追踪一条自然水路（不再两点直连，
 * 杜绝浮空/生硬），沿水路挖一道浅槽让水嵌进地形（有岸、不浮空），末端挖跌水潭碗。
 * 返回 wf2: 编码（整条水路折线 + 潭面 Y + 宽度）。
 */
export function shapeWaterfallAndEncode(a: Vec2, b: Vec2, width = 1.6): string {
  const sampleH = buildHeightSampler();
  const ay = sampleH(a.x, a.z), by = sampleH(b.x, b.z);
  const top = ay >= by ? a : b;     // 高点 = 出水源头
  const low = ay >= by ? b : a;     // 低点 = 大致落点（仅作偏置目标）
  const path = traceFlowPath(top, low, sampleH);
  const end = path[path.length - 1];
  const endY = sampleH(end.x, end.z);
  const poolFloor = endY - 0.6;
  const poolY = poolFloor + 0.4;    // 潭水面（略低于末端地表 → 蓄住水）

  const store = useGameStore.getState();
  const td = store.terrainData;
  if (td.positions) {
    const positions = Float32Array.from(td.positions);
    // ① 沿水路挖一道浅槽：水嵌进地形、两侧自然成岸、不再悬浮于坡面之上。
    for (let k = 0; k < path.length; k++) {
      const p = path[k];
      const targetY = getTerrainHeight(p.x, p.z) - 0.3; // 浅槽，避免把山坡劈出大沟
      applyTerrainBrush(positions, { mode: 'flatten', targetY, size: width * 0.5, strength: 0.65, falloff: 'flat_center', isDrag: false, px: p.x, pz: p.z });
    }
    // ② 跌水潭碗（圆滑凹陷 → 蓄水成潭）
    applyTerrainBrush(positions, { mode: 'flatten', targetY: poolFloor, size: width * 1.6, strength: 1, falloff: 'flat_center', isDrag: false, px: end.x, pz: end.z });
    store.setTerrainData(positions, td.types, td.size, td.segments);
  }
  return encodeWaterfallPath(path, poolY, width);
}

/** wf2: 编码——整条水路折线 + 潭面 Y + 宽度。 */
export function encodeWaterfallPath(points: Vec2[], poolY: number, width: number): string {
  return `wf2:${width.toFixed(2)}:${poolY.toFixed(2)}:` + points.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(';');
}

export function decodeWaterfallPath(s: string | undefined): { points: Vec2[]; poolY: number; width: number } | null {
  if (!s || !s.startsWith('wf2:')) return null;
  const parts = s.slice(4).split(':');
  if (parts.length < 3) return null;
  const width = parseFloat(parts[0]);
  const poolY = parseFloat(parts[1]);
  const points = parts[2].split(';').map(seg => {
    const [x, z] = seg.split(',').map(parseFloat);
    return { x, z };
  }).filter(p => !Number.isNaN(p.x) && !Number.isNaN(p.z));
  if (points.length < 2 || Number.isNaN(width) || Number.isNaN(poolY)) return null;
  return { points, poolY, width };
}

export function decodeStreamState(s: string | undefined): Vec2[] | null {
  if (!s || !s.startsWith('stream:')) return null;
  const body = s.slice('stream:'.length);
  if (!body) return null;
  const pts = body.split(';').map(seg => {
    const [x, z] = seg.split(',').map(parseFloat);
    return { x, z };
  }).filter(p => !Number.isNaN(p.x) && !Number.isNaN(p.z));
  return pts.length >= 2 ? pts : null;
}
