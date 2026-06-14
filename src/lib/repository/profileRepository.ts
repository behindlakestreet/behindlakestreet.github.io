import type { Profile } from '@/types/domain';

export type ProfileSubscriber = () => void;

export interface ProfileRepository {
  /** Returns the saved profile, or `null` if none has been set. */
  get(): Promise<Profile | null>;
  /** Persist (overwrite) the profile. Pass an empty `Profile` to clear. */
  save(profile: Profile): Promise<void>;
  /**
   * Subscribe to changes. Returns an unsubscribe function. The subscriber
   * is called after every successful `save()` so consumers can re-read.
   */
  subscribe(fn: ProfileSubscriber): () => void;
}
