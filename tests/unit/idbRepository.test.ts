import { beforeEach, describe, expect, it } from 'vitest';
import { idbLogRepository } from '@/lib/repository/idbRepository';
import type { NewLogEntry } from '@/types/domain';

function fixture(overrides: Partial<NewLogEntry> = {}): NewLogEntry {
  return {
    timestamp: '2026-06-01T10:00:00.000Z',
    type: 'trilling',
    intensity: 5,
    durationMinutes: 10,
    location: 'Woonkamer',
    description: '',
    ...overrides,
  };
}

async function freshRepo() {
  // Each test gets a unique database name so state doesn't leak between tests.
  const dbName = `overlast-test-${Math.random().toString(36).slice(2, 10)}`;
  return idbLogRepository({ dbName });
}

describe('idbLogRepository', () => {
  let repo: Awaited<ReturnType<typeof freshRepo>>;

  beforeEach(async () => {
    repo = await freshRepo();
  });

  it('starts empty', async () => {
    expect(await repo.list()).toEqual([]);
  });

  it('add() assigns id and createdAt and persists across reopens', async () => {
    const stored = await repo.add(fixture());
    expect(stored.id).toBeTypeOf('string');
    expect(stored.id.length).toBeGreaterThan(0);
    expect(stored.createdAt).toBeTypeOf('string');

    // Reopen the same DB and confirm the entry is still there.
    const reopened = await idbLogRepository({ dbName: (repo as unknown as { dbName: string }).dbName });
    const list = await reopened.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(stored.id);
  });

  it('preserves insertion order across list()', async () => {
    // Use a deterministic idFactory so the test doesn't depend on
    // `Date.now()` resolution. The idb impl sorts by `createdAt` with
    // a tie-breaker on `id`; with rapid adds the timestamps can collide
    // and the test needs predictable ids.
    let n = 0;
    const repo = await idbLogRepository({
      dbName: `order-test-${Math.random()}`,
      idFactory: () => `id-${++n}`,
    });
    const a = await repo.add(fixture({ timestamp: '2026-06-01T08:00:00.000Z' }));
    const b = await repo.add(fixture({ timestamp: '2026-06-01T09:00:00.000Z' }));
    const c = await repo.add(fixture({ timestamp: '2026-06-01T10:00:00.000Z' }));
    const ids = (await repo.list()).map((e) => e.id);
    expect(ids).toEqual([a.id, b.id, c.id]);
  });

  it('remove() deletes by id and is a no-op for missing ids', async () => {
    const a = await repo.add(fixture());
    await repo.add(fixture());
    await repo.remove(a.id);
    expect((await repo.list()).map((e) => e.id)).not.toContain(a.id);
    await expect(repo.remove('does-not-exist')).resolves.toBeUndefined();
  });

  it('clear() empties the store', async () => {
    await repo.add(fixture());
    await repo.add(fixture());
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });

  it('round-trips an entry with an audio clip blob', async () => {
    const blob = new Blob(['audio-bytes'], { type: 'audio/webm' });
    await repo.add(
      fixture({
        audioClip: {
          mimeType: 'audio/webm',
          durationMs: 5000,
          sampleRate: 48_000,
          blob,
        },
      }),
    );
    const [read] = await repo.list();
    // Note: real browsers serialize Blobs through IDB's structured clone
    // algorithm. `fake-indexeddb` uses a shallow serializer in jsdom, so
    // we can't assert `instanceof Blob` or `size` here — only that the
    // field is present and the surrounding `AudioClip` metadata
    // round-trips. The Blob type assertion is covered by the
    // `memoryRepository` test.
    expect(read?.audioClip).toBeDefined();
    expect(read?.audioClip?.blob).toBeDefined();
    expect(read?.audioClip?.mimeType).toBe('audio/webm');
    expect(read?.audioClip?.durationMs).toBe(5000);
    expect(read?.audioClip?.sampleRate).toBe(48_000);
  });
});
