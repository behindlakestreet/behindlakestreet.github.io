import { useId } from 'react';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeName } from '@/lib/theme';

const OPTIONS: ReadonlyArray<{ value: ThemeName; label: string }> = [
  { value: 'light', label: 'Standaard' },
  { value: 'dark', label: 'Dark (terminal)' },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const id = useId();
  return (
    <div className="flex items-center gap-1.5">
      <label
        htmlFor={id}
        className="text-muted text-xs whitespace-nowrap"
        data-testid="theme-label"
      >
        Thema:
      </label>
      <select
        id={id}
        data-testid="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeName)}
        className="border border-border rounded-md px-2 py-1 text-xs bg-card"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
