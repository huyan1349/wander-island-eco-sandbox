type SnapPoint = { x: number; y?: number; z: number };

type PlatformLike = {
  id: string;
  type: string;
  position: SnapPoint;
};

type PlaceablePlatform = {
  type: string;
  position: SnapPoint;
  rotation: { x: number; y: number; z: number };
  scale?: number;
  connections?: string[];
};

const PLATFORM_SLOT = 3;
const SNAP_RADIUS = 5.2;
const OCCUPIED_RADIUS = 1.35;

const DIRECTIONS = [
  { x: PLATFORM_SLOT, z: 0 },
  { x: -PLATFORM_SLOT, z: 0 },
  { x: 0, z: PLATFORM_SLOT },
  { x: 0, z: -PLATFORM_SLOT },
];

const roundToGrid = (value: number) => Math.round(value / PLATFORM_SLOT) * PLATFORM_SLOT;

export function getFloatingPlatformSnap(point: SnapPoint, assets: PlatformLike[]) {
  const platforms = assets.filter((asset) => asset.type === 'platform');
  if (platforms.length === 0) {
    return {
      position: { ...point, x: roundToGrid(point.x), z: roundToGrid(point.z) },
      anchorId: undefined as string | undefined,
      snapped: false,
    };
  }

  let best: { x: number; z: number; distance: number; anchorId: string } | null = null;

  for (const platform of platforms) {
    for (const dir of DIRECTIONS) {
      const x = platform.position.x + dir.x;
      const z = platform.position.z + dir.z;
      const occupied = platforms.some((other) => {
        const dx = other.position.x - x;
        const dz = other.position.z - z;
        return Math.hypot(dx, dz) < OCCUPIED_RADIUS;
      });

      if (occupied) continue;

      const distance = Math.hypot(point.x - x, point.z - z);
      if (!best || distance < best.distance) {
        best = { x, z, distance, anchorId: platform.id };
      }
    }
  }

  if (best && best.distance <= SNAP_RADIUS) {
    return {
      position: { ...point, x: best.x, z: best.z },
      anchorId: best.anchorId,
      snapped: true,
    };
  }

  return {
    position: { ...point, x: roundToGrid(point.x), z: roundToGrid(point.z) },
    anchorId: undefined as string | undefined,
    snapped: false,
  };
}

export function snapFloatingPlatformPlacement<T extends PlaceablePlatform>(
  assetData: T,
  assets: PlatformLike[],
): T {
  if (assetData.type !== 'platform') return assetData;

  const snap = getFloatingPlatformSnap(assetData.position, assets);
  return {
    ...assetData,
    position: snap.position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
    connections: snap.anchorId ? [snap.anchorId] : assetData.connections,
  };
}
