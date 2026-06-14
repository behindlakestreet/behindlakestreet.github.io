import { useMemo, useState } from 'react';
import { useLogs } from '@/hooks/useLogs';
import { DateRangeFilter } from './DateRangeFilter';
import { LogItem } from './LogItem';

export function LogList() {
  const { logs, remove } = useLogs();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // Filters are applied on click; this state holds the active filter.
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');

  const filtered = useMemo(() => {
    const list = logs.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return list.filter((l) => {
      if (activeFrom && l.timestamp < activeFrom) return false;
      if (activeTo && l.timestamp > activeTo + 'T23:59:59') return false;
      return true;
    });
  }, [logs, activeFrom, activeTo]);

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
  function onDelete(id: string) {
    if (window.confirm('Melding verwijderen?')) {
      void remove(id);
    }
  }

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
      {filtered.length === 0 ? (
        <div className="empty text-muted text-center py-6">Nog geen meldingen.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <LogItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
