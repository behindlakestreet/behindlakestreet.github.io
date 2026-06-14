import type { LogEntry, LogType } from '@/types/domain';
import { fmtDate, fmtDateOnly } from '@/lib/time/format';
import type { Aggregate } from './aggregate';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

function typeLabel(t: LogType): string {
  return { trilling: 'Trilling', geluid: 'Geluid', beide: 'Trilling + Geluid' }[t];
}

const REPORT_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #222; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
  h1 { border-bottom: 2px solid #222; padding-bottom: 0.5rem; }
  h2 { margin-top: 2rem; color: #444; }
  .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin: 1rem 0; }
  .stat { background: #f5f5f5; padding: 1rem; border-radius: 6px; }
  .stat .num { font-size: 1.8rem; font-weight: 700; }
  .stat .lbl { color: #666; font-size: 0.9rem; }
  .chart { display: flex; align-items: flex-end; gap: 2px; border-bottom: 1px solid #ccc; padding: 0.5rem 0; min-height: 160px; }
  .bar-col { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 0; }
  .bar { background: #2563eb; width: 100%; }
  .bar.hour { background: #8b5cf6; }
  .bar-label { font-size: 0.7rem; color: #666; margin-top: 0.3rem; writing-mode: vertical-rl; transform: rotate(180deg); }
  .bar-count { font-size: 0.7rem; color: #333; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
  th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; vertical-align: top; }
  th { background: #f5f5f5; }
  footer { margin-top: 2rem; font-size: 0.8rem; color: #666; border-top: 1px solid #ccc; padding-top: 1rem; }
  @media print { body { max-width: none; margin: 0; } }
`;

function buildDayBars(byDay: Record<string, number>): string {
  const entries = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return '<p>Geen data</p>';
  const maxDay = Math.max(1, ...entries.map(([, c]) => c));
  return entries
    .map(([day, count]) => {
      const h = Math.round((count / maxDay) * 120);
      const label = day.slice(5);
      return `<div class="bar-col">
        <div class="bar" style="height:${h}px" title="${count} meldingen"></div>
        <div class="bar-label">${label}</div>
        <div class="bar-count">${count}</div>
      </div>`;
    })
    .join('');
}

function buildHourBars(byHour: number[]): string {
  const maxHour = Math.max(1, ...byHour);
  return byHour
    .map((c, i) => {
      const h = Math.round((c / maxHour) * 120);
      return `<div class="bar-col">
        <div class="bar hour" style="height:${h}px" title="${c} meldingen"></div>
        <div class="bar-label">${i}</div>
      </div>`;
    })
    .join('');
}

function buildRows(logs: readonly LogEntry[]): string {
  if (logs.length === 0) {
    return '<tr><td colspan="8">Geen meldingen in deze periode</td></tr>';
  }
  return logs
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map(
      (l) => `<tr>
        <td>${escapeHtml(fmtDate(l.timestamp))}</td>
        <td>${escapeHtml(typeLabel(l.type))}</td>
        <td>${l.intensity}/10</td>
        <td>${l.durationMinutes} min</td>
        <td>${escapeHtml(l.location)}</td>
        <td>${l.soundDb ? `${l.soundDb} dB` : '—'}</td>
        <td>${l.vibration ? `${l.vibration.max} m/s²` : '—'}</td>
        <td>${escapeHtml(l.description || '')}</td>
      </tr>`,
    )
    .join('');
}

function periodLabel(logs: readonly LogEntry[]): string {
  if (logs.length === 0) return '—';
  // Sorted ascending; first is earliest, last is latest.
  const sorted = logs.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return '—';
  if (first.timestamp === last.timestamp) return fmtDateOnly(first.timestamp);
  return `${fmtDateOnly(first.timestamp)} t/m ${fmtDateOnly(last.timestamp)}`;
}

export function buildReportHtml(logs: readonly LogEntry[], agg: Aggregate): string {
  const dayBars = buildDayBars(agg.byDay);
  const hourBars = buildHourBars(agg.byHour);
  const rows = buildRows(logs);
  const period = periodLabel(logs);
  const generatedAt = fmtDate(new Date().toISOString());

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Overlast rapport</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<h1>Overlast rapport bouwwerkzaamheden</h1>
<p><strong>Periode:</strong> ${escapeHtml(period)}</p>

<h2>Samenvatting</h2>
<div class="meta-grid">
  <div class="stat"><div class="num">${agg.count}</div><div class="lbl">Meldingen totaal</div></div>
  <div class="stat"><div class="num">${agg.days}</div><div class="lbl">Dagen met overlast</div></div>
  <div class="stat"><div class="num">${agg.totalDuration}</div><div class="lbl">Minuten totaal</div></div>
  <div class="stat"><div class="num">${agg.avgIntensity}</div><div class="lbl">Gem. intensiteit</div></div>
</div>

<h2>Verdeling per type</h2>
<ul>
  <li>Trilling: ${agg.byType.trilling || 0}</li>
  <li>Geluid: ${agg.byType.geluid || 0}</li>
  <li>Beide: ${agg.byType.beide || 0}</li>
</ul>

<h2>Meldingen per dag</h2>
<div class="chart">${dayBars}</div>

<h2>Verdeling per uur van de dag</h2>
<div class="chart">${hourBars}</div>

<h2>Alle meldingen</h2>
<table>
  <thead>
    <tr>
      <th>Datum/tijd</th><th>Type</th><th>Intensiteit</th><th>Duur</th>
      <th>Locatie</th><th>Geluid</th><th>Trilling</th><th>Omschrijving</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<footer>
  Gegenereerd op ${escapeHtml(generatedAt)} · Overlast Logger
</footer>
</body>
</html>`;
}
