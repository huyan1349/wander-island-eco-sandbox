import { describe, expect, it } from 'vitest';
import type { PlacedAsset } from '../store';
import { evaluateSymbiosis, shuffle, SYMBIOSIS_RADIUS } from './flourish';

function asset(type: PlacedAsset['type'], x: number, z: number): PlacedAsset {
  return {
    id: `${type}-${x}-${z}`,
    type,
    position: { x, y: 0, z },
    rotation: { x: 0, y: 0, z: 0 },
  };
}

describe('evaluateSymbiosis', () => {
  it('returns no chain when there is no matching neighbor', () => {
    const result = evaluateSymbiosis('rock', { x: 0, z: 0 }, [
      asset('treeA', SYMBIOSIS_RADIUS + 2, 0),
    ]);

    expect(result).toEqual({ chain: 0, ecoBonus: 0, doubled: false, label: '' });
  });

  it('rewards water and tree adjacency in both placement orders', () => {
    expect(evaluateSymbiosis('treeA', { x: 0, z: 0 }, [asset('spring', 2, 0)])).toMatchObject({
      chain: 1,
      ecoBonus: 8,
      doubled: false,
    });

    expect(evaluateSymbiosis('spring', { x: 0, z: 0 }, [asset('treeB', 2, 0)])).toMatchObject({
      chain: 1,
      ecoBonus: 8,
      doubled: false,
    });
  });

  it('rewards deer and tree adjacency in both placement orders', () => {
    expect(evaluateSymbiosis('deer', { x: 0, z: 0 }, [asset('treeA', 3, 0)])).toMatchObject({
      chain: 2,
      ecoBonus: 16,
      doubled: false,
    });

    expect(evaluateSymbiosis('treeB', { x: 0, z: 0 }, [asset('deer', 3, 0)])).toMatchObject({
      chain: 2,
      ecoBonus: 16,
      doubled: false,
    });
  });

  it('marks wolf near deer as a doubled food-chain closure', () => {
    expect(evaluateSymbiosis('wolf', { x: 0, z: 0 }, [asset('deer', 2, 0)])).toMatchObject({
      chain: 3,
      ecoBonus: 30,
      doubled: true,
    });
  });
});

describe('shuffle', () => {
  it('preserves all deck entries without mutating the input array', () => {
    const input = ['oak', 'pine', 'spring', 'deer'] as const;
    const shuffled = shuffle([...input]);

    expect([...shuffled].sort()).toEqual([...input].sort());
    expect(input).toEqual(['oak', 'pine', 'spring', 'deer']);
  });
});
