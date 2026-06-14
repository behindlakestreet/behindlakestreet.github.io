import { useCallback, useRef, useState } from 'react';
import {
  AUDIO_MIME_CANDIDATES,
  AUDIO_RECORD_DURATION_MS,
  pickMimeType,
} from '@/lib/sensors/audioRecorder';

export type AudioRecorderStatus =
  | 'idle'
  | 'recording'
  | 'done'
  | 'denied'
  | 'unsupported';

export interface AudioClipResult {
  mimeType: string;
  durationMs: number;
  sampleRate: number;
  blob: Blob;
}

export interface UseAudioRecorderResult {
  start: () => void;
  status: AudioRecorderStatus;
  result: AudioClipResult | null;
  error: Error | null;
}

declare global {
  interface Window {
    MediaRecorder?: typeof MediaRecorder;
  }
}

function getMediaRecorderCtor(): typeof MediaRecorder | null {
  if (typeof window === 'undefined') return null;
  return window.MediaRecorder ?? null;
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [status, setStatus] = useState<AudioRecorderStatus>('idle');
  const [result, setResult] = useState<AudioClipResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  const start = useCallback(() => {
    cancelledRef.current = false;
    setError(null);
    setResult(null);

    const Ctor = getMediaRecorderCtor();
    if (!Ctor) {
      setError(new Error('MediaRecorder niet beschikbaar'));
      setStatus('unsupported');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(new Error('mediaDevices niet beschikbaar'));
      setStatus('unsupported');
      return;
    }

    const mimeType = pickMimeType(
      AUDIO_MIME_CANDIDATES as unknown as string[],
      (t) => Ctor.isTypeSupported(t),
    );
    if (!mimeType) {
      setError(new Error('Geen geschikt audio MIME-type gevonden'));
      setStatus('unsupported');
      return;
    }

    void (async () => {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelledRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStatus('recording');
        const recorder = new Ctor(stream, { mimeType });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        const recordingDone = new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
        });
        recorder.start();
        window.setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, AUDIO_RECORD_DURATION_MS);
        await recordingDone;
        stream.getTracks().forEach((t) => t.stop());
        if (cancelledRef.current) return;
        const blob = new Blob(chunks, { type: mimeType });
        // We don't know the actual sample rate without parsing; report
        // 48 kHz as a reasonable default for mobile mics.
        setResult({
          mimeType,
          durationMs: AUDIO_RECORD_DURATION_MS,
          sampleRate: 48000,
          blob,
        });
        setStatus('done');
      } catch (e) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        setStatus(err.name === 'NotAllowedError' ? 'denied' : 'denied');
      }
    })();
  }, []);

  return { start, status, result, error };
}
