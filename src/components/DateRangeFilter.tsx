interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (next: string) => void;
  onToChange: (next: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onApply,
  onClear,
}: DateRangeFilterProps) {
  return (
    <div className="flex gap-2 items-center flex-wrap mb-3">
      <label className="flex items-center gap-1.5 text-muted text-sm">
        Van:{' '}
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="border border-border rounded-md px-2 py-1"
        />
      </label>
      <label className="flex items-center gap-1.5 text-muted text-sm">
        Tot:{' '}
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="border border-border rounded-md px-2 py-1"
        />
      </label>
      <button
        type="button"
        onClick={onApply}
        className="border border-border rounded-md px-3 py-1 text-sm hover:bg-gray-100"
      >
        Toepassen
      </button>
      <button
        type="button"
        onClick={onClear}
        className="border border-border rounded-md px-3 py-1 text-sm hover:bg-gray-100"
      >
        Wissen
      </button>
    </div>
  );
}
