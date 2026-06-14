import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { buildBijlage1Zip } from '@/lib/letter/bijlage1';
import { buildReportHtml } from '@/lib/report/buildHtml';
import { aggregate } from '@/lib/report/aggregate';
import { summaryForLetter } from '@/lib/letter/summary';
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

const PERIOD = { from: '2026-06-01', to: '2026-06-05' };

describe('buildBijlage1Zip', () => {
  it('produces a non-empty Uint8Array', () => {
    const zip = buildBijlage1Zip({
      period: PERIOD,
      logs: [],
      agg: aggregate([]),
      reportHtml: buildReportHtml([], aggregate([])),
      summary: '',
    });
    expect(zip).toBeInstanceOf(Uint8Array);
    expect(zip.length).toBeGreaterThan(0);
  });

  it('zip parses and contains the four expected files', () => {
    const logs = [entry()];
    const agg = aggregate(logs);
    const reportHtml = buildReportHtml(logs, agg);
    const summary = summaryForLetter(logs, agg);
    const zip = buildBijlage1Zip({ period: PERIOD, logs, agg, reportHtml, summary });
    const files = unzipSync(zip);
    const names = Object.keys(files).sort();
    expect(names).toContain('overlast-rapport-2026-06-01.html');
    expect(names).toContain('logboek.csv');
    expect(names).toContain('logboek-aggregaat.csv');
    expect(names).toContain('logboek-samenvatting.txt');
    expect(names.length).toBe(4);
  });

  it('logboek.csv has the exact header row from the spec', () => {
    const zip = buildBijlage1Zip({
      period: PERIOD,
      logs: [],
      agg: aggregate([]),
      reportHtml: '<html></html>',
      summary: '',
    });
    const files = unzipSync(zip);
    const csv = strFromU8(files['logboek.csv']!);
    const firstLine = csv.split('\n')[0]?.trim() ?? '';
    expect(firstLine).toBe(
      'datum,tijd,type,sterkte_1_10,sterkte_1_5,duur_min,locatie,geluid_db,trilling_max_ms2,trilling_avg_ms2,heeft_audio,omschrijving',
    );
  });

  it('logboek.csv renders one row per entry with the correct fields', () => {
    const logs = [
      entry({
        timestamp: '2026-06-01T10:00:00.000Z',
        type: 'trilling',
        intensity: 7,
        durationMinutes: 30,
        location: 'Woonkamer',
        description: 'hard gebonk',
        soundDb: 72,
        vibration: { max: 4.2, avg: 1.5, durationMs: 3000, sampleCount: 90 },
      }),
    ];
    const zip = buildBijlage1Zip({
      period: PERIOD,
      logs,
      agg: aggregate(logs),
      reportHtml: '',
      summary: '',
    });
    const csv = strFromU8(unzipSync(zip)['logboek.csv']!);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(2);
    const row = lines[1] ?? '';
    // Each field should be present. We don't pin the date format (depends
    // on TZ) but we do check the suffix.
    expect(row).toContain('trilling');
    expect(row).toContain('7');
    expect(row).toContain('30');
    expect(row).toContain('Woonkamer');
    expect(row).toContain('72');
    expect(row).toContain('4.2');
    expect(row).toContain('1.5');
    expect(row).toContain('nee'); // has audio = false
  });

  it('logboek.csv flags entries with an audio clip as heeft_audio=ja', () => {
    const blob = new Blob(['x'], { type: 'audio/webm' });
    const logs = [
      entry({
        audioClip: {
          mimeType: 'audio/webm',
          durationMs: 5000,
          sampleRate: 48000,
          blob,
        },
      }),
    ];
    const zip = buildBijlage1Zip({
      period: PERIOD,
      logs,
      agg: aggregate(logs),
      reportHtml: '',
      summary: '',
    });
    const csv = strFromU8(unzipSync(zip)['logboek.csv']!);
    const lines = csv.trim().split('\n');
    expect(lines[1] ?? '').toContain('ja');
  });

  it('logboek.csv quotes fields containing commas or quotes', () => {
    const logs = [
      entry({
        description: 'met, komma en "aanhaling"',
      }),
    ];
    const zip = buildBijlage1Zip({
      period: PERIOD,
      logs,
      agg: aggregate(logs),
      reportHtml: '',
      summary: '',
    });
    const csv = strFromU8(unzipSync(zip)['logboek.csv']!);
    expect(csv).toContain('"met, komma en ""aanhaling"""');
  });

  it('logboek-aggregaat.csv has the expected keys', () => {
    const logs = [entry()];
    const zip = buildBijlage1Zip({
      period: PERIOD,
      logs,
      agg: aggregate(logs),
      reportHtml: '',
      summary: '',
    });
    const csv = strFromU8(unzipSync(zip)['logboek-aggregaat.csv']!);
    const lines = csv.trim().split('\n');
    expect(lines[0] ?? '').toBe('key,value');
    const keys = lines.slice(1).map((l) => l.split(',')[0] ?? '').sort();
    expect(keys).toContain('count');
    expect(keys).toContain('days');
    expect(keys).toContain('totalDuration');
    expect(keys).toContain('avgIntensity');
    expect(keys).toContain('byType.trilling');
    expect(keys).toContain('byType.geluid');
    expect(keys).toContain('byType.beide');
  });

  it('logboek-samenvatting.txt is non-empty for non-empty logs', () => {
    const logs = [entry()];
    const zip = buildBijlage1Zip({
      period: PERIOD,
      logs,
      agg: aggregate(logs),
      reportHtml: '',
      summary: '<p>Samenvatting</p>',
    });
    const txt = strFromU8(unzipSync(zip)['logboek-samenvatting.txt']!);
    expect(txt.length).toBeGreaterThan(0);
    expect(txt).toContain('Samenvatting');
  });

  it('report HTML is the same string that was passed in', () => {
    const html = '<html><body>rapport</body></html>';
    const zip = buildBijlage1Zip({
      period: PERIOD,
      logs: [],
      agg: aggregate([]),
      reportHtml: html,
      summary: '',
    });
    const got = strFromU8(unzipSync(zip)['overlast-rapport-2026-06-01.html']!);
    expect(got).toBe(html);
  });

  it('is pure — same input yields the same zip bytes', () => {
    const logs = [entry()];
    const agg = aggregate(logs);
    const args = {
      period: PERIOD,
      logs,
      agg,
      reportHtml: buildReportHtml(logs, agg),
      summary: summaryForLetter(logs, agg),
    };
    const a = buildBijlage1Zip(args);
    const b = buildBijlage1Zip(args);
    expect(a).toEqual(b);
  });
});
