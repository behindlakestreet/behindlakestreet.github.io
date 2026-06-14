import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSoundMeter } from '@/hooks/useSoundMeter';

type Listener = (data: Uint8Array) => void;

interface FakeAnalyser {
  fftSize: number;
  listeners: Listener[];
  getByteTimeDomainData(buf: Uint8Array): void;
  addEventListener(_type: 'tick', fn: Listener): void;
}

interface FakeStream {
  getTracks: () => Array<{ stop: () => void }>;
}

interface FakeAudioContext {
  createMediaStreamSource: (s: FakeStream) => unknown;
  createAnalyser: () => FakeAnalyser;
  close: () => Promise<void>;
}

function makeFakeAudio() {
  const analyser: FakeAnalyser = {
    fftSize: 2048,
    listeners: [],
    getByteTimeDomainData(buf: Uint8Array) {
      // Fill with mid-point (silent) so RMS is ~0.
      buf.fill(128);
    },
    addEventListener(_type, fn) {
      analyser.listeners.push(fn);
    },
  };

  const ctx: FakeAudioContext = {
    createMediaStreamSource: () => ({ connect: () => undefined }),
    createAnalyser: () => analyser,
    close: async () => undefined,
  };

  const trackStop = vi.fn();
  const stream: FakeStream = {
    getTracks: () => [{ stop: trackStop }],
  };

  return { ctx, analyser, stream, trackStop };
}

function installAudioEnv(setup: ReturnType<typeof makeFakeAudio>) {
  const getUserMedia = vi.fn().mockResolvedValue(setup.stream);
  // @ts-expect-error test-only assignment
  globalThis.navigator.mediaDevices = { getUserMedia };
  // @ts-expect-error test-only assignment
  globalThis.AudioContext = function () {
    return setup.ctx;
  } as unknown as typeof AudioContext;
  // @ts-expect-error test-only assignment
  globalThis.window.AudioContext = globalThis.AudioContext;
  // Stash the spy so assertions can verify it was called.
  // @ts-expect-error test-only assignment
  globalThis.__getUserMediaSpy = getUserMedia;
}

describe('useSoundMeter', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('starts in idle state', () => {
    const setup = makeFakeAudio();
    installAudioEnv(setup);
    const { result } = renderHook(() => useSoundMeter());
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('on start, requests mic permission and goes to measuring', async () => {
    const setup = makeFakeAudio();
    installAudioEnv(setup);
    const { result } = renderHook(() => useSoundMeter());

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toBe('measuring'));
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it('after ~2 seconds, sets a numeric result and stops the stream', async () => {
    const setup = makeFakeAudio();
    installAudioEnv(setup);
    const { result } = renderHook(() => useSoundMeter());

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toBe('measuring'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.result).toEqual(expect.any(Number));
    expect(result.current.result).toBeGreaterThanOrEqual(0);
    expect(setup.trackStop).toHaveBeenCalled();
  });

  it('on permission denied, sets status=denied and an error message', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
    // @ts-expect-error test-only assignment
    globalThis.navigator.mediaDevices = { getUserMedia };
    const { result } = renderHook(() => useSoundMeter());

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toBe('denied'));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.result).toBeNull();
  });
});
