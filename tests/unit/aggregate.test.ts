import { describe, expect, it } from 'vitest';
import { aggregate } from '@/lib/report/aggregate';
import type { LogEntry, LogType } from '@/types/domain';

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'x',
    timestamp: '2026-06-01T10:00:00.000Z',
    type: 'trilling',
    intensity: 5,
    durationMinutes: 10,
    location: 'Woonkamer',
    description: '',
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('aggregate', () => {
  it('returns zeroed shape for empty input', () => {
    const a = aggregate([]);
    expect(a.count).toBe(0);
    expect(a.days).toBe(0);
    expect(a.totalDuration).toBe(0);
    expect(a.avgIntensity).toBe(0);
    expect(a.byType).toEqual({ trilling: 0, geluid: 0, beide: 0 });
    expect(a.byDay).toEqual({});
    expect(a.byHour).toHaveLength(24);
    expect(a.byHour.every((h) => h === 0)).toBe(true);
  });

  it('counts entries and sums durations', () => {
    const a = aggregate([
      entry({ durationMinutes: 5 }),
      entry({ durationMinutes: 10 }),
      entry({ durationMinutes: 15 }),
    ]);
    expect(a.count).toBe(3);
    expect(a.totalDuration).toBe(30);
  });

  it('breaks down by type for each LogType', () => {
    const a = aggregate([
      entry({ type: 'trilling' }),
      entry({ type: 'trilling' }),
      entry({ type: 'geluid' }),
      entry({ type: 'beide' }),
    ]);
    expect(a.byType.trilling).toBe(2);
    expect(a.byType.geluid).toBe(1);
    expect(a.byType.beide).toBe(1);
  });

  it('buckets entries by YYYY-MM-DD local day', () => {
    const a = aggregate([
      entry({ timestamp: '2026-06-01T08:00:00.000Z' }),
      entry({ timestamp: '2026-06-01T20:00:00.000Z' }),
      entry({ timestamp: '2026-06-02T03:00:00.000Z' }),
    ]);
    const dayKeys = Object.keys(a.byDay);
    expect(dayKeys.length).toBe(2);
    expect(a.byDay[dayKeys[0] as string]).toBe(2);
    expect(a.byDay[dayKeys[1] as string]).toBe(1);
  });

  it('counts `days` as the number of distinct days with entries', () => {
    const a = aggregate([
      entry({ timestamp: '2026-06-01T08:00:00.000Z' }),
      entry({ timestamp: '2026-06-01T20:00:00.000Z' }),
      entry({ timestamp: '2026-06-02T03:00:00.000Z' }),
      entry({ timestamp: '2026-06-04T03:00:00.000Z' }),
    ]);
    expect(a.days).toBe(3);
  });

  it('computes avgIntensity to one decimal', () => {
    const a = aggregate([
      entry({ intensity: 4 }),
      entry({ intensity: 5 }),
      entry({ intensity: 6 }),
    ]);
    expect(a.avgIntensity).toBe(5);
  });

  it('rounds avgIntensity to one decimal', () => {
    const a = aggregate([entry({ intensity: 3 }), entry({ intensity: 4 })]);
    expect(a.avgIntensity).toBe(3.5);
  });

  it('buckets entries by hour of day (local time)', () => {
    // Two entries at 10:00 local, one at 23:00 local.
    const a = aggregate([
      entry({ timestamp: '2026-06-01T10:00:00.000Z' }),
      entry({ timestamp: '2026-06-02T10:30:00.000Z' }),
      entry({ timestamp: '2026-06-03T23:00:00.000Z' }),
    ]);
    // The exact hour buckets depend on the test machine's timezone, but
    // exactly two buckets should be non-zero and one should have count 2.
    const nonZero = a.byHour.filter((h) => h > 0);
    expect(nonZero.length).toBe(2);
    expect(nonZero).toContain(2);
    expect(nonZero).toContain(1);
  });

  it('does not use Date.now() — output is fully deterministic for a fixed input', () => {
    const logs: LogEntry[] = [
      entry({ timestamp: '2026-06-01T10:00:00.000Z', intensity: 7 }),
    ];
    const a1 = aggregate(logs);
    const a2 = aggregate(logs);
    expect(a1).toEqual(a2);
  });

  it('exhaustive shape check: all LogType keys present in byType even if 0', () => {
    const a = aggregate([entry({ type: 'geluid' })]);
    const expected: Record<LogType, number> = { trilling: 0, geluid: 1, beide: 0 };
    expect(a.byType).toEqual(expected);
  });
});
