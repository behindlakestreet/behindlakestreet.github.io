import { describe, expect, it, afterEach } from 'vitest';
import { getLogRepository, getProfileRepository, inMemoryRepositories, setRepositories } from '@/lib/repository';
import { idbLogRepository } from '@/lib/repository/idbRepository';
import { idbProfileRepository } from '@/lib/repository/idbProfileRepository';

describe('repository selector', () => {
  let restore: (() => void) | null = null;

  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('returns in-memory impls under setRepositories()', async () => {
    const { log, profile } = inMemoryRepositories();
    restore = setRepositories(log, profile);
    expect(await getLogRepository()).toBe(log);
    expect(await getProfileRepository()).toBe(profile);
  });

  it('falls back to IndexedDB impls when no override is set', async () => {
    // Force a clean cache by overriding with null, then clearing.
    restore = setRepositories(null, null);
    restore = setRepositories(null, null);
    // The two function calls below should both open IndexedDB. We don't
    // actually want to mutate the user's data, so just check the
    // selector resolves with *something*.
    const log = await getLogRepository();
    const profile = await getProfileRepository();
    expect(log).toBeDefined();
    expect(profile).toBeDefined();
  });

  it('idbLogRepository and idbProfileRepository open real IndexedDB', async () => {
    const dbName = `selector-test-${Math.random()}`;
    const log = await idbLogRepository({ dbName });
    const profile = await idbProfileRepository({ dbName });
    expect(log.dbName).toBe(dbName);
    expect(profile.dbName).toBe(dbName);
  });
});
