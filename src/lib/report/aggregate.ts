import type { LogEntry, LogType } from '@/types/domain';

export interface Aggregate {
  count: number;
  days: number;
  totalDuration: number;
  avgIntensity: number;
  byType: Record<LogType, number>;
  byDay: Record<string, number>;
  byHour: number[];
}

const ZERO_AGGREGATE: Aggregate = {
  count: 0,
  days: 0,
  totalDuration: 0,
  avgIntensity: 0,
  byType: { trilling: 0, geluid: 0, beide: 0 },
  byDay: {},
  byHour: new Array(24).fill(0),
};

function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Pure aggregation over an array of log entries. No `Date.now()` — given the
 * same input, the output is fully deterministic.
 */
export function aggregate(logs: readonly LogEntry[]): Aggregate {
  if (logs.length === 0) return { ...ZERO_AGGREGATE, byHour: new Array(24).fill(0) };

  const byType: Record<LogType, number> = { trilling: 0, geluid: 0, beide: 0 };
  const byDay: Record<string, number> = {};
  const byHour = new Array(24).fill(0);
  let totalDuration = 0;
  let intensitySum = 0;

  for (const l of logs) {
    byType[l.type] += 1;

    const dayKey = localDayKey(l.timestamp);
    byDay[dayKey] = (byDay[dayKey] ?? 0) + 1;

    const hour = new Date(l.timestamp).getHours();
    const hourBucket = byHour[hour];
    byHour[hour] = (hourBucket ?? 0) + 1;

    totalDuration += l.durationMinutes;
    intensitySum += l.intensity;
  }

  return {
    count: logs.length,
    days: Object.keys(byDay).length,
    totalDuration,
    avgIntensity: +(intensitySum / logs.length).toFixed(1),
    byType,
    byDay,
    byHour,
  };
}
