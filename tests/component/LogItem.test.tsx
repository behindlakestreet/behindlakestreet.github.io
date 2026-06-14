import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LogItem } from '@/components/LogItem';
import type { LogEntry } from '@/types/domain';

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'x',
    timestamp: '2026-06-01T10:00:00.000Z',
    type: 'geluid',
    intensity: 5,
    durationMinutes: 10,
    location: 'Woonkamer',
    description: '',
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('LogItem audio playback', () => {
  it('renders no audio control when no audioClip is present', () => {
    render(<LogItem entry={entry()} onDelete={() => undefined} />);
    expect(screen.queryByTestId('audio-control')).toBeNull();
  });

  it('renders an audio control when audioClip is present', () => {
    const blob = new Blob(['x'], { type: 'audio/webm' });
    render(
      <LogItem
        entry={entry({ audioClip: { mimeType: 'audio/webm', durationMs: 5000, sampleRate: 48000, blob } })}
        onDelete={() => undefined}
      />,
    );
    const audio = screen.getByTestId('audio-control') as HTMLAudioElement;
    expect(audio).toBeInTheDocument();
    expect(audio.tagName.toLowerCase()).toBe('audio');
    expect(audio.src).toMatch(/^blob:/);
  });

  it('revokes the object URL when the item unmounts', async () => {
    const blob = new Blob(['x'], { type: 'audio/webm' });
    const create = vi.fn();
    const revoke = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = (() => {
      let n = 0;
      return () => {
        n += 1;
        const url = `blob:fake-${n}`;
        create(url);
        return url;
      };
    })() as typeof URL.createObjectURL;
    URL.revokeObjectURL = (url) => {
      revoke(url);
    };

    const { unmount } = render(
      <LogItem
        entry={entry({ audioClip: { mimeType: 'audio/webm', durationMs: 5000, sampleRate: 48000, blob } })}
        onDelete={() => undefined}
      />,
    );

    await waitFor(() => expect(create).toHaveBeenCalled());
    const createdUrl = create.mock.calls[0]?.[0] as string;

    unmount();

    await waitFor(() => expect(revoke).toHaveBeenCalledWith(createdUrl));

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });
});
