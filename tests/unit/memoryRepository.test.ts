import { describe, expect, it, beforeEach } from 'vitest';
import { memoryLogRepository } from '@/lib/repository/memoryRepository';
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

describe('memoryLogRepository', () => {
  let repo: ReturnType<typeof memoryLogRepository>;

  beforeEach(() => {
    repo = memoryLogRepository();
  });

  it('starts empty', async () => {
    expect(await repo.list()).toEqual([]);
  });

  it('add() assigns id and createdAt and returns the persisted entry', async () => {
    const stored = await repo.add(fixture());
    expect(stored.id).toBeTypeOf('string');
    expect(stored.id.length).toBeGreaterThan(0);
    expect(stored.createdAt).toBeTypeOf('string');
    expect(() => new Date(stored.createdAt).toISOString()).not.toThrow();
  });

  it('preserves insertion order across list()', async () => {
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

  it('list() returns a defensive copy; mutating it does not affect the store', async () => {
    await repo.add(fixture());
    const snapshot = await repo.list();
    snapshot.pop();
    expect(await repo.list()).toHaveLength(1);
  });

  it('list() returns deep-cloned entries; mutating a returned entry does not affect the store', async () => {
    await repo.add(fixture({ description: 'original' }));
    const [returned] = await repo.list();
    if (!returned) throw new Error('expected an entry');
    returned.description = 'mutated';
    const [fresh] = await repo.list();
    expect(fresh?.description).toBe('original');
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
    expect(read?.audioClip?.blob).toBeInstanceOf(Blob);
    expect(read?.audioClip?.mimeType).toBe('audio/webm');
  });

  it('uses a deterministic id source when one is provided', async () => {
    let counter = 0;
    const idFactory = () => `id-${++counter}`;
    const seeded = memoryLogRepository({ idFactory });
    const a = await seeded.add(fixture());
    const b = await seeded.add(fixture());
    expect(a.id).toBe('id-1');
    expect(b.id).toBe('id-2');
  });

  it('uses an injected clock for createdAt', async () => {
    const fixed = new Date('2026-06-05T12:00:00.000Z');
    const seeded = memoryLogRepository({ now: () => fixed });
    const stored = await seeded.add(fixture());
    expect(stored.createdAt).toBe(fixed.toISOString());
  });
});
