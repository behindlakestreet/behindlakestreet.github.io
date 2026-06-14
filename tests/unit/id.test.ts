import { describe, expect, it } from 'vitest';
import { uid } from '@/lib/id';

describe('uid', () => {
  it('returns a non-empty string', () => {
    const id = uid();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('produces different ids across calls (no collisions in 10k)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const id = uid();
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    expect(seen.size).toBe(10_000);
  });
});
