import { useState, type FormEvent } from 'react';
import { useLogs } from '@/hooks/useLogs';
import type { LogEntry, LogType, NewLogEntry } from '@/types/domain';
import { IntensitySlider } from './IntensitySlider';
import { LocationSelect } from './LocationSelect';

interface LogFormProps {
  /** Optional callback when an entry is saved. Defaults to the global
   *  `useLogs().add` if not provided. The callback receives the persisted
   *  entry (with `id` and `createdAt`). */
  onSaved?: (entry: LogEntry) => void;
  /** Pending sound dB reading, attached to the next submitted entry. */
  pendingSoundDb?: number;
  /** Pending vibration reading, attached to the next submitted entry. */
  pendingVibration?: { max: number; avg: number; durationMs: number; sampleCount: number };
  /** Pending audio clip, attached to the next submitted entry. */
  pendingAudioClip?: {
    mimeType: string;
    durationMs: number;
    sampleRate: number;
    blob: Blob;
  };
  /** Reset callbacks for the pending sensor state. Called after a successful submit. */
  onSensorsReset?: () => void;
}

const FLASH_DURATION_MS = 1200;

export function LogForm(props: LogFormProps) {
  const { add } = useLogs();
  const [type, setType] = useState<LogType>('trilling');
  const [intensity, setIntensity] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [location, setLocation] = useState('Woonkamer');
  const [description, setDescription] = useState('');
  const [flashing, setFlashing] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const entry: NewLogEntry = {
      timestamp: new Date().toISOString(),
      type,
      intensity,
      durationMinutes,
      location,
      description: description.trim(),
    };
    if (props.pendingSoundDb !== undefined) entry.soundDb = props.pendingSoundDb;
    if (props.pendingVibration) entry.vibration = props.pendingVibration;
    if (props.pendingAudioClip) entry.audioClip = props.pendingAudioClip;

    const stored = props.onSaved ? null : await add(entry);
    if (props.onSaved) {
      // Synthesize a partial entry for the callback; the parent may
      // choose to do its own persistence.
      props.onSaved({
        ...entry,
        id: '',
        createdAt: new Date().toISOString(),
      });
    } else {
      void stored;
    }

    setDescription('');
    props.onSensorsReset?.();
    setFlashing(true);
    setTimeout(() => setFlashing(false), FLASH_DURATION_MS);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="log-form">
      <fieldset className="mb-4">
        <legend className="text-sm text-muted mb-1">Type overlast</legend>
        <div className="flex gap-4">
          {(['trilling', 'geluid', 'beide'] as const).map((t) => (
            <label key={t} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
              />
              <span>
                {t === 'trilling' ? 'Trilling' : t === 'geluid' ? 'Geluid' : 'Beide'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <IntensitySlider value={intensity} onChange={setIntensity} />

      <div className="mb-4">
        <label htmlFor="duration" className="block text-sm text-muted mb-1">
          Duur (minuten)
        </label>
        <input
          id="duration"
          type="number"
          min={1}
          step={1}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value) || 1))}
          className="w-full p-2 border border-border rounded-md text-base"
        />
      </div>

      <LocationSelect value={location} onChange={setLocation} />

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm text-muted mb-1">
          Omschrijving
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Wat hoor/voel je?"
          className="w-full p-2 border border-border rounded-md text-base"
        />
      </div>

      <button
        type="submit"
        disabled={flashing}
        className="primary bg-primary text-white border border-primary rounded-md px-4 py-2 disabled:opacity-70"
      >
        {flashing ? 'Opgeslagen ✓' : 'Opslaan'}
      </button>
    </form>
  );
}
