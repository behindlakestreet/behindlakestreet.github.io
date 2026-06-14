import { describe, expect, it } from 'vitest';
import { pickMimeType, AUDIO_MIME_CANDIDATES } from '@/lib/sensors/audioRecorder';

describe('pickMimeType', () => {
  it('returns null for an empty candidate list', () => {
    expect(pickMimeType([], () => true)).toBeNull();
  });

  it('returns the first candidate that is supported', () => {
    const result = pickMimeType(['a', 'b', 'c'], (t) => t === 'b');
    expect(result).toBe('b');
  });

  it('falls back to the first candidate when none are supported', () => {
    const result = pickMimeType(['fallback', 'other'], () => false);
    expect(result).toBe('fallback');
  });

  it('prefers opus when available', () => {
    const result = pickMimeType(AUDIO_MIME_CANDIDATES, () => true);
    expect(result).toBe('audio/webm;codecs=opus');
  });
});
