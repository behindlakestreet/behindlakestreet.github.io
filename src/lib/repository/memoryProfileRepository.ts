import { EMPTY_PROFILE, type Profile } from '@/types/domain';
import type { ProfileRepository, ProfileSubscriber } from './profileRepository';

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => deepClone(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = deepClone(v);
  }
  return out as T;
}

export function memoryProfileRepository(): ProfileRepository {
  let stored: Profile | null = null;
  const subscribers = new Set<ProfileSubscriber>();
  function notify() {
    for (const fn of subscribers) fn();
  }
  return {
    async get() {
      return stored ? deepClone(stored) : null;
    },
    async save(profile: Profile) {
      stored = deepClone(profile);
      notify();
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}

/** Helper: is the given profile empty? Used by the UI to show a "fill me in" hint. */
export function isProfileEmpty(profile: Profile | null): boolean {
  if (!profile) return true;
  const { verzoeker, gemeente } = profile;
  const allFields = [
    verzoeker.naam,
    verzoeker.adres,
    verzoeker.postcode,
    verzoeker.plaats,
    verzoeker.telefoon,
    verzoeker.email,
    gemeente.naam,
    gemeente.postbus,
    gemeente.postcode,
    gemeente.plaats,
  ];
  return allFields.every((s) => s.trim() === '');
}

/** Convenience: ensure no field is `undefined` — replace with `''`. */
export function normalizeProfile(profile: Profile): Profile {
  return {
    verzoeker: { ...EMPTY_PROFILE.verzoeker, ...profile.verzoeker },
    gemeente: { ...EMPTY_PROFILE.gemeente, ...profile.gemeente },
  };
}
