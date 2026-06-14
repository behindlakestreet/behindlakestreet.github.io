import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useVibrationMeter } from '@/hooks/useVibrationMeter';

declare global {
  interface DeviceMotionEvent {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
}

function installDeviceMotion(permissionResult: 'granted' | 'denied' | 'unsupported' = 'granted') {
  const listeners: Array<(e: DeviceMotionEvent) => void> = [];
  // @ts-expect-error test-only
  globalThis.window.addEventListener = vi.fn((type: string, fn: (e: DeviceMotionEvent) => void) => {
    if (type === 'devicemotion') listeners.push(fn);
  });
  // @ts-expect-error test-only
  globalThis.window.removeEventListener = vi.fn((type: string, fn: (e: DeviceMotionEvent) => void) => {
    if (type === 'devicemotion') {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    }
  });
  if (permissionResult !== 'unsupported') {
    // @ts-expect-error test-only
    globalThis.DeviceMotionEvent = {
      requestPermission: vi.fn().mockResolvedValue(permissionResult),
    };
  } else {
    // @ts-expect-error test-only
    delete globalThis.DeviceMotionEvent;
  }
  return { listeners };
}

describe('useVibrationMeter', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('starts in idle state', () => {
    installDeviceMotion();
    const { result } = renderHook(() => useVibrationMeter());
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('on start with granted permission, listens for devicemotion events', async () => {
    const { listeners } = installDeviceMotion('granted');
    const { result } = renderHook(() => useVibrationMeter());

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toBe('measuring'));

    // Fire some events.
    act(() => {
      for (const fn of listeners) {
        fn({
          accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 },
        } as unknown as DeviceMotionEvent);
        fn({
          accelerationIncludingGravity: { x: 0, y: 0, z: 12 },
        } as unknown as DeviceMotionEvent);
      }
    });

    // After 3s the measurement finishes.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.result).toMatchObject({
      max: 12,
      avg: expect.any(Number),
      sampleCount: 2,
    });
  });

  it('on permission denied, sets status=denied', async () => {
    installDeviceMotion('denied');
    const { result } = renderHook(() => useVibrationMeter());

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toBe('denied'));
    expect(result.current.result).toBeNull();
  });

  it('on unsupported environment (no requestPermission), tries the legacy path', async () => {
    const { listeners } = installDeviceMotion('unsupported');
    const { result } = renderHook(() => useVibrationMeter());

    act(() => {
      result.current.start();
    });

    // In the unsupported case we don't await a permission prompt, we go
    // straight to measuring.
    await waitFor(() => expect(result.current.status).toBe('measuring'));
    act(() => {
      for (const fn of listeners) {
        fn({
          accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 },
        } as unknown as DeviceMotionEvent);
      }
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.result?.sampleCount).toBe(1);
  });

  it('falls back to "no sensor" if no events arrive within the window', async () => {
    const { listeners } = installDeviceMotion('granted');
    const { result } = renderHook(() => useVibrationMeter());

    act(() => {
      result.current.start();
    });
    await waitFor(() => expect(result.current.status).toBe('measuring'));

    // No events fired. After 3s, no sensor.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    await waitFor(() => expect(result.current.status).toBe('no-sensor'));
    expect(result.current.result).toBeNull();
    void listeners;
  });
});
