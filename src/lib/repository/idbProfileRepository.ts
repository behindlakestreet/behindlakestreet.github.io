import { openDB, type IDBPDatabase } from 'idb';
import { EMPTY_PROFILE, type Profile } from '@/types/domain';
import type { ProfileRepository } from './profileRepository';

export const PROFILE_STORE_NAME = 'overlast_profile_v1';
export const PROFILE_KEY = 'default';

export interface IdbProfileRepositoryOptions {
  dbName?: string;
}

async function open(dbName: string): Promise<IDBPDatabase> {
  return openDB(dbName, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(PROFILE_STORE_NAME)) {
        db.createObjectStore(PROFILE_STORE_NAME);
      }
    },
  });
}

export interface IdbProfileRepository extends ProfileRepository {
  readonly dbName: string;
}

export async function idbProfileRepository(
  options: IdbProfileRepositoryOptions = {},
): Promise<IdbProfileRepository> {
  const dbName = options.dbName ?? 'overlast-logger';
  const db = await open(dbName);
  const subscribers = new Set<() => void>();
  function notify() {
    for (const fn of subscribers) fn();
  }

  return {
    dbName,
    async get(): Promise<Profile | null> {
      const value = (await db.get(PROFILE_STORE_NAME, PROFILE_KEY)) as Profile | undefined;
      if (!value) return null;
      return {
        verzoeker: { ...EMPTY_PROFILE.verzoeker, ...value.verzoeker },
        gemeente: { ...EMPTY_PROFILE.gemeente, ...value.gemeente },
      };
    },
    async save(profile: Profile): Promise<void> {
      await db.put(PROFILE_STORE_NAME, profile, PROFILE_KEY);
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
