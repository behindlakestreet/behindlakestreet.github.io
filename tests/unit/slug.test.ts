import { describe, expect, it } from 'vitest';
import { slug } from '@/lib/letter/slug';

describe('slug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slug('Achterstraat 12')).toBe('achterstraat-12');
  });
  it('strips characters that are unsafe in filenames', () => {
    expect(slug('Straat / 1, A-b')).toBe('straat-1-a-b');
  });
  it('collapses repeated separators', () => {
    expect(slug('  hello   world  ')).toBe('hello-world');
  });
  it('returns "" for an empty string', () => {
    expect(slug('')).toBe('');
  });
  it('keeps letters, digits, and hyphens', () => {
    expect(slug('Damrak 12-III')).toBe('damrak-12-iii');
  });
});
