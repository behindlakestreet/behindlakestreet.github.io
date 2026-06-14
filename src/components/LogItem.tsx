import { useEffect, useState } from 'react';
import { fmtDate } from '@/lib/time/format';
import type { LogEntry, LogType } from '@/types/domain';

function typeLabel(t: LogType): string {
  return { trilling: 'Trilling', geluid: 'Geluid', beide: 'Trilling + Geluid' }[t];
}

interface LogItemProps {
  entry: LogEntry;
  onDelete: (id: string) => void;
}

export function LogItem({ entry, onDelete }: LogItemProps) {
  // Object URL for the audio clip. Created on mount, revoked on unmount.
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!entry.audioClip) return;
    const url = URL.createObjectURL(entry.audioClip.blob);
    setAudioUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [entry.audioClip]);

  const metaBits = [
    `Intensiteit ${entry.intensity}/10`,
    `${entry.durationMinutes} min`,
    entry.location,
    entry.soundDb ? `${entry.soundDb} dB` : null,
    entry.vibration ? `trilling max ${entry.vibration.max} m/s²` : null,
  ].filter(Boolean);

  return (
    <div
      data-testid="log-item"
      data-type={entry.type}
      className={`log-item type-${entry.type} bg-card border border-border border-l-4 rounded-md p-3`}
    >
      <button
        type="button"
        className="delete danger float-right bg-danger text-white border border-danger rounded-md text-xs px-2 py-0.5"
        onClick={() => onDelete(entry.id)}
      >
        verwijder
      </button>
      <div className="flex justify-between items-baseline mb-1">
        <span className="type font-semibold">{typeLabel(entry.type)}</span>
        <span className="time text-muted text-sm">{fmtDate(entry.timestamp)}</span>
      </div>
      <div className="meta text-muted text-sm">{metaBits.join(' · ')}</div>
      {audioUrl ? (
        <audio
          data-testid="audio-control"
          controls
          src={audioUrl}
          className="mt-2 w-full"
          preload="metadata"
        >
          Audio wordt niet ondersteund in deze browser.
        </audio>
      ) : null}
      {entry.description ? <div className="desc mt-1">{entry.description}</div> : null}
    </div>
  );
}
