import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getLogRepository } from '@/lib/repository';
import type { LogEntry, NewLogEntry } from '@/types/domain';

export interface UseLogsResult {
  logs: LogEntry[];
  loading: boolean;
  error: Error | null;
  add: (entry: NewLogEntry) => Promise<LogEntry>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface LogsSnapshot {
  logs: LogEntry[];
  ready: boolean;
}

let snapshot: LogsSnapshot = { logs: [], ready: false };
const listeners = new Set<() => void>();

function subscribeGlobal(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot() {
  return snapshot;
}

function setSnapshot(next: LogsSnapshot) {
  snapshot = next;
  for (const fn of listeners) fn();
}

export function useLogs(): UseLogsResult {
  const [error, setError] = useState<Error | null>(null);
  const snap = useSyncExternalStore(subscribeGlobal, getSnapshot, getSnapshot);
  const logs = snap.logs;
  const loading = !snap.ready;

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const repo = await getLogRepository();
        if (cancelled) return;
        unsub = repo.subscribe(() => {
          void (async () => {
            const next = await repo.list();
            setSnapshot({ logs: next, ready: true });
          })();
        });
        const initial = await repo.list();
        if (cancelled) return;
        setSnapshot({ logs: initial, ready: true });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setSnapshot({ logs: [], ready: true });
      }
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const refresh = useCallback(async () => {
    const repo = await getLogRepository();
    const next = await repo.list();
    setSnapshot({ logs: next, ready: true });
  }, []);

  const add = useCallback(
    async (entry: NewLogEntry): Promise<LogEntry> => {
      const repo = await getLogRepository();
      const stored = await repo.add(entry);
      // subscribe() will update the snapshot.
      return stored;
    },
    [],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      const repo = await getLogRepository();
      await repo.remove(id);
    },
    [],
  );

  const clear = useCallback(async (): Promise<void> => {
    const repo = await getLogRepository();
    await repo.clear();
  }, []);

  return { logs, loading, error, add, remove, clear, refresh };
}
