import { useCallback, useRef, useState } from 'react';
import { rmsFromByteTimeDomain, rmsToDb } from '@/lib/sensors/soundMeter';

export type SoundMeterStatus = 'idle' | 'measuring' | 'done' | 'denied';

export interface UseSoundMeterResult {
  start: () => void;
  status: SoundMeterStatus;
  result: number | null;
  error: Error | null;
}

const MEASUREMENT_MS = 2000;

interface MinimalAnalyser {
  fftSize: number;
  getByteTimeDomainData: (buf: Uint8Array) => void;
}

interface MinimalAudioContext {
  createMediaStreamSource: (s: MediaStream) => { connect: (dst: MinimalAnalyser) => void };
  createAnalyser: () => MinimalAnalyser;
  close: () => Promise<void>;
}

declare global {
  interface Window {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  }
}

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

export function useSoundMeter(): UseSoundMeterResult {
  const [status, setStatus] = useState<SoundMeterStatus>('idle');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  const start = useCallback(() => {
    cancelledRef.current = false;
    setError(null);
    setResult(null);
    setStatus('measuring');

    const AudioCtxCtor = getAudioContextClass();
    if (!AudioCtxCtor) {
      const e = new Error('AudioContext niet beschikbaar');
      setError(e);
      setStatus('denied');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const e = new Error('mediaDevices niet beschikbaar');
      setError(e);
      setStatus('denied');
      return;
    }

    void (async () => {
      let stream: MediaStream | null = null;
      let ctx: MinimalAudioContext | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelledRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AudioCtxCtor() as unknown as MinimalAudioContext;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);
        const samples: number[] = [];
        const data = new Uint8Array(analyser.fftSize);

        const intervalId = window.setInterval(() => {
          if (cancelledRef.current) return;
          analyser.getByteTimeDomainData(data);
          samples.push(rmsFromByteTimeDomain(data));
        }, 16);

        window.setTimeout(() => {
          window.clearInterval(intervalId);
          stream?.getTracks().forEach((t) => t.stop());
          void ctx?.close();
          if (cancelledRef.current) return;
          setResult(rmsToDb(samples));
          setStatus('done');
        }, MEASUREMENT_MS);
      } catch (e) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        if (ctx) void ctx.close();
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus('denied');
      }
    })();
  }, []);

  return { start, status, result, error };
}
