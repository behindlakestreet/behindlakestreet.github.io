import type { LogEntry, NewLogEntry } from '@/types/domain';
import type { LogRepository } from './types';

export interface MemoryLogRepositoryOptions {
  /** Override the id generator. Default: time + random. */
  idFactory?: () => string;
  /** Override the clock for `createdAt`. Default: `new Date()`. */
  now?: () => Date;
}

function defaultIdFactory(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Blob) return value;
  if (Array.isArray(value)) return value.map((v) => deepClone(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = deepClone(v);
  }
  return out as T;
}

/**
 * In-memory implementation of `LogRepository`. Used in tests and as a fallback
 * when IndexedDB is unavailable. Returns deep-cloned values on `list()` so
 * callers can't mutate stored entries by mutating the returned array.
 */
export function memoryLogRepository(
  options: MemoryLogRepositoryOptions = {},
): LogRepository {
  const idFactory = options.idFactory ?? defaultIdFactory;
  const now = options.now ?? (() => new Date());
  const store: LogEntry[] = [];
  const subscribers = new Set<() => void>();
  function notify() {
    for (const fn of subscribers) fn();
  }

  return {
    async list() {
      return store.map((e) => deepClone(e));
    },
    async add(entry: NewLogEntry): Promise<LogEntry> {
      const stored: LogEntry = {
        ...deepClone(entry),
        id: idFactory(),
        createdAt: now().toISOString(),
      };
      store.push(stored);
      notify();
      return deepClone(stored);
    },
    async remove(id: string): Promise<void> {
      const idx = store.findIndex((e) => e.id === id);
      if (idx >= 0) {
        store.splice(idx, 1);
        notify();
      }
    },
    async clear(): Promise<void> {
      store.length = 0;
      notify();
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },
  };
}
