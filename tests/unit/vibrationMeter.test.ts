import { describe, expect, it } from 'vitest';
import { magnitude, summarize } from '@/lib/sensors/vibrationMeter';

describe('magnitude', () => {
  it('returns 0 for an empty sample', () => {
    expect(magnitude({})).toBe(0);
  });

  it('handles null components as 0', () => {
    expect(magnitude({ x: null, y: null, z: null })).toBe(0);
  });

  it('computes sqrt(x² + y² + z²) for full samples', () => {
    expect(magnitude({ x: 3, y: 4, z: 0 })).toBe(5);
    expect(magnitude({ x: 0, y: 0, z: 12 })).toBe(12);
    expect(magnitude({ x: 2, y: 3, z: 6 })).toBe(7);
  });
});

describe('summarize', () => {
  it('returns zeros for empty input', () => {
    expect(summarize([])).toEqual({ max: 0, avg: 0, sampleCount: 0 });
  });

  it('returns the single value as both max and avg', () => {
    expect(summarize([4.2])).toEqual({ max: 4.2, avg: 4.2, sampleCount: 1 });
  });

  it('computes max and average correctly', () => {
    const s = summarize([1, 2, 3, 4, 5]);
    expect(s.max).toBe(5);
    expect(s.avg).toBe(3);
    expect(s.sampleCount).toBe(5);
  });

  it('rounds to 2 decimals', () => {
    const s = summarize([1.234, 5.678]);
    expect(s.max).toBe(5.68);
    expect(s.avg).toBe(3.46);
  });
});
