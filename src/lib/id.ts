/**
 * Generate a short, time-prefixed unique id. Not cryptographically random;
 * the random suffix uses `Math.random`. Collisions are vanishingly unlikely
 * at our scale (~tens of thousands of entries).
 */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
