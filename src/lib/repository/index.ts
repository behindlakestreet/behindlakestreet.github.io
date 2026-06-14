import { idbLogRepository, type IdbLogRepository } from './idbRepository';
import {
  idbProfileRepository,
  type IdbProfileRepository,
} from './idbProfileRepository';
import { memoryLogRepository } from './memoryRepository';
import { memoryProfileRepository } from './memoryProfileRepository';
import type { LogRepository } from './types';
import type { ProfileRepository } from './profileRepository';

let logRepoPromise: Promise<LogRepository> | null = null;
let profileRepoPromise: Promise<ProfileRepository> | null = null;

/**
 * Returns the log repository. In tests, this is overridden via
 * `setRepositories`. In dev/prod, it opens the IndexedDB-backed
 * implementation lazily and caches the result.
 */
export function getLogRepository(): Promise<LogRepository> {
  if (logRepoPromise) return logRepoPromise;
  logRepoPromise = idbLogRepository().then((r: IdbLogRepository) => r as LogRepository);
  return logRepoPromise;
}

export function getProfileRepository(): Promise<ProfileRepository> {
  if (profileRepoPromise) return profileRepoPromise;
  profileRepoPromise = idbProfileRepository().then(
    (r: IdbProfileRepository) => r as ProfileRepository,
  );
  return profileRepoPromise;
}

/**
 * Test-only: override the repositories with in-memory or stub impls.
 * Returns a cleanup function that restores the default lazy-initialized
 * IndexedDB impls.
 */
export function setRepositories(
  log: LogRepository | null,
  profile: ProfileRepository | null,
): () => void {
  const previousLog = logRepoPromise;
  const previousProfile = profileRepoPromise;
  logRepoPromise = log ? Promise.resolve(log) : null;
  profileRepoPromise = profile ? Promise.resolve(profile) : null;
  return () => {
    logRepoPromise = previousLog;
    profileRepoPromise = previousProfile;
  };
}

/** Test-only: build a pair of in-memory repositories. */
export function inMemoryRepositories() {
  return {
    log: memoryLogRepository(),
    profile: memoryProfileRepository(),
  };
}
