import { useGameStore } from '../../store';
import { getTerrainHeight } from '../../utils/terrain';
import { getWaterHeight } from '../water/oceanModel';

const STRUCTURE_WALK_RADIUS_SQ = 1.8 * 1.8;

type WalkableAsset = {
  type: string;
  position: { x: number; y: number; z: number };
};

function isStructure(type: string) {
  return type === 'platform' || type === 'pier' || type === 'bridge';
}

export function isWalkable(x: number, z: number, assets: WalkableAsset[]) {
  const groundY = getTerrainHeight(x, z);
  if (groundY > -0.1) return true;

  const state = useGameStore.getState();
  if (state.biome === 'tundra' || state.season === 'winter') {
    return true;
  }

  for (const asset of assets) {
    if (!isStructure(asset.type)) continue;
    const dx = asset.position.x - x;
    const dz = asset.position.z - z;
    if (dx * dx + dz * dz < STRUCTURE_WALK_RADIUS_SQ) return true;
  }
  return false;
}

export function getWalkableHeight(
  x: number,
  z: number,
  time: number,
  weather: string,
  assets: WalkableAsset[],
) {
  const groundY = getTerrainHeight(x, z);
  let surfaceY = groundY;
  let onStructure = false;

  for (const asset of assets) {
    if (!isStructure(asset.type)) continue;
    const dx = asset.position.x - x;
    const dz = asset.position.z - z;
    if (dx * dx + dz * dz < STRUCTURE_WALK_RADIUS_SQ) {
      surfaceY = asset.type === 'platform' ? getWaterHeight(x, z, time, weather) : asset.position.y;
      onStructure = true;
      break;
    }
  }

  return { y: surfaceY, onStructure };
}
