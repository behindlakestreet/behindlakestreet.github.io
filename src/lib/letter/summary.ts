import type { LogEntry } from '@/types/domain';
import { fmtDate, fmtDateOnly } from '@/lib/time/format';
import type { Aggregate } from '@/lib/report/aggregate';

export interface SummaryForLetterOptions {
  /** Total days in the period under analysis. Used to render the
   *  "X van Y dagen" coverage line. If omitted, falls back to `agg.days`. */
  periodDays?: number;
}

/** Round a number to 1 decimal and format it with a Dutch decimal comma. */
function dutch1(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

function dutchInt(n: number): string {
  return n.toLocaleString('nl-NL');
}

function dutchPct(n: number): string {
  return `${Math.round(n)}%`;
}

function dutchDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} uur ${m} m`;
}

const NIGHT_HOURS = new Set([22, 23, 0, 1, 2, 3, 4, 5, 6]);

function intensityBucket1to5(intensity: number): number {
  // 1..10 → 1..5 via ceil(x/2). E.g. 1→1, 2→1, 3→2, ..., 9→5, 10→5.
  return Math.max(1, Math.min(5, Math.ceil(intensity / 2)));
}

function zwaarsteDag(logs: readonly LogEntry[]): { dayKey: string; minutes: number } | null {
  if (logs.length === 0) return null;
  const byDay: Record<string, number> = {};
  for (const l of logs) {
    const d = new Date(l.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDay[key] = (byDay[key] ?? 0) + l.durationMinutes;
  }
  let bestKey = '';
  let bestMin = 0;
  for (const [k, v] of Object.entries(byDay)) {
    if (v > bestMin) {
      bestKey = k;
      bestMin = v;
    }
  }
  return bestKey ? { dayKey: bestKey, minutes: bestMin } : null;
}

function typeBreakdown(logs: readonly LogEntry[]): { trilling: number; geluid: number; beide: number } {
  const out = { trilling: 0, geluid: 0, beide: 0 };
  for (const l of logs) {
    if (l.type === 'trilling') out.trilling += 1;
    else if (l.type === 'geluid') out.geluid += 1;
    else if (l.type === 'beide') out.beide += 1;
  }
  return out;
}

/**
 * Build the paragraaf 2a text used in the klachtbrief. Pure — given the
 * same input, the output is fully deterministic. Returns HTML (paragraphs
 * and an unordered list), suitable for direct inclusion in the letter
 * template.
 */
export function summaryForLetter(
  logs: readonly LogEntry[],
  agg: Aggregate,
  options: SummaryForLetterOptions = {},
): string {
  if (logs.length === 0) {
    return '<p>Geen meldingen in de geselecteerde periode.</p>';
  }

  const periodDays = options.periodDays ?? agg.days;

  // Total minutes → dutch locale + human hours/minutes.
  const totalMin = agg.totalDuration;
  const totalLabel = `${dutchInt(totalMin)} min (${dutchDuration(totalMin)})`;

  // Coverage: X van Y dagen (Z%).
  const coverageLabel = `${agg.days} van ${periodDays} dagen (${dutchPct(periodDays > 0 ? (agg.days / periodDays) * 100 : 0)})`;

  // Average minutes per overlast-dag.
  const avgPerDag = agg.days > 0 ? Math.round(totalMin / agg.days) : 0;

  // 1-5 sterkte: average of ceil(intensity/2) over all entries, 1 decimal.
  let bucketSum = 0;
  for (const l of logs) bucketSum += intensityBucket1to5(l.intensity);
  const sterkeAvg = logs.length > 0 ? bucketSum / logs.length : 0;

  // Night share: minutes whose entry hour is in [22..23, 0..6] as a
  // percentage of total minutes.
  let nightMinutes = 0;
  for (const l of logs) {
    const hour = new Date(l.timestamp).getHours();
    if (NIGHT_HOURS.has(hour)) nightMinutes += l.durationMinutes;
  }
  const nightPct = totalMin > 0 ? (nightMinutes / totalMin) * 100 : 0;

  // Zwaarste dag.
  const zwaarste = zwaarsteDag(logs);

  // Type breakdown.
  const tb = typeBreakdown(logs);

  const lines: string[] = [];
  lines.push('<p>');
  lines.push(
    `De overlast is door mij sinds <em>[DATUM]</em> systematisch geregistreerd in een logboek. De cijfers over de afgelopen periode luiden als volgt:`,
  );
  lines.push('</p>');
  lines.push('<ul>');
  lines.push(`<li>Totaal aantal minuten overlast: ${totalLabel}</li>`);
  lines.push(`<li>Aantal dagen met overlast: ${coverageLabel}</li>`);
  lines.push(`<li>Gemiddeld per overlast-dag: ${avgPerDag} minuten</li>`);
  lines.push(
    `<li>Gemiddelde sterkte-inschatting: ${dutch1(sterkeAvg)} op schaal 1&ndash;5</li>`,
  );
  lines.push(`<li>Aandeel in de nacht (22:00&ndash;07:00 uur): ${dutchPct(nightPct)}</li>`);
  if (zwaarste) {
    const date = new Date(zwaarste.dayKey + 'T12:00:00.000Z');
    const dateLabel = fmtDateOnly(date.toISOString());
    lines.push(
      `<li>Zwaarste dag: ${dateLabel} &mdash; ${zwaarste.minutes} minuten</li>`,
    );
  }
  lines.push('</ul>');
  lines.push('<p>');
  lines.push(
    `Verdeling per type: trilling ${tb.trilling}, geluid ${tb.geluid}, combinatie ${tb.beide}.`,
  );
  lines.push('</p>');

  // We render a "generated at" line using the timestamp of the most-recent
  // entry. This makes the output deterministic when no Date.now() is
  // available.
  const latest = logs.reduce((acc, l) => (l.timestamp > acc ? l.timestamp : acc), '');
  if (latest) {
    lines.push(`<p><small>Gegenereerd op ${fmtDate(latest)}.</small></p>`);
  }

  return lines.join('\n');
}
