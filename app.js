const STORAGE_KEY = 'overlast_logs_v1';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const state = {
  logs: loadLogs(),
  pendingSound: null,
  pendingVibration: null,
};

function loadLogs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveLogs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.logs));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('nl-NL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateOnly(iso) {
  return new Date(iso).toLocaleDateString('nl-NL');
}

function tabSwitch() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      $('#' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'history') renderHistory();
      if (btn.dataset.tab === 'report') renderReportPreview();
    });
  });
}

function intensityDisplay() {
  const slider = $('#intensity');
  const display = $('#intensity-value');
  slider.addEventListener('input', () => display.textContent = slider.value);
}

function logForm() {
  $('#log-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const entry = {
      id: uid(),
      timestamp: new Date().toISOString(),
      type: document.querySelector('input[name="type"]:checked').value,
      intensity: parseInt($('#intensity').value, 10),
      duration: parseInt($('#duration').value, 10),
      location: $('#location').value,
      description: $('#description').value.trim(),
      soundDb: state.pendingSound,
      vibration: state.pendingVibration,
    };
    state.logs.push(entry);
    saveLogs();
    state.pendingSound = null;
    state.pendingVibration = null;
    $('#sound-result').textContent = '—';
    $('#vibration-result').textContent = '—';
    $('#description').value = '';
    flashSave();
  });
}

function flashSave() {
  const btn = $('#log-form button[type="submit"]');
  const orig = btn.textContent;
  btn.textContent = 'Opgeslagen ✓';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1200);
}

function measureSound() {
  const btn = $('#measure-sound');
  const out = $('#sound-result');
  btn.disabled = true;
  out.textContent = 'meten…';
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const samples = [];
    const start = performance.now();
    function tick() {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      samples.push(rms);
      if (performance.now() - start < 2000) {
        requestAnimationFrame(tick);
      } else {
        stream.getTracks().forEach(t => t.stop());
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        const db = avg > 0 ? Math.round(20 * Math.log10(avg) + 90) : 0;
        state.pendingSound = db;
        out.textContent = db + ' dB';
        btn.disabled = false;
        ctx.close();
      }
    }
    tick();
  }).catch(err => {
    out.textContent = 'geen toegang';
    btn.disabled = false;
  });
}

function measureVibration() {
  const btn = $('#measure-vibration');
  const out = $('#vibration-result');
  btn.disabled = true;
  out.textContent = 'meten…';
  const samples = [];
  const start = performance.now();
  function handler(e) {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    samples.push(mag);
  }
  window.addEventListener('devicemotion', handler);
  setTimeout(() => {
    window.removeEventListener('devicemotion', handler);
    btn.disabled = false;
    if (samples.length === 0) {
      out.textContent = 'geen sensor';
      return;
    }
    const max = Math.max(...samples);
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    state.pendingVibration = { max: +max.toFixed(2), avg: +avg.toFixed(2) };
    out.textContent = `max ${max.toFixed(1)} m/s²`;
  }, 3000);
}

function renderHistory() {
  const from = $('#filter-from').value;
  const to = $('#filter-to').value;
  const list = $('#log-list');
  const filtered = state.logs
    .filter(l => {
      if (from && l.timestamp < from) return false;
      if (to && l.timestamp > to + 'T23:59:59') return false;
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty">Nog geen meldingen.</div>';
    return;
  }

  list.innerHTML = filtered.map(l => `
    <div class="log-item type-${l.type}">
      <button class="delete danger" data-id="${l.id}">verwijder</button>
      <div class="header">
        <span class="type">${typeLabel(l.type)}</span>
        <span class="time">${fmtDate(l.timestamp)}</span>
      </div>
      <div class="meta">
        Intensiteit ${l.intensity}/10 · ${l.duration} min · ${l.location}
        ${l.soundDb ? ` · ${l.soundDb} dB` : ''}
        ${l.vibration ? ` · trilling max ${l.vibration.max} m/s²` : ''}
      </div>
      ${l.description ? `<div class="desc">${escapeHtml(l.description)}</div>` : ''}
    </div>
  `).join('');

  list.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Melding verwijderen?')) {
        state.logs = state.logs.filter(l => l.id !== btn.dataset.id);
        saveLogs();
        renderHistory();
      }
    });
  });
}

function filterControls() {
  $('#filter-apply').addEventListener('click', renderHistory);
  $('#filter-clear').addEventListener('click', () => {
    $('#filter-from').value = '';
    $('#filter-to').value = '';
    renderHistory();
  });
}

function typeLabel(t) {
  return { trilling: 'Trilling', geluid: 'Geluid', beide: 'Trilling + Geluid' }[t] || t;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function aggregate(logs) {
  const byType = { trilling: 0, geluid: 0, beide: 0 };
  const byDay = {};
  const byHour = new Array(24).fill(0);
  let totalDuration = 0;
  let intensitySum = 0;
  logs.forEach(l => {
    byType[l.type] = (byType[l.type] || 0) + 1;
    const day = l.timestamp.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
    const hour = new Date(l.timestamp).getHours();
    byHour[hour]++;
    totalDuration += l.duration;
    intensitySum += l.intensity;
  });
  return {
    count: logs.length,
    byType,
    byDay,
    byHour,
    totalDuration,
    avgIntensity: logs.length ? +(intensitySum / logs.length).toFixed(1) : 0,
    days: Object.keys(byDay).length,
  };
}

function buildReportHtml(logs, agg) {
  const days = Object.keys(agg.byDay).sort();
  const maxDay = Math.max(1, ...Object.values(agg.byDay));
  const maxHour = Math.max(1, ...agg.byHour);

  const dayBars = days.map(d => {
    const c = agg.byDay[d];
    const h = Math.round((c / maxDay) * 120);
    return `<div class="bar-col">
      <div class="bar" style="height:${h}px" title="${c} meldingen"></div>
      <div class="bar-label">${d.slice(5)}</div>
      <div class="bar-count">${c}</div>
    </div>`;
  }).join('');

  const hourBars = agg.byHour.map((c, i) => {
    const h = Math.round((c / maxHour) * 120);
    return `<div class="bar-col">
      <div class="bar hour" style="height:${h}px" title="${c} meldingen"></div>
      <div class="bar-label">${i}</div>
    </div>`;
  }).join('');

  const rows = logs
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map(l => `
      <tr>
        <td>${fmtDate(l.timestamp)}</td>
        <td>${typeLabel(l.type)}</td>
        <td>${l.intensity}/10</td>
        <td>${l.duration} min</td>
        <td>${escapeHtml(l.location)}</td>
        <td>${l.soundDb ? l.soundDb + ' dB' : '—'}</td>
        <td>${l.vibration ? l.vibration.max + ' m/s²' : '—'}</td>
        <td>${escapeHtml(l.description || '')}</td>
      </tr>
    `).join('');

  const period = logs.length
    ? `${fmtDateOnly(logs[0].timestamp)} t/m ${fmtDateOnly(logs[logs.length - 1].timestamp)}`
    : '—';

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Overlast rapport</title>
<style>
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
</style>
</head>
<body>
<h1>Overlast rapport bouwwerkzaamheden</h1>
<p><strong>Periode:</strong> ${period}</p>

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
<div class="chart">${dayBars || '<p>Geen data</p>'}</div>

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
  <tbody>${rows || '<tr><td colspan="8">Geen meldingen in deze periode</td></tr>'}</tbody>
</table>

<footer>
  Gegenereerd op ${fmtDate(new Date().toISOString())} · Overlast Logger
</footer>
</body>
</html>`;
}

function renderReportPreview() {
  const from = $('#report-from').value;
  const to = $('#report-to').value;
  const filtered = state.logs.filter(l => {
    if (from && l.timestamp < from) return false;
    if (to && l.timestamp > to + 'T23:59:59') return false;
    return true;
  });
  const html = buildReportHtml(filtered, aggregate(filtered));
  const iframe = $('#report-preview');
  iframe.srcdoc = html;
  iframe.dataset.html = html;
}

function reportControls() {
  $('#generate-report').addEventListener('click', renderReportPreview);
  $('#report-from').addEventListener('change', renderReportPreview);
  $('#report-to').addEventListener('change', renderReportPreview);

  $('#download-report').addEventListener('click', () => {
    const html = $('#report-preview').dataset.html;
    if (!html) { alert('Genereer eerst een rapport.'); return; }
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overlast-rapport-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('#clear-data').addEventListener('click', () => {
    if (confirm('Weet je zeker dat je alle meldingen wilt wissen? Dit kan niet ongedaan worden gemaakt.')) {
      state.logs = [];
      saveLogs();
      renderReportPreview();
      alert('Alle data gewist.');
    }
  });
}

function init() {
  tabSwitch();
  intensityDisplay();
  logForm();
  $('#measure-sound').addEventListener('click', measureSound);
  $('#measure-vibration').addEventListener('click', measureVibration);
  filterControls();
  reportControls();
}

document.addEventListener('DOMContentLoaded', init);
