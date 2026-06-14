import type { LogEntry, NewLogEntry } from '@/types/domain';

export type LogSubscriber = () => void;

export interface LogRepository {
  /** Return all entries in insertion order. */
  list(): Promise<LogEntry[]>;
  /** Add a new entry. The repository assigns `id` and `createdAt`. */
  add(entry: NewLogEntry): Promise<LogEntry>;
  /** Remove an entry by id. No-op if it doesn't exist. */
  remove(id: string): Promise<void>;
  /** Remove all entries. */
  clear(): Promise<void>;
  /**
   * Subscribe to changes. Returns an unsubscribe function. The subscriber
   * is called after every successful `add`/`remove`/`clear` so consumers
   * can re-read.
   */
  subscribe(fn: LogSubscriber): () => void;
}
