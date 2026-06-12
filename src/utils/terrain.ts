import { useGameStore } from '../store';

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
            
            const c0 = Math.floor(col);
            const r0 = Math.floor(row);
            
            const vertsPerRow = segments + 1;
            const idx = (r0 * vertsPerRow + c0) * 3 + 1; // +1 for Y axis
            
            if (idx < positions.length && idx >= 0) {
                mainIslandHeight = positions[idx];
            }
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

        const col = Math.floor(u * segments);
        const row = Math.floor(v * segments);
        const vertsPerRow = segments + 1;
        const idx = (row * vertsPerRow + col) * 3 + 1;
        if (idx < positions.length && idx >= 0) {
            bestSubIslandHeight = Math.max(bestSubIslandHeight, asset.position.y + positions[idx]);
        }
    }

    return Math.max(mainIslandHeight, bestSubIslandHeight);
}

export function getTerrainGradient(x: number, z: number) {
     const h = getTerrainHeight(x, z);
     // Sample nearby points for gradient
     const hX = getTerrainHeight(x + 0.2, z);
     const hZ = getTerrainHeight(x, z + 0.2);
     
     return { dx: hX - h, dz: hZ - h };
}
