import { describe, expect, it } from 'vitest';
import { summaryForLetter } from '@/lib/letter/summary';
import { aggregate } from '@/lib/report/aggregate';
import type { LogEntry } from '@/types/domain';

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

describe('summaryForLetter', () => {
  it('returns a sensible block for empty input', () => {
    const out = summaryForLetter([], aggregate([]));
    expect(out).toContain('Geen meldingen');
  });

  it('renders the total minutes in nl-NL locale with thousands separator', () => {
    const logs = [entry({ durationMinutes: 1805 })];
    const out = summaryForLetter(logs, aggregate(logs));
    expect(out).toContain('1.805 min');
    expect(out).toContain('30 uur 5 m');
  });

  it('renders days with overlast and the day coverage percentage', () => {
    const logs = [entry({ timestamp: '2026-06-01T10:00:00.000Z' })];
    const out = summaryForLetter(logs, aggregate(logs), { periodDays: 1 });
    expect(out).toContain('1 van 1 dagen');
    expect(out).toContain('100%');
  });

  it('renders gem. sterkte-inschatting 1-5 as the average of ceil(intensity/2)', () => {
    // Single entry of intensity 7 → bucket = ceil(7/2) = 4.
    const out = summaryForLetter(
      [entry({ intensity: 7 })],
      aggregate([entry({ intensity: 7 })]),
    );
    expect(out).toContain('4,0');
  });

  it('uses a Dutch decimal comma in the 1-5 sterkte average', () => {
    // intensities 7, 6 → buckets 4, 3 → avg 3.5
    const logs = [entry({ intensity: 7 }), entry({ intensity: 6 })];
    const out = summaryForLetter(logs, aggregate(logs));
    expect(out).toContain('3,5');
  });

  it('computes night share as percentage of minutes where entry hour is in [22..23, 0..6]', () => {
    // 60 min at 23:00, 60 min at 12:00 → 50% night.
    const logs = [
      entry({ timestamp: '2026-06-01T23:00:00.000Z', durationMinutes: 60 }),
      entry({ timestamp: '2026-06-01T12:00:00.000Z', durationMinutes: 60 }),
    ];
    const out = summaryForLetter(logs, aggregate(logs));
    expect(out).toContain('50%');
    expect(out).toMatch(/nacht/i);
  });

  it('renders the zwaarste dag with date and minutes', () => {
    const logs = [
      entry({ timestamp: '2026-06-01T10:00:00.000Z', durationMinutes: 10 }),
      entry({ timestamp: '2026-06-02T10:00:00.000Z', durationMinutes: 30 }),
    ];
    const out = summaryForLetter(logs, aggregate(logs));
    expect(out).toContain('30 minuten');
    // The zwaarste dag is 2026-06-02, formatted in nl-NL.
    expect(out).toContain('02-06-2026');
  });

  it('produces a string that includes the type breakdown counts', () => {
    const logs = [
      entry({ type: 'trilling' }),
      entry({ type: 'geluid' }),
      entry({ type: 'beide' }),
    ];
    const out = summaryForLetter(logs, aggregate(logs));
    expect(out).toMatch(/trilling/i);
    expect(out).toMatch(/geluid/i);
    expect(out).toMatch(/beide|combinatie/i);
  });

  it('handles a multi-day fixture: total/days/avg/sterkte/night/zwaarste all consistent with the input', () => {
    // Build a 12-day fixture in the same shape as the example letter in
    // `example_letter.md`. We don't hard-assert specific numbers; instead
    // we compute the expected output from the fixture and assert the
    // function produces it. This proves the function is internally
    // consistent and renders the right structure.
    const days = [
      '2026-05-25',
      '2026-05-26',
      '2026-05-27',
      '2026-05-28',
      '2026-05-29',
      '2026-05-30',
      '2026-05-31',
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
    ];

    // Each day: [dayHourMinutes, dayIntensity, nightHourMinutes, nightIntensity]
    // The shape mirrors the example: 12 days, one of which (2026-06-05) is
    // the heaviest. On 2026-06-05 we use a single 420-min entry at noon so
    // the local-day attribution is unambiguous.
    const plan: Record<string, [number, number, number, number]> = {
      '2026-05-25': [120, 7, 60, 8],
      '2026-05-26': [90, 7, 60, 7],
      '2026-05-27': [120, 6, 60, 6],
      '2026-05-28': [60, 7, 60, 7],
      '2026-05-29': [60, 5, 60, 6],
      '2026-05-30': [120, 6, 0, 0],
      '2026-05-31': [60, 7, 60, 7],
      '2026-06-01': [60, 8, 60, 7],
      '2026-06-02': [30, 6, 0, 0],
      '2026-06-03': [0, 0, 195, 7],
      '2026-06-04': [50, 5, 30, 6],
      '2026-06-05': [420, 8, 0, 0], // single 420-min entry at noon
    };

    // Compute expected numbers from the fixture.
    let total = 0;
    let nightTotal = 0;
    let bucketSum = 0;
    let count = 0;
    const dayTotals = new Map<string, number>();
    for (const [day, [dMin, dInt, nMin, nInt]] of Object.entries(plan)) {
      total += dMin + nMin;
      nightTotal += nMin;
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + dMin + nMin);
      if (dMin > 0) {
        bucketSum += Math.ceil(dInt / 2);
        count += 1;
      }
      if (nMin > 0) {
        bucketSum += Math.ceil(nInt / 2);
        count += 1;
      }
    }
    const expectedNightPct = Math.round((nightTotal / total) * 100);
    const expectedSterkte = (bucketSum / count).toFixed(1).replace('.', ',');
    const expectedTotalLabel = total.toLocaleString('nl-NL');

    // Find the zwaarste dag.
    let heaviestDay = '';
    let heaviestMin = 0;
    for (const [day, m] of dayTotals.entries()) {
      if (m > heaviestMin) {
        heaviestMin = m;
        heaviestDay = day;
      }
    }

    // Build entries.
    const logs: LogEntry[] = [];
    let idCounter = 0;
    for (const day of days) {
      const [dMin, dInt, nMin, nInt] = plan[day]!;
      if (dMin > 0) {
        logs.push(
          entry({
            id: `e${++idCounter}`,
            timestamp: `${day}T10:00:00.000Z`,
            durationMinutes: dMin,
            intensity: dInt,
          }),
        );
      }
      if (nMin > 0) {
        logs.push(
          entry({
            id: `e${++idCounter}`,
            timestamp: `${day}T23:00:00.000Z`,
            durationMinutes: nMin,
            intensity: nInt,
          }),
        );
      }
    }

    const agg = aggregate(logs);
    expect(agg.days).toBe(12);

    const out = summaryForLetter(logs, agg, { periodDays: 12 });

    expect(out).toContain(`${expectedTotalLabel} min`);
    expect(out).toMatch(/12 van 12 dagen/);
    expect(out).toMatch(/100%/);
    expect(out).toContain(`${expectedNightPct}%`);
    expect(out).toContain(expectedSterkte);
    expect(out).toContain(`${heaviestMin} minuten`);
    expect(out).toContain(heaviestDay.split('-').reverse().join('-')); // 2026-06-05 → 05-06-2026
    expect(out).toMatch(/Verdeling per type/i);
  });

  it('is pure — same input yields same output', () => {
    const logs = [entry()];
    const a = summaryForLetter(logs, aggregate(logs));
    const b = summaryForLetter(logs, aggregate(logs));
    expect(a).toBe(b);
  });

  it('falls back to agg.days when periodDays is not provided', () => {
    const logs = [entry({ timestamp: '2026-06-01T10:00:00.000Z' })];
    const out = summaryForLetter(logs, aggregate(logs));
    // 1 day, no periodDays → "1 van 1 dagen".
    expect(out).toContain('1 van 1 dagen');
  });
});
