import { describe, expect, it } from 'vitest';
import { getCropGrowthProgress } from './crops';

describe('crop growth progress', () => {
  it('keeps fully grown crops complete', () => {
    expect(getCropGrowthProgress({ growthProgress: 1, plantedAt: 100 }, 10)).toBe(1);
  });

  it('advances planted crops by playtime and clamps at one', () => {
    expect(getCropGrowthProgress({ plantedAt: 10 }, 30)).toBe(0.5);
    expect(getCropGrowthProgress({ plantedAt: 10 }, 80)).toBe(1);
  });

  it('never regresses below saved progress while the crop is still growing', () => {
    expect(getCropGrowthProgress({ growthProgress: 0.7, plantedAt: 100 }, 110)).toBe(0.7);
  });

  it('uses explicit progress for legacy crop states without plantedAt', () => {
    expect(getCropGrowthProgress({ growthProgress: 0.35 }, 100)).toBe(0.35);
    expect(getCropGrowthProgress({}, 100)).toBe(0);
  });
});
