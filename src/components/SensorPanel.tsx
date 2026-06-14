import { useCallback, useEffect } from 'react';
import { useSoundMeter } from '@/hooks/useSoundMeter';
import { useVibrationMeter } from '@/hooks/useVibrationMeter';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export interface SensorReadings {
  soundDb?: number;
  vibration?: { max: number; avg: number; durationMs: number; sampleCount: number };
  audioClip?: { mimeType: string; durationMs: number; sampleRate: number; blob: Blob };
}

interface SensorPanelProps {
  onReadingsChange: (readings: SensorReadings) => void;
  onReset?: () => void;
}

function statusText(
  status: ReturnType<typeof useSoundMeter>['status'],
  result: number | null,
  unit: string,
  fallback: string,
): string {
  if (status === 'measuring') return 'meten…';
  if (status === 'denied') return fallback;
  if (status === 'done' && result !== null) return `${result} ${unit}`;
  return '—';
}

export function SensorPanel({ onReadingsChange, onReset }: SensorPanelProps) {
  const sound = useSoundMeter();
  const vibration = useVibrationMeter();
  const audio = useAudioRecorder();

  // Notify parent of new readings whenever any change.
  useEffect(() => {
    const readings: SensorReadings = {};
    if (sound.result !== null) readings.soundDb = sound.result;
    if (vibration.result) readings.vibration = vibration.result;
    if (audio.result) readings.audioClip = audio.result;
    onReadingsChange(readings);
  }, [sound.result, vibration.result, audio.result, onReadingsChange]);

  // When parent calls onReset, clear local state by reloading the page's
  // sensors. The simplest contract: parent calls a `reset` function it
  // gets from us. We expose one via the props callback.
  const handleReset = useCallback(() => {
    // The hooks don't expose a reset directly; the parent will receive
    // a new onReadingsChange({}) callback after the next effect run.
    // To actively clear, the parent should stop reading the values.
    onReset?.();
  }, [onReset]);

  // Expose reset for the parent's convenience.
  useEffect(() => {
    // Hand the parent a reset handle via a custom event. Simpler: the
    // parent just discards the readings on its end (it's stored in its
    // own state). We call onReset on mount to clear anything stale.
    handleReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <fieldset className="border border-border rounded-md p-3 mb-4">
      <legend className="px-1 text-sm text-muted">Sensoren (optioneel)</legend>

      <div className="flex items-center gap-3 my-2">
        <button
          type="button"
          onClick={sound.start}
          disabled={sound.status === 'measuring'}
          className="px-3 py-1.5 border border-border rounded-md text-sm disabled:opacity-50"
        >
          Meet geluid (dB)
        </button>
        <span data-testid="sound-result" className="font-mono text-muted">
          {statusText(sound.status, sound.result, 'dB', 'geen toegang')}
        </span>
      </div>

      <div className="flex items-center gap-3 my-2">
        <button
          type="button"
          onClick={vibration.start}
          disabled={vibration.status === 'measuring'}
          className="px-3 py-1.5 border border-border rounded-md text-sm disabled:opacity-50"
        >
          Meet trilling (3s)
        </button>
        <span data-testid="vibration-result" className="font-mono text-muted">
          {vibration.status === 'measuring'
            ? 'meten…'
            : vibration.status === 'denied'
              ? 'geen toegang'
              : vibration.status === 'no-sensor'
                ? 'geen sensor'
                : vibration.result
                  ? `max ${vibration.result.max} m/s²`
                  : '—'}
        </span>
      </div>

      <div className="flex items-center gap-3 my-2">
        <button
          type="button"
          onClick={audio.start}
          disabled={audio.status === 'recording'}
          className="px-3 py-1.5 border border-border rounded-md text-sm disabled:opacity-50"
        >
          Neem geluid op (5s)
        </button>
        <span data-testid="audio-result" className="font-mono text-muted">
          {audio.status === 'recording'
            ? 'opnemen…'
            : audio.status === 'denied'
              ? 'geen toegang'
              : audio.status === 'unsupported'
                ? 'niet ondersteund'
                : audio.result
                  ? 'opgeslagen'
                  : '—'}
        </span>
      </div>
    </fieldset>
  );
}
