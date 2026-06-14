import { describe, expect, it } from 'vitest';
import { buildReportHtml } from '@/lib/report/buildHtml';
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

describe('buildReportHtml', () => {
  it('produces a self-contained HTML document with no external assets', () => {
    const html = buildReportHtml([], aggregate([]));
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toMatch(/<html lang="nl">/);
    expect(html).toMatch(/<head>/);
    expect(html).toMatch(/<style>/); // CSS is inlined
    expect(html).not.toMatch(/<link [^>]*rel=["']stylesheet/); // no external stylesheets
    expect(html).not.toMatch(/<script /); // no external scripts
    expect(html).not.toMatch(/https?:\/\//); // no http(s) URLs in the rendered output
  });

  it('uses Dutch section labels', () => {
    const html = buildReportHtml([], aggregate([]));
    expect(html).toContain('Overlast rapport');
    expect(html).toContain('Samenvatting');
    expect(html).toContain('Verdeling per type');
    expect(html).toContain('Meldingen per dag');
    expect(html).toContain('Verdeling per uur van de dag');
    expect(html).toContain('Alle meldingen');
  });

  it('renders an empty-state row when there are no entries', () => {
    const html = buildReportHtml([], aggregate([]));
    expect(html).toContain('Geen meldingen in deze periode');
  });

  it('renders one row per entry, sorted by timestamp ascending in the table', () => {
    const logs = [
      entry({ id: '1', timestamp: '2026-06-02T10:00:00.000Z' }),
      entry({ id: '2', timestamp: '2026-06-01T10:00:00.000Z' }),
      entry({ id: '3', timestamp: '2026-06-03T10:00:00.000Z' }),
    ];
    const html = buildReportHtml(logs, aggregate(logs));
    // Find the start of the table and slice from there so we only check
    // the row order, not the order of the day-chart bars or the period
    // header.
    const tableStart = html.indexOf('<table>');
    const table = html.slice(tableStart);
    const pos1 = table.indexOf('02-06-2026');
    const pos2 = table.indexOf('01-06-2026');
    const pos3 = table.indexOf('03-06-2026');
    expect(pos2).toBeGreaterThan(-1);
    expect(pos1).toBeGreaterThan(-1);
    expect(pos3).toBeGreaterThan(-1);
    expect(pos2).toBeLessThan(pos1);
    expect(pos1).toBeLessThan(pos3);
  });

  it('HTML-escapes user input in description and location', () => {
    const logs = [
      entry({
        description: '<script>alert("xss")</script> & "quotes"',
        location: 'Kamer <test>',
      }),
    ];
    const html = buildReportHtml(logs, aggregate(logs));
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
    expect(html).toContain('Kamer &lt;test&gt;');
  });

  it('renders sound dB and vibration max in the table when present', () => {
    const logs = [
      entry({
        soundDb: 72,
        vibration: { max: 4.2, avg: 1.5, durationMs: 3000, sampleCount: 90 },
      }),
    ];
    const html = buildReportHtml(logs, aggregate(logs));
    expect(html).toContain('72 dB');
    expect(html).toContain('4.2 m/s²');
  });

  it('renders "—" in sound/vibration columns when not measured', () => {
    const html = buildReportHtml([entry()], aggregate([entry()]));
    // The em-dash placeholder should appear in cells where there's no reading.
    expect(html).toContain('—');
  });

  it('renders the summary stats from the aggregate', () => {
    const logs = [entry(), entry({ intensity: 7 }), entry({ intensity: 3 })];
    const agg = aggregate(logs);
    const html = buildReportHtml(logs, agg);
    expect(html).toContain(String(agg.count));
    expect(html).toContain(String(agg.days));
    expect(html).toContain(String(agg.totalDuration));
    expect(html).toContain(String(agg.avgIntensity));
  });

  it('renders one bar per day in the byDay chart (chart branch: many entries)', () => {
    const logs = [
      entry({ timestamp: '2026-06-01T10:00:00.000Z' }),
      entry({ timestamp: '2026-06-02T10:00:00.000Z' }),
      entry({ timestamp: '2026-06-02T20:00:00.000Z' }),
    ];
    const html = buildReportHtml(logs, aggregate(logs));
    // The day chart should contain 2 bar elements (one per distinct day).
    const dayChartMatch = html.match(/<div class="bar"[^>]*>/g) ?? [];
    expect(dayChartMatch.length).toBeGreaterThanOrEqual(2);
  });

  it('renders all 24 hour bars (chart branch: 24 buckets always)', () => {
    const html = buildReportHtml([], aggregate([]));
    const hourBars = html.match(/<div class="bar hour"[^>]*>/g) ?? [];
    expect(hourBars.length).toBe(24);
  });

  it('is pure — same input yields same output', () => {
    const logs = [entry()];
    const a = buildReportHtml(logs, aggregate(logs));
    const b = buildReportHtml(logs, aggregate(logs));
    expect(a).toBe(b);
  });
});
