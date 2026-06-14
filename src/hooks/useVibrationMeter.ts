import { useCallback, useRef, useState } from 'react';
import { magnitude, summarize, type VibrationSummary } from '@/lib/sensors/vibrationMeter';

export type VibrationStatus = 'idle' | 'measuring' | 'done' | 'denied' | 'no-sensor';

export interface UseVibrationMeterResult {
  start: () => void;
  status: VibrationStatus;
  result: (VibrationSummary & { durationMs: number }) | null;
  error: Error | null;
}

const MEASUREMENT_MS = 3000;

interface AccelWithGravity {
  x?: number | null;
  y?: number | null;
  z?: number | null;
}

declare global {
  interface Window {
    DeviceMotionEvent?: {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
  }
}

async function requestPermissionIfNeeded(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined') return 'unsupported';
  const dme = window.DeviceMotionEvent as { requestPermission?: () => Promise<'granted' | 'denied'> } | undefined;
  if (!dme || typeof dme.requestPermission !== 'function') {
    return 'unsupported';
  }
  try {
    return await dme.requestPermission();
  } catch {
    return 'denied';
  }
}

export function useVibrationMeter(): UseVibrationMeterResult {
  const [status, setStatus] = useState<VibrationStatus>('idle');
  const [result, setResult] = useState<(VibrationSummary & { durationMs: number }) | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  const start = useCallback(() => {
    cancelledRef.current = false;
    setError(null);
    setResult(null);

    void (async () => {
      const permission = await requestPermissionIfNeeded();
      if (permission === 'denied') {
        setError(new Error('DeviceMotion permission denied'));
        setStatus('denied');
        return;
      }
      if (cancelledRef.current) return;
      setStatus('measuring');

      const samples: number[] = [];
      const handler = (e: Event) => {
        const a = (e as DeviceMotionEvent).accelerationIncludingGravity as AccelWithGravity | null;
        if (!a) return;
        samples.push(magnitude(a));
      };
      window.addEventListener('devicemotion', handler);

      window.setTimeout(() => {
        window.removeEventListener('devicemotion', handler);
        if (cancelledRef.current) return;
        if (samples.length === 0) {
          setStatus('no-sensor');
          setResult(null);
          return;
        }
        const summary = summarize(samples);
        setResult({ ...summary, durationMs: MEASUREMENT_MS });
        setStatus('done');
      }, MEASUREMENT_MS);
    })();
  }, []);

  return { start, status, result, error };
}
