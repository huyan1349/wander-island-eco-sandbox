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

export function getTerrainHeight(x: number, z: number) {
    const data = useGameStore.getState().terrainData;
    let mainIslandHeight = -2;
    if (data.positions) {
        const { size, segments, positions } = data;
        const halfSize = size / 2;

        // Normalize coordinates to 0..1
        let u = (x + halfSize) / size;
        let v = (z + halfSize) / size;

        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
            const col = u * segments;
            const row = v * segments;

            const fracCol = col - Math.floor(col);
            const fracRow = row - Math.floor(row);

            mainIslandHeight = bilinearInterpolate(positions, segments, col, row, fracCol, fracRow);
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

export function getTerrainGradient(x: number, z: number) {
     const h = getTerrainHeight(x, z);
     // Sample nearby points for gradient (slightly larger offset for smoother gradient)
     const hX = getTerrainHeight(x + 0.3, z);
     const hZ = getTerrainHeight(x, z + 0.3);

     return { dx: hX - h, dz: hZ - h };
}
