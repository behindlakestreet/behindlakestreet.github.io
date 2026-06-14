import { beforeEach, describe, expect, it } from 'vitest';
import { memoryProfileRepository, isProfileEmpty, normalizeProfile } from '@/lib/repository/memoryProfileRepository';
import { idbProfileRepository } from '@/lib/repository/idbProfileRepository';
import { EMPTY_PROFILE, type Profile } from '@/types/domain';

const FULL: Profile = {
  verzoeker: {
    naam: 'Jan de Vries',
    adres: 'Achterstraat 12',
    postcode: '1234 AB',
    plaats: 'Amsterdam',
    telefoon: '06-12345678',
    email: 'jan@example.nl',
  },
  gemeente: {
    naam: 'Amsterdam',
    postbus: '1234',
    postcode: '1000 AA',
    plaats: 'Amsterdam',
  },
};

describe('memoryProfileRepository', () => {
  let repo: ReturnType<typeof memoryProfileRepository>;

  beforeEach(() => {
    repo = memoryProfileRepository();
  });

  it('returns null when no profile has been saved', async () => {
    expect(await repo.get()).toBeNull();
  });

  it('round-trips a profile', async () => {
    await repo.save(FULL);
    expect(await repo.get()).toEqual(FULL);
  });

  it('overwrites on subsequent saves', async () => {
    await repo.save(FULL);
    await repo.save(EMPTY_PROFILE);
    expect(await repo.get()).toEqual(EMPTY_PROFILE);
  });

  it('get() returns a defensive copy', async () => {
    await repo.save(FULL);
    const first = await repo.get();
    if (!first) throw new Error('expected a profile');
    first.verzoeker.naam = 'mutated';
    const second = await repo.get();
    expect(second?.verzoeker.naam).toBe('Jan de Vries');
  });
});

describe('idbProfileRepository', () => {
  it('returns null when no profile has been saved', async () => {
    const repo = await idbProfileRepository({ dbName: `p-${Math.random()}` });
    expect(await repo.get()).toBeNull();
  });

  it('round-trips a profile and persists across reopens', async () => {
    const dbName = `p-${Math.random()}`;
    const repo = await idbProfileRepository({ dbName });
    await repo.save(FULL);
    const reopened = await idbProfileRepository({ dbName });
    expect(await reopened.get()).toEqual(FULL);
  });

  it('overwrites on subsequent saves', async () => {
    const repo = await idbProfileRepository({ dbName: `p-${Math.random()}` });
    await repo.save(FULL);
    await repo.save(EMPTY_PROFILE);
    expect(await repo.get()).toEqual(EMPTY_PROFILE);
  });
});

describe('profile helpers', () => {
  it('isProfileEmpty is true for null and for EMPTY_PROFILE', () => {
    expect(isProfileEmpty(null)).toBe(true);
    expect(isProfileEmpty(EMPTY_PROFILE)).toBe(true);
  });

  it('isProfileEmpty is false when any field is non-empty', () => {
    expect(
      isProfileEmpty({
        verzoeker: { ...EMPTY_PROFILE.verzoeker, naam: 'Jan' },
        gemeente: EMPTY_PROFILE.gemeente,
      }),
    ).toBe(false);
  });

  it('normalizeProfile fills missing fields with empty strings', () => {
    const out = normalizeProfile({
      verzoeker: { ...EMPTY_PROFILE.verzoeker, naam: 'Jan' } as Profile['verzoeker'],
      gemeente: {} as Profile['gemeente'],
    });
    expect(out.verzoeker.naam).toBe('Jan');
    expect(out.gemeente.naam).toBe('');
  });
});
