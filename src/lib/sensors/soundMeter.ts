/**
 * Pure math for the sound meter. Given a series of RMS values, compute
 * the average dB reading using the same formula as the reference app.
 */
export function rmsToDb(rmsValues: readonly number[]): number {
  if (rmsValues.length === 0) return 0;
  const sum = rmsValues.reduce((a, b) => a + b, 0);
  const avg = sum / rmsValues.length;
  if (avg <= 0) return 0;
  const db = 20 * Math.log10(avg) + 90;
  // Clamp non-negative; in practice a phone mic in a quiet room is around
  // 30 dB, loud traffic is around 80 dB.
  return Math.max(0, Math.round(db));
}

/**
 * Compute RMS from a `Uint8Array` of byte-domain samples (i.e. values
 * around 128 with the signal in the deviation). Matches the reference
 * implementation.
 */
export function rmsFromByteTimeDomain(bytes: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i++) {
    const v = (bytes[i]! - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / bytes.length);
}
