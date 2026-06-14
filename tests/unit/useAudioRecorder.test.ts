import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface FakeBlobOptions {
  size: number;
  type: string;
}

class FakeBlob {
  size: number;
  type: string;
  constructor(parts: BlobPart[], options: FakeBlobOptions) {
    this.size = options.size;
    this.type = options.type;
    void parts;
  }
}

function makeFakeRecorder(stream: MediaStream, opts: {
  mimeType: string | null;
  dataChunks?: Blob[];
}) {
  const handlers: Record<string, Array<(e: Event) => void>> = {
    dataavailable: [],
    stop: [],
    start: [],
    error: [],
  };
  const rec = {
    mimeType: opts.mimeType ?? 'audio/webm',
    state: 'inactive' as 'inactive' | 'recording' | 'paused' | 'stopped',
    ondataavailable: null as ((e: BlobEvent) => void) | null,
    onstop: null as ((e: Event) => void) | null,
    start(timeslice?: number) {
      this.state = 'recording';
      void timeslice;
      // Fire dataavailable shortly after start.
      setTimeout(() => {
        const data = opts.dataChunks ?? [new Blob(['x'], { type: this.mimeType })];
        const event = { data } as unknown as Event;
        const fn = rec.ondataavailable;
        if (fn) fn(event as unknown as BlobEvent);
        handlers.dataavailable.forEach((h) => h(event));
      }, 5);
    },
    stop() {
      this.state = 'stopped';
      const event = new Event('stop');
      handlers.stop.forEach((h) => h(event));
      const fn = rec.onstop;
      if (fn) fn(event);
    },
    addEventListener(type: string, fn: (e: Event) => void) {
      handlers[type]?.push(fn);
    },
  };
  return rec;
}

function installMediaRecorder(opts: {
  mimeType: string | null;
  dataChunks?: Blob[];
  mediaRecorderCtor?: typeof MediaRecorder;
}) {
  const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream);
  // @ts-expect-error test-only
  globalThis.navigator.mediaDevices = { getUserMedia };

  const fake = makeFakeRecorder({} as MediaStream, opts);
  const ctor = opts.mediaRecorderCtor ?? (function (stream: MediaStream) {
    return makeFakeRecorder(stream, opts);
  } as unknown as typeof MediaRecorder);
  (ctor as unknown as { isTypeSupported: (t: string) => boolean }).isTypeSupported = (t: string) =>
    t.startsWith('audio/');
  // @ts-expect-error test-only
  globalThis.MediaRecorder = ctor;
  // @ts-expect-error test-only
  globalThis.window.MediaRecorder = ctor;
  return { getUserMedia, rec: fake };
}

describe('useAudioRecorder', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('starts in idle state', () => {
    installMediaRecorder({ mimeType: 'audio/webm' });
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('after recording, produces a Blob with the right MIME type', async () => {
    const chunks = [new FakeBlob(['x'], { size: 1, type: 'audio/webm' }) as unknown as Blob];
    installMediaRecorder({ mimeType: 'audio/webm', dataChunks: chunks });
    // Need real Blob in this test for size/type checks.
    globalThis.Blob = FakeBlob as unknown as typeof Blob;

    const { result } = renderHook(() => useAudioRecorder());

    act(() => {
      result.current.start();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5500);
    });

    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.mimeType).toBe('audio/webm;codecs=opus');
    expect(result.current.result?.blob).toBeInstanceOf(Blob);
  });

  it('on permission denied, sets status=denied', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));
    // @ts-expect-error test-only
    globalThis.navigator.mediaDevices = { getUserMedia };
    // Need a working MediaRecorder for the permission path to be reached.
    // @ts-expect-error test-only
    globalThis.MediaRecorder = function () {} as unknown as typeof MediaRecorder;
    // @ts-expect-error test-only
    globalThis.MediaRecorder.isTypeSupported = () => true;
    // @ts-expect-error test-only
    globalThis.window.MediaRecorder = globalThis.MediaRecorder;

    const { result } = renderHook(() => useAudioRecorder());

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toBe('denied'));
  });

  it('on unsupported environment (no MediaRecorder), sets status=unsupported', async () => {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream);
    // @ts-expect-error test-only
    globalThis.navigator.mediaDevices = { getUserMedia };
    // @ts-expect-error test-only
    delete globalThis.MediaRecorder;
    // @ts-expect-error test-only
    delete globalThis.window.MediaRecorder;

    const { result } = renderHook(() => useAudioRecorder());

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toBe('unsupported'));
  });
});
