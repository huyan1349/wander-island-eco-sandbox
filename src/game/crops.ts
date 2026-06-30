export const CROP_GROWTH_DURATION = 40;

export interface CropGrowthState {
  growthProgress?: number;
  plantedAt?: number;
}

export function getCropGrowthProgress(asset: CropGrowthState, playtime: number): number {
  if (typeof asset.growthProgress === 'number' && asset.growthProgress >= 1) return 1;
  if (typeof asset.plantedAt === 'number') {
    return Math.min(1, Math.max(asset.growthProgress ?? 0, (playtime - asset.plantedAt) / CROP_GROWTH_DURATION));
  }
  return asset.growthProgress ?? 0;
}
