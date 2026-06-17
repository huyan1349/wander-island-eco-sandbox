import { useGameStore } from '../store';

/**
 * 双线性插值 — 在四个网格顶点之间平滑过渡
 * 消除阶梯式高度跳变，让动物/物件 Y 值连续变化
 */
function bilinearInterpolate(
    positions: Float32Array | number[],
    segments: number,
    col: number,
    row: number,
    fracCol: number,
    fracRow: number,
): number {
    const vertsPerRow = segments + 1;
    const c0 = Math.floor(col);
    const r0 = Math.floor(row);
    const c1 = Math.min(c0 + 1, segments);
    const r1 = Math.min(r0 + 1, segments);

    const idx00 = (r0 * vertsPerRow + c0) * 3 + 1;
    const idx10 = (r0 * vertsPerRow + c1) * 3 + 1;
    const idx01 = (r1 * vertsPerRow + c0) * 3 + 1;
    const idx11 = (r1 * vertsPerRow + c1) * 3 + 1;

    const h00 = idx00 < positions.length ? positions[idx00] : -2;
    const h10 = idx10 < positions.length ? positions[idx10] : -2;
    const h01 = idx01 < positions.length ? positions[idx01] : -2;
    const h11 = idx11 < positions.length ? positions[idx11] : -2;

    // 双线性插值
    const top = h00 + (h10 - h00) * fracCol;
    const bottom = h01 + (h11 - h01) * fracCol;
    return top + (bottom - top) * fracRow;
}

function getClosestVertexHeight(positions: Float32Array | number[], x: number, z: number): number {
    let minDistSq = Infinity;
    let closestY = -2;
    const len = positions.length;
    for (let i = 0; i < len; i += 3) {
        const dx = positions[i] - x;
        const dz = positions[i + 2] - z;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDistSq) {
            minDistSq = distSq;
            closestY = positions[i + 1];
        }
    }
    return closestY;
}

export function getTerrainHeight(x: number, z: number) {
    const data = useGameStore.getState().terrainData;
    let mainIslandHeight = -2;
    if (data.positions) {
        const { size, segments, positions } = data;
        const count = positions.length / 3;
        const gridW = Math.round(Math.sqrt(count));
        const isGrid = gridW * gridW === count;

        if (isGrid) {
            const halfSize = size / 2;
            let u = (x + halfSize) / size;
            let v = (z + halfSize) / size;

            if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
                const col = u * segments;
                const row = v * segments;

                const fracCol = col - Math.floor(col);
                const fracRow = row - Math.floor(row);

                mainIslandHeight = bilinearInterpolate(positions, segments, col, row, fracCol, fracRow);
            }
        } else {
            // Non-indexed triangle soup (like Wander Island's main mesh)
            mainIslandHeight = getClosestVertexHeight(positions, x, z);
        }
    }

    let bestSubIslandHeight = -2;
    const assets = useGameStore.getState().assets;
    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        if (asset.type !== 'sub_island' || !asset.terrain) continue;

        const localX = x - asset.position.x;
        const localZ = z - asset.position.z;
        const { size, segments, positions } = asset.terrain;
        const expectedGridLength = (segments + 1) * (segments + 1) * 3;

        if (positions.length !== expectedGridLength) {
            let nearestHeight = -2;
            let nearestDist = Infinity;
            for (let p = 0; p < positions.length; p += 3) {
                const dx = localX - positions[p];
                const dz = localZ - positions[p + 2];
                const distSq = dx * dx + dz * dz;
                if (distSq < nearestDist) {
                    nearestDist = distSq;
                    nearestHeight = positions[p + 1];
                }
            }
            if (nearestHeight > -2) {
                bestSubIslandHeight = Math.max(bestSubIslandHeight, asset.position.y + nearestHeight);
            }
            continue;
        }

        const halfSize = size / 2;
        const u = (localX + halfSize) / size;
        const v = (localZ + halfSize) / size;

        if (u < 0 || u > 1 || v < 0 || v > 1) continue;

        const col = u * segments;
        const row = v * segments;
        const fracCol = col - Math.floor(col);
        const fracRow = row - Math.floor(row);

        const subHeight = bilinearInterpolate(positions, segments, col, row, fracCol, fracRow);
        bestSubIslandHeight = Math.max(bestSubIslandHeight, asset.position.y + subHeight);
    }

    return Math.max(mainIslandHeight, bestSubIslandHeight);
}

/**
 * 副岛高度采样：取所有 sub_island 资产中该 (x,z) 处的最高地形面。
 * 抽出来给 buildHeightSampler 复用，否则副岛上的水深算错（读不到副岛）。
 */
export function subIslandHeightAt(x: number, z: number): number {
    let best = -Infinity;
    const assets = useGameStore.getState().assets;
    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        if (asset.type !== 'sub_island' || !asset.terrain) continue;
        const localX = x - asset.position.x;
        const localZ = z - asset.position.z;
        const { size, segments, positions } = asset.terrain;
        const expectedGridLength = (segments + 1) * (segments + 1) * 3;

        if (positions.length !== expectedGridLength) {
            let nearestHeight = -2, nearestDist = Infinity;
            for (let p = 0; p < positions.length; p += 3) {
                const dx = localX - positions[p];
                const dz = localZ - positions[p + 2];
                const d = dx * dx + dz * dz;
                if (d < nearestDist) { nearestDist = d; nearestHeight = positions[p + 1]; }
            }
            if (nearestHeight > -2) best = Math.max(best, asset.position.y + nearestHeight);
            continue;
        }

        const halfSize = size / 2;
        const u = (localX + halfSize) / size;
        const v = (localZ + halfSize) / size;
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        const col = u * segments, row = v * segments;
        const h = bilinearInterpolate(positions, segments, col, row, col - Math.floor(col), row - Math.floor(row));
        best = Math.max(best, asset.position.y + h);
    }
    return best;
}

/**
 * 构建主岛高度采样器：从当前地形 positions（含笔刷形变）一次性重建
 * (segments+1)² 的高度网格，返回一个对任意 (x,z) 做双线性插值的闭包。
 *
 * 用途：水面烘焙水深时需要「精确」高度——getTerrainHeight 对主岛走的是
 * 最近顶点（非索引三角汤），在斜坡上会阶梯跳变。这里恢复网格 + 双线性，
 * 精度到亚格子级，且只在放置/地形编辑时建一次网格，不进每帧。
 */
export function buildHeightSampler(): (x: number, z: number) => number {
    const data = useGameStore.getState().terrainData;
    const positions = data.positions;
    if (!positions) return () => -2;

    const size = data.size;
    const segments = data.segments;
    const W = segments + 1;
    const half = size / 2;
    const grid = new Float32Array(W * W);
    const filled = new Uint8Array(W * W);

    for (let i = 0; i < positions.length; i += 3) {
        const col = Math.round(((positions[i] + half) / size) * segments);
        const row = Math.round(((positions[i + 2] + half) / size) * segments);
        if (col < 0 || col >= W || row < 0 || row >= W) continue;
        const idx = row * W + col;
        grid[idx] = positions[i + 1];
        filled[idx] = 1;
    }

    return (x: number, z: number): number => {
        const fcol = ((x + half) / size) * segments;
        const frow = ((z + half) / size) * segments;
        if (fcol < 0 || fcol > segments || frow < 0 || frow > segments) return -2;
        const c0 = Math.floor(fcol);
        const r0 = Math.floor(frow);
        const c1 = Math.min(c0 + 1, segments);
        const r1 = Math.min(r0 + 1, segments);
        const tx = fcol - c0;
        const tz = frow - r0;
        const i00 = r0 * W + c0, i10 = r0 * W + c1, i01 = r1 * W + c0, i11 = r1 * W + c1;
        // 个别未填充格点回退到相邻已填值，避免 0 值塌陷
        const h00 = filled[i00] ? grid[i00] : -2;
        const h10 = filled[i10] ? grid[i10] : h00;
        const h01 = filled[i01] ? grid[i01] : h00;
        const h11 = filled[i11] ? grid[i11] : h10;
        const a = h00 + (h10 - h00) * tx;
        const b = h01 + (h11 - h01) * tx;
        const mainH = a + (b - a) * tz;
        // 并入副岛：副岛上的水体水深要按副岛地形算，否则常被全裁→没水。
        return Math.max(mainH, subIslandHeightAt(x, z));
    };
}

export function getTerrainGradient(x: number, z: number) {
     const h = getTerrainHeight(x, z);
     // Sample nearby points for gradient (slightly larger offset for smoother gradient)
     const hX = getTerrainHeight(x + 0.3, z);
     const hZ = getTerrainHeight(x, z + 0.3);

     return { dx: hX - h, dz: hZ - h };
}
