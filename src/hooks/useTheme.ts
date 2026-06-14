import { useCallback, useEffect, useState } from 'react';
import { applyTheme, readStoredTheme, setTheme, type ThemeName } from '@/lib/theme';

const listeners = new Set<(t: ThemeName) => void>();

function broadcast(theme: ThemeName) {
  for (const fn of listeners) fn(theme);
}

export function useTheme(): { theme: ThemeName; setTheme: (next: ThemeName) => void } {
  const [theme, setLocal] = useState<ThemeName>(() => readStoredTheme());

  useEffect(() => {
    const fn = (next: ThemeName) => setLocal(next);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  // Ensure the attribute is in sync on mount (covers HMR re-mounts).
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const update = useCallback((next: ThemeName) => {
    setTheme(next);
    setLocal(next);
    broadcast(next);
  }, []);

  return { theme, setTheme: update };
}
