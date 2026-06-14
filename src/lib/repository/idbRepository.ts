import { openDB, type IDBPDatabase } from 'idb';
import type { LogEntry, NewLogEntry } from '@/types/domain';
import type { LogRepository } from './types';

export const LOG_STORE_NAME = 'overlast_logs_v1';
export const LOG_INDEX_TIMESTAMP = 'timestamp';

export interface IdbLogRepositoryOptions {
  /** Database name. Default: 'overlast-logger'. Override in tests. */
  dbName?: string;
  /** Id generator. Default: time + random. */
  idFactory?: () => string;
  /** Clock for `createdAt`. Default: `new Date()`. */
  now?: () => Date;
}

function defaultIdFactory(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function open(dbName: string): Promise<IDBPDatabase> {
  return openDB(dbName, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(LOG_STORE_NAME)) {
        const store = db.createObjectStore(LOG_STORE_NAME, { keyPath: 'id' });
        store.createIndex(LOG_INDEX_TIMESTAMP, 'timestamp', { unique: false });
      }
    },
  });
}

export interface IdbLogRepository extends LogRepository {
  /** Exposed for tests; not part of the `LogRepository` contract. */
  readonly dbName: string;
}

export async function idbLogRepository(
  options: IdbLogRepositoryOptions = {},
): Promise<IdbLogRepository> {
  const dbName = options.dbName ?? 'overlast-logger';
  const idFactory = options.idFactory ?? defaultIdFactory;
  const now = options.now ?? (() => new Date());
  const db = await open(dbName);
  const subscribers = new Set<() => void>();
  function notify() {
    for (const fn of subscribers) fn();
  }

  return {
    dbName,
    async list(): Promise<LogEntry[]> {
      const all = (await db.getAll(LOG_STORE_NAME)) as LogEntry[];
      return all
        .slice()
        .sort((a, b) =>
          a.createdAt === b.createdAt
            ? a.id.localeCompare(b.id)
            : a.createdAt.localeCompare(b.createdAt),
        );
    },
    async add(entry: NewLogEntry): Promise<LogEntry> {
      const stored: LogEntry = {
        ...entry,
        id: idFactory(),
        createdAt: now().toISOString(),
      };
      await db.put(LOG_STORE_NAME, stored);
      notify();
      return stored;
    },
    async remove(id: string): Promise<void> {
      await db.delete(LOG_STORE_NAME, id);
      notify();
    },
    async clear(): Promise<void> {
      await db.clear(LOG_STORE_NAME);
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
