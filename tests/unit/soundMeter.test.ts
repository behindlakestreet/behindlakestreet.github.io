import { describe, expect, it } from 'vitest';
import { rmsFromByteTimeDomain, rmsToDb } from '@/lib/sensors/soundMeter';

describe('rmsFromByteTimeDomain', () => {
  it('returns 0 for an all-zeros byte buffer (centered on 128)', () => {
    const bytes = new Uint8Array(100).fill(128);
    expect(rmsFromByteTimeDomain(bytes)).toBe(0);
  });

  it('returns a positive value for a non-zero signal', () => {
    const bytes = new Uint8Array(100);
    for (let i = 0; i < 100; i++) bytes[i] = i % 2 === 0 ? 200 : 56;
    expect(rmsFromByteTimeDomain(bytes)).toBeGreaterThan(0);
  });
});

describe('rmsToDb', () => {
  it('returns 0 for an empty array', () => {
    expect(rmsToDb([])).toBe(0);
  });

  it('returns 0 for an all-zero array (signal silent → log10 undefined)', () => {
    expect(rmsToDb([0, 0, 0])).toBe(0);
  });

  it('returns a positive number for non-zero input', () => {
    expect(rmsToDb([0.1, 0.2, 0.3])).toBeGreaterThan(0);
  });

  it('clamps to >= 0 even for very small RMS', () => {
    expect(rmsToDb([1e-9])).toBeGreaterThanOrEqual(0);
  });

  it('matches the reference formula: 20*log10(avg) + 90', () => {
    const avg = 0.5;
    expect(rmsToDb([avg])).toBe(Math.round(20 * Math.log10(avg) + 90));
  });
});
