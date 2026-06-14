import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SensorPanel } from '@/components/SensorPanel';

describe('SensorPanel', () => {
  it('renders three buttons with Dutch labels', () => {
    render(<SensorPanel onReadingsChange={() => undefined} />);
    expect(screen.getByRole('button', { name: /meet geluid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /meet trilling/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /neem geluid op/i })).toBeInTheDocument();
  });

  it('initial readings are placeholders (—)', () => {
    render(<SensorPanel onReadingsChange={() => undefined} />);
    const placeholders = screen.getAllByText('—');
    expect(placeholders.length).toBe(3);
  });

  it('clicking the dB button starts measuring, then shows a number', async () => {
    // Mock minimal AudioContext + getUserMedia so the hook can run.
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    // @ts-expect-error test-only
    globalThis.navigator.mediaDevices = { getUserMedia };
    // @ts-expect-error test-only
    globalThis.AudioContext = function () {
      return {
        createMediaStreamSource: () => ({ connect: () => undefined }),
        createAnalyser: () => ({
          fftSize: 2048,
          getByteTimeDomainData: (b: Uint8Array) => b.fill(128),
        }),
        close: async () => undefined,
      };
    } as unknown as typeof AudioContext;

    const user = userEvent.setup();
    const onReadingsChange = vi.fn();
    render(<SensorPanel onReadingsChange={onReadingsChange} />);

    await user.click(screen.getByRole('button', { name: /meet geluid/i }));

    await waitFor(
      () => {
        // The result should be a number, not "—".
        const result = screen.getByTestId('sound-result').textContent;
        expect(result).toMatch(/\d+ dB/);
      },
      { timeout: 4000 },
    );
  });

  it('clears the readings via the reset callback after a save', async () => {
    // Mock getUserMedia to fail so we hit the denied path quickly.
    const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));
    // @ts-expect-error test-only
    globalThis.navigator.mediaDevices = { getUserMedia };
    // @ts-expect-error test-only
    globalThis.AudioContext = function () {
      return {
        createMediaStreamSource: () => ({ connect: () => undefined }),
        createAnalyser: () => ({
          fftSize: 2048,
          getByteTimeDomainData: (b: Uint8Array) => b.fill(128),
        }),
        close: async () => undefined,
      };
    } as unknown as typeof AudioContext;

    const onReadingsChange = vi.fn();
    const onReset = vi.fn();
    render(<SensorPanel onReadingsChange={onReadingsChange} onReset={onReset} />);

    // Click dB → permission denied → "geen toegang".
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /meet geluid/i }));
    await waitFor(() => expect(screen.getByTestId('sound-result').textContent).toMatch(/geen toegang/));
    expect(onReadingsChange).toHaveBeenCalled();
  });
});
