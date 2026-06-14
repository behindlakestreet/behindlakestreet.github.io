/**
 * Pick the first supported MIME type for `MediaRecorder`, falling back to
 * the first entry in the list if none match. Returns `null` if the API
 * itself is unavailable.
 */
export function pickMimeType(
  candidates: readonly string[],
  isSupported: (type: string) => boolean,
): string | null {
  for (const t of candidates) {
    if (isSupported(t)) return t;
  }
  return candidates[0] ?? null;
}

export const AUDIO_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
] as const;

export const AUDIO_RECORD_DURATION_MS = 5000;
