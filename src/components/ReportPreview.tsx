import { useCallback, useMemo, useState } from 'react';
import { useLogs } from '@/hooks/useLogs';
import { aggregate } from '@/lib/report/aggregate';
import { buildReportHtml } from '@/lib/report/buildHtml';
import { DateRangeFilter } from './DateRangeFilter';

export function ReportPreview() {
  const { logs, clear } = useLogs();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (activeFrom && l.timestamp < activeFrom) return false;
      if (activeTo && l.timestamp > activeTo + 'T23:59:59') return false;
      return true;
    });
  }, [logs, activeFrom, activeTo]);

  const agg = useMemo(() => aggregate(filtered), [filtered]);
  const html = useMemo(() => buildReportHtml(filtered, agg), [filtered, agg]);

  function onApply() {
    setActiveFrom(from);
    setActiveTo(to);
  }
  function onClear() {
    setFrom('');
    setTo('');
    setActiveFrom('');
    setActiveTo('');
  }
  function onGenerate() {
    setActiveFrom(from);
    setActiveTo(to);
  }

  const onDownload = useCallback(() => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `overlast-rapport-${today}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [html]);

  const onClearAll = useCallback(() => {
    if (window.confirm('Weet je zeker dat je alle meldingen wilt wissen? Dit kan niet ongedaan worden gemaakt.')) {
      void clear();
    }
  }, [clear]);

  return (
    <div className="space-y-3">
      <DateRangeFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onApply={onApply}
        onClear={onClear}
      />
      <div className="report-actions flex gap-2 flex-wrap my-3">
        <button
          type="button"
          onClick={onGenerate}
          className="bg-primary text-white border border-primary rounded-md px-3 py-1.5 text-sm hover:opacity-90"
        >
          Genereer rapport
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="border border-border rounded-md px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          Download HTML
        </button>
        <button
          type="button"
          onClick={onClearAll}
          className="bg-danger text-white border border-danger rounded-md px-3 py-1.5 text-sm hover:opacity-90"
        >
          Wis alle data
        </button>
      </div>
      <iframe
        data-testid="report-iframe"
        title="Rapport voorvertoning"
        srcDoc={html}
        data-html={html}
        className="w-full h-[600px] border border-border rounded-md bg-white"
      />
    </div>
  );
}
