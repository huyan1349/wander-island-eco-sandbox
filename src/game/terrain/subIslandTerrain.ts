import { createNoise2D } from 'simplex-noise';

const MAIN_ISLAND_SIZE = 40;
export const SUB_ISLAND_SIZE = MAIN_ISLAND_SIZE * (2 / 3);
export const SUB_ISLAND_SEGMENTS = 32;
const LEGACY_SUB_ISLAND_SIZE = 20;

const subIslandNoise = createNoise2D();

export type SubIslandTerrainData = {
  positions: number[];
  types: number[];
  size: number;
  segments: number;
};

export function normalizeSubIslandTerrainData(
  terrain: SubIslandTerrainData,
  seedX: number,
  seedZ: number,
): SubIslandTerrainData {
  const hasEditedTypes = terrain.types.some((type) => type !== 0);
  if (terrain.size === LEGACY_SUB_ISLAND_SIZE && !hasEditedTypes) {
    return generateSubIslandTerrain(seedX, seedZ);
  }

  const expectedGridLength = (terrain.segments + 1) * (terrain.segments + 1) * 3;
  if (terrain.positions.length !== expectedGridLength) {
    return terrain;
  }

  const gridPos: number[][][] = [];
  const vertsPerRow = terrain.segments + 1;
  for (let row = 0; row <= terrain.segments; row++) {
    const line = [];
    for (let col = 0; col <= terrain.segments; col++) {
      const idx = (row * vertsPerRow + col) * 3;
      line.push([
        terrain.positions[idx],
        terrain.positions[idx + 1],
        terrain.positions[idx + 2],
      ]);
    }
    gridPos.push(line);
  }

  const positions: number[] = [];
  const types: number[] = [];
  const halfSize = terrain.size / 2;
  const segmentSize = terrain.size / terrain.segments;
  const islandRadius = terrain.size * 0.46 * 1.06;

  const pushVertex = (r: number, c: number) => {
    const [x, y, z] = gridPos[r][c];
    positions.push(x, y, z);
    const typeIdx = r * vertsPerRow + c;
    types.push(terrain.types[typeIdx] ?? 0);
  };

  for (let row = 0; row < terrain.segments; row++) {
    for (let col = 0; col < terrain.segments; col++) {
      const x = (col + 0.5) * segmentSize - halfSize;
      const z = (row + 0.5) * segmentSize - halfSize;
      if (Math.sqrt(x * x + z * z) > islandRadius) continue;

      pushVertex(row, col + 1);
      pushVertex(row, col);
      pushVertex(row + 1, col + 1);

      pushVertex(row, col);
      pushVertex(row + 1, col);
      pushVertex(row + 1, col + 1);
    }
  }

  return {
    positions,
    types,
    size: terrain.size,
    segments: terrain.segments,
  };
}

export function generateSubIslandTerrain(seedX: number, seedZ: number): SubIslandTerrainData {
  const gridPos: number[][][] = [];
  const halfSize = SUB_ISLAND_SIZE / 2;
  const segmentSize = SUB_ISLAND_SIZE / SUB_ISLAND_SEGMENTS;
  const maxDist = SUB_ISLAND_SIZE / 2;
  const hardEdge = maxDist * 0.9;
  const softEdge = maxDist * 0.8;

  for (let row = 0; row <= SUB_ISLAND_SEGMENTS; row++) {
    const line = [];
    const z = row * segmentSize - halfSize;
    for (let col = 0; col <= SUB_ISLAND_SEGMENTS; col++) {
      const x = col * segmentSize - halfSize;
      const dist = Math.sqrt(x * x + z * z);

      let height = (maxDist - dist) * 0.5;
      if (dist > hardEdge) {
        height = -20;
      } else if (dist > softEdge) {
        height -= (dist - softEdge) * 1.5;
      }

      if (height > 0) {
        height += subIslandNoise(seedX * 0.08 + x * 0.1, seedZ * 0.08 + z * 0.1) * 0.9;
        height += subIslandNoise(seedX * 0.19 + x * 0.2, seedZ * 0.19 + z * 0.2) * 0.35;
        if (height < 0.5) height = 0.2;
      } else {
        height = -2;
      }

      line.push([x, height, z]);
    }
    gridPos.push(line);
  }

  const positions: number[] = [];
  const types: number[] = [];

  const pushVertex = (r: number, c: number) => {
    const [x, y, z] = gridPos[r][c];
    positions.push(x, y, z);
    types.push(0);
  };

  for (let row = 0; row < SUB_ISLAND_SEGMENTS; row++) {
    for (let col = 0; col < SUB_ISLAND_SEGMENTS; col++) {
      const x = (col + 0.5) * segmentSize - halfSize;
      const z = (row + 0.5) * segmentSize - halfSize;
      if (Math.sqrt(x * x + z * z) > maxDist * 0.925) continue;

      pushVertex(row, col + 1);
      pushVertex(row, col);
      pushVertex(row + 1, col + 1);

      pushVertex(row, col);
      pushVertex(row + 1, col);
      pushVertex(row + 1, col + 1);
    }
  }

  return {
    positions,
    types,
    size: SUB_ISLAND_SIZE,
    segments: SUB_ISLAND_SEGMENTS,
  };
}
