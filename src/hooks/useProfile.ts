import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getProfileRepository } from '@/lib/repository';
import type { Profile } from '@/types/domain';

export interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  save: (profile: Profile) => Promise<void>;
  refresh: () => Promise<void>;
}

// Module-level cache of the latest snapshot so all consumers see the
// same value and re-render together. This is a tiny pub-sub for the
// in-memory profile store; the IndexedDB impl notifies its own
// subscribers, and we bridge that into this module-level snapshot.
let snapshot: { value: Profile | null; ready: boolean } = { value: null, ready: false };
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

function setSnapshot(next: { value: Profile | null; ready: boolean }) {
  if (next.value === snapshot.value && next.ready === snapshot.ready) return;
  snapshot = next;
  for (const fn of listeners) fn();
}

export function useProfile(): UseProfileResult {
  const [error, setError] = useState<Error | null>(null);
  const snap = useSyncExternalStore(subscribeGlobal, getSnapshot, getSnapshot);
  const profile = snap.value;
  const loading = !snap.ready;

  // On mount, kick off the initial load. Wire the repo's save()
  // notifications into the global snapshot.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const repo = await getProfileRepository();
        if (cancelled) return;
        unsub = repo.subscribe(() => {
          void (async () => {
            const p = await repo.get();
            setSnapshot({ value: p, ready: true });
          })();
        });
        const initial = await repo.get();
        if (cancelled) return;
        setSnapshot({ value: initial, ready: true });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setSnapshot({ value: null, ready: true });
      }
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const save = useCallback(
    async (p: Profile): Promise<void> => {
      const repo = await getProfileRepository();
      await repo.save(p);
      // The repo's subscribe() handler will update the global snapshot.
    },
    [],
  );

  const refresh = useCallback(async () => {
    const repo = await getProfileRepository();
    const p = await repo.get();
    setSnapshot({ value: p, ready: true });
  }, []);

  return { profile, loading, error, save, refresh };
}
