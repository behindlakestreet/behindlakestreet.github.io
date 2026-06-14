/**
 * Pure math for the vibration meter. Computes the magnitude of an
 * acceleration vector and aggregates a series of samples into
 * max/avg summary stats.
 */
export interface AccelSample {
  x?: number | null;
  y?: number | null;
  z?: number | null;
}

export function magnitude(s: AccelSample): number {
  const x = s.x ?? 0;
  const y = s.y ?? 0;
  const z = s.z ?? 0;
  return Math.sqrt(x * x + y * y + z * z);
}

export interface VibrationSummary {
  max: number;
  avg: number;
  sampleCount: number;
}

export function summarize(samples: readonly number[]): VibrationSummary {
  if (samples.length === 0) {
    return { max: 0, avg: 0, sampleCount: 0 };
  }
  let max = 0;
  let sum = 0;
  for (const v of samples) {
    if (v > max) max = v;
    sum += v;
  }
  return {
    max: +max.toFixed(2),
    avg: +(sum / samples.length).toFixed(2),
    sampleCount: samples.length,
  };
}
