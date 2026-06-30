import { describe, expect, it } from 'vitest';
import { buildIslandExportPayload, buildIslandSavePayload, normalizeIslandSavePayload } from './saveFormat';

describe('island save format', () => {
  it('serializes live terrain typed arrays into JSON-safe arrays', () => {
    const payload = buildIslandSavePayload({
      timeOfDay: 14,
      weather: 'rainy',
      season: 'spring',
      biome: 'forest',
      playerName: '阿岛',
      playerAvatar: 'avatar-url',
      terrainData: {
        positions: new Float32Array([1.25, -2, 3.5]),
        types: new Uint8Array([0, 2, 4]),
      },
      stats: { playtime: 9, itemsPlaced: 3 },
    });

    expect(payload).toMatchObject({
      timeOfDay: 14,
      weather: 'rainy',
      season: 'spring',
      biome: 'forest',
      playerName: '阿岛',
      playerAvatar: 'avatar-url',
      terrainPositions: [1.25, -2, 3.5],
      terrainTypes: [0, 2, 4],
      stats: { playtime: 9, itemsPlaced: 3 },
    });
  });

  it('normalizes legacy saves with safe defaults', () => {
    const payload = normalizeIslandSavePayload({
      weather: 'not-a-weather',
      assets: [{ id: 'a1', type: 'treeA', position: { x: 1, y: 0, z: 2 }, rotation: { x: 0, y: 0, z: 0 } }],
      stats: { playtime: 12 },
      terrainPositions: [0, 1, Number.NaN, 2],
    }, {
      playerName: 'wanderer',
      playerAvatar: 'fallback-avatar',
      season: 'winter',
      biome: 'tundra',
    });

    expect(payload.weather).toBe('sunny');
    expect(payload.season).toBe('winter');
    expect(payload.biome).toBe('tundra');
    expect(payload.playerName).toBe('wanderer');
    expect(payload.playerAvatar).toBe('fallback-avatar');
    expect(payload.ecoPoints).toBe(200);
    expect(payload.stats).toEqual({ playtime: 12, itemsPlaced: 1 });
    expect(payload.terrainPositions).toEqual([0, 1, 2]);
    expect(payload.terrainTypes).toBeNull();
  });

  it('adds stable export metadata without changing the game payload shape', () => {
    const payload = buildIslandExportPayload({
      islandName: '叶笺岛',
      weather: 'cloudy',
      unlockedAssets: ['treeA', 'pond'],
    }, { now: 12345 });

    expect(payload).toMatchObject({
      format: 'wander-island',
      version: 2,
      name: '叶笺岛',
      savedAt: 12345,
      weather: 'cloudy',
      unlockedAssets: ['treeA', 'pond'],
    });
  });
});
