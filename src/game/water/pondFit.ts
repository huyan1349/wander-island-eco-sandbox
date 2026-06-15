import { getTerrainHeight } from '../../utils/terrain';

/**
 * 水塘「贴地」拟合：放置时不再用一片固定平面，而是探测地形凹陷，
 * 求出贴合洼地的水位(y) 与水面半径(岸线)。
 *
 * 算法：
 *  1. 水位 = 中心地面高度 + 小偏移（积在洼地里，略低于四周地面）。
 *  2. 从中心沿多条射线向外步进采样 getTerrainHeight，
 *     直到地形升过水位 → 该方向的「岸线距离」。
 *  3. 半径取各向岸线距离的较小分位数（保守，水不溢过最低的岸），
 *     夹在 [minR, maxR] 之间。
 */
export interface PondFit {
  /** 世界系水面高度。 */
  waterLevel: number;
  /** 水面半径（到岸线）。 */
  radius: number;
}

const RAYS = 16;
const STEP = 0.25;

export function fitPond(
  cx: number,
  cz: number,
  opts: { minR?: number; maxR?: number; offset?: number } = {},
): PondFit {
  const minR = opts.minR ?? 1.2;
  const maxR = opts.maxR ?? 6.0;
  const offset = opts.offset ?? 0.12;

  const centerH = getTerrainHeight(cx, cz);
  const waterLevel = centerH + offset;

  const shoreDists: number[] = [];
  for (let a = 0; a < RAYS; a++) {
    const ang = (a / RAYS) * Math.PI * 2;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    let dist = maxR;
    for (let r = STEP; r <= maxR; r += STEP) {
      if (getTerrainHeight(cx + dx * r, cz + dz * r) > waterLevel) {
        dist = r;
        break;
      }
    }
    shoreDists.push(dist);
  }

  // 取约 35% 分位数：比 min 宽容、又不至于溢过最低岸。
  shoreDists.sort((p, q) => p - q);
  const idx = Math.floor(shoreDists.length * 0.35);
  let radius = shoreDists[idx];
  radius = Math.max(minR, Math.min(maxR, radius));

  return { waterLevel, radius };
}

/**
 * 把拟合结果序列化进 PlacedAsset.customState（与气球颜色等并存的字符串字段）。
 * 形如 "pond:水位:半径"。解析失败回退默认。
 */
export function encodePondState(fit: PondFit): string {
  return `pond:${fit.waterLevel.toFixed(3)}:${fit.radius.toFixed(3)}`;
}

export function decodePondState(s: string | undefined): PondFit | null {
  if (!s || !s.startsWith('pond:')) return null;
  const parts = s.split(':');
  const waterLevel = parseFloat(parts[1]);
  const radius = parseFloat(parts[2]);
  if (Number.isNaN(waterLevel) || Number.isNaN(radius)) return null;
  return { waterLevel, radius };
}
