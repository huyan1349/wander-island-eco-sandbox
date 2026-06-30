import { describe, expect, it } from 'vitest';
import { decodeTrackState, encodeTrackState } from './trackSystem';

describe('track state codec', () => {
  it('rounds track points to the persisted two-decimal format', () => {
    const encoded = encodeTrackState([
      { x: 0, z: 0 },
      { x: 1.234, z: -5.678 },
      { x: 12, z: 8.9 },
    ]);

    expect(encoded).toBe('track:0.00,0.00;1.23,-5.68;12.00,8.90');
    expect(decodeTrackState(encoded)).toEqual([
      { x: 0, z: 0 },
      { x: 1.23, z: -5.68 },
      { x: 12, z: 8.9 },
    ]);
  });

  it('rejects missing, malformed, or single-point track states', () => {
    expect(decodeTrackState(undefined)).toBeNull();
    expect(decodeTrackState('')).toBeNull();
    expect(decodeTrackState('water:0,0;1,1')).toBeNull();
    expect(decodeTrackState('track:0,0')).toBeNull();
    expect(decodeTrackState('track:0,0;bad,data')).toBeNull();
  });
});
