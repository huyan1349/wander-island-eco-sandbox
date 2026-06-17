import * as THREE from 'three';
import { buildHeightSampler } from '../../utils/terrain';

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
}

export interface StreamBuild {
  ribbon: THREE.BufferGeometry | null;
  falls: Waterfall[];
  /** 顺流单位方向的平均值（给 ribbon 的 UV 流速）。 */
  flowDir: Vec2;
}

const RIBBON_LIFT = 0.07;
const FALL_DROP = 0.5; // 落差阈值：超过则成瀑布（略降，缓崖也能出瀑）

export function buildStream(points: Vec2[], width = 1.4): StreamBuild {
  if (!points || points.length < 2) return { ribbon: null, falls: [], flowDir: { x: 0, z: 1 } };

  // 精确贴地：用高度图双线性采样器（含笔刷形变），取代主岛的最近顶点粗采样，
  // 否则水带贴地阶梯化、落差检测也不准。
  const sampleH = buildHeightSampler();

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const falls: Waterfall[] = [];

  // 累计弧长用于 UV v。
  let total = 0;
  const segLen: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dz = points[i].z - points[i - 1].z;
    total += Math.sqrt(dx * dx + dz * dz);
    segLen.push(total);
  }
  if (total < 0.001) return { ribbon: null, falls: [], flowDir: { x: 0, z: 1 } };

  let flowX = 0, flowZ = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl; tz /= tl;
    flowX += tx; flowZ += tz;
    // 法向（横向）
    const nx = -tz;
    const nz = tx;
    const y = sampleH(p.x, p.z) + RIBBON_LIFT;
    const hw = width / 2;
    positions.push(p.x + nx * hw, y, p.z + nz * hw);
    positions.push(p.x - nx * hw, y, p.z - nz * hw);
    const v = segLen[i] / total;
    uvs.push(0, v);
    uvs.push(1, v);

    if (i < points.length - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);

      // 瀑布检测：当前点到下一点的落差。
      const yNext = sampleH(next.x, next.z) + RIBBON_LIFT;
      const drop = y - yNext;
      const horiz = Math.hypot(next.x - p.x, next.z - p.z) || 1;
      if (drop > FALL_DROP && drop / horiz > 0.4) {
        const mx = (p.x + next.x) / 2;
        const mz = (p.z + next.z) / 2;
        falls.push({
          x: mx, z: mz, topY: y, bottomY: yNext,
          dir: { x: tx, z: tz }, width,
        });
      }
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

export function encodeStreamState(points: Vec2[]): string {
  return 'stream:' + points.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(';');
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
