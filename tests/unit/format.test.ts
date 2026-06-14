import { describe, expect, it } from 'vitest';
import { fmtDate, fmtDateOnly } from '@/lib/time/format';

describe('fmtDate', () => {
  it('formats an ISO timestamp in nl-NL with 2-digit day/month and 4-digit year', () => {
    // The `nl-NL` locale emits a comma between date and time, e.g.
    // "05-06-2026, 14:30" — this matches the reference implementation.
    const out = fmtDate('2026-06-05T14:30:00.000Z');
    expect(out).toMatch(/^\d{2}-\d{2}-\d{4}, \d{2}:\d{2}$/);
  });

  it('includes the local day and year', () => {
    // Use a fixed instant and assert the year is 2026 regardless of TZ.
    const out = fmtDate('2026-06-05T12:00:00.000Z');
    expect(out).toContain('2026');
    expect(out).toMatch(/0[5-6]/); // day is 05 or 06 depending on TZ (acceptable)
  });

  it('returns empty string for empty input', () => {
    expect(fmtDate('')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(fmtDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(fmtDate(undefined)).toBe('');
  });
});

describe('fmtDateOnly', () => {
  it('formats an ISO timestamp in nl-NL with 2-digit day/month and 4-digit year', () => {
    const out = fmtDateOnly('2026-06-05T12:00:00.000Z');
    expect(out).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });

  it('returns empty string for empty input', () => {
    expect(fmtDateOnly('')).toBe('');
  });
});
