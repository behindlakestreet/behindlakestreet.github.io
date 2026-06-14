import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { LogList } from '@/components/LogList';
import {
  inMemoryRepositories,
  setRepositories,
  type LogRepository,
  type ProfileRepository,
} from '@/lib/repository';
import type { LogEntry, NewLogEntry } from '@/types/domain';

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'x',
    timestamp: '2026-06-01T10:00:00.000Z',
    type: 'trilling',
    intensity: 5,
    durationMinutes: 10,
    location: 'Woonkamer',
    description: '',
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

interface SeedHandle {
  log: LogRepository;
  profile: ProfileRepository;
}

async function seed(entries: NewLogEntry[]): Promise<SeedHandle> {
  const { log, profile } = inMemoryRepositories();
  setRepositories(log, profile);
  for (const e of entries) {
    await log.add(e);
  }
  return { log, profile };
}

describe('LogList', () => {
  it('shows empty state when no entries exist', async () => {
    await seed([]);
    render(<LogList />);
    await waitFor(() =>
      expect(screen.getByText(/nog geen meldingen/i)).toBeInTheDocument(),
    );
  });

  it('renders entries in reverse-chronological order', async () => {
    await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
      { timestamp: '2026-06-02T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
      { timestamp: '2026-06-03T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    render(<LogList />);

    await waitFor(() => expect(screen.queryAllByTestId('log-item').length).toBe(3));
    const items = screen.getAllByTestId('log-item');
    expect(items[0]?.textContent).toContain('03-06-2026');
    expect(items[1]?.textContent).toContain('02-06-2026');
    expect(items[2]?.textContent).toContain('01-06-2026');
  });

  it('shows type-specific left-border color (trilling = amber, geluid = blue, beide = violet)', async () => {
    await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
      { timestamp: '2026-06-02T10:00:00.000Z', type: 'geluid', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
      { timestamp: '2026-06-03T10:00:00.000Z', type: 'beide', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    render(<LogList />);

    await waitFor(() => expect(screen.queryAllByTestId('log-item').length).toBe(3));
    const items = screen.getAllByTestId('log-item');
    const trilling = items.find((el) => el.getAttribute('data-type') === 'trilling');
    const geluid = items.find((el) => el.getAttribute('data-type') === 'geluid');
    const beide = items.find((el) => el.getAttribute('data-type') === 'beide');
    expect(trilling).toHaveClass('type-trilling');
    expect(geluid).toHaveClass('type-geluid');
    expect(beide).toHaveClass('type-beide');
  });

  it('date filter narrows the list to entries within the range', async () => {
    await seed([
      { timestamp: '2026-05-30T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
      { timestamp: '2026-06-02T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
      { timestamp: '2026-06-05T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    render(<LogList />);

    await waitFor(() => expect(screen.queryAllByTestId('log-item').length).toBe(4));

    const fromInput = screen.getByLabelText(/van/i) as HTMLInputElement;
    const toInput = screen.getByLabelText(/tot/i) as HTMLInputElement;
    fireEvent.change(fromInput, { target: { value: '2026-06-01' } });
    fireEvent.change(toInput, { target: { value: '2026-06-02' } });
    fireEvent.click(screen.getByRole('button', { name: /toepassen/i }));

    await waitFor(() => expect(screen.queryAllByTestId('log-item').length).toBe(2));
  });

  it('delete button removes the entry from the list and the store', async () => {
    const handle = await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    const before = await handle.log.list();
    const id = before[0]?.id ?? '';
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<LogList />);
    await waitFor(() => expect(screen.queryAllByTestId('log-item').length).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: /verwijder/i }));
    await waitFor(() => expect(screen.queryAllByTestId('log-item').length).toBe(0));
    const remaining = await handle.log.list();
    expect(remaining.find((e) => e.id === id)).toBeUndefined();
  });

  it('delete cancels if user declines the confirm', async () => {
    await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<LogList />);
    await waitFor(() => expect(screen.queryAllByTestId('log-item').length).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: /verwijder/i }));
    expect(screen.queryAllByTestId('log-item').length).toBe(1);
  });

  it('renders dB and vibration metadata when present', async () => {
    await seed([
      {
        timestamp: '2026-06-01T10:00:00.000Z',
        type: 'geluid',
        intensity: 5,
        durationMinutes: 10,
        location: 'Woonkamer',
        description: '',
        soundDb: 72,
        vibration: { max: 4.2, avg: 1.5, durationMs: 3000, sampleCount: 90 },
      },
    ]);
    render(<LogList />);
    await waitFor(() => expect(screen.queryAllByTestId('log-item').length).toBe(1));
    expect(screen.getByText(/72 dB/)).toBeInTheDocument();
    expect(screen.getByText(/4\.2 m\/s²/)).toBeInTheDocument();
  });

  it('renders the description when non-empty', async () => {
    await seed([
      {
        timestamp: '2026-06-01T10:00:00.000Z',
        type: 'trilling',
        intensity: 5,
        durationMinutes: 10,
        location: 'Woonkamer',
        description: 'hard gebonk',
      },
    ]);
    render(<LogList />);
    await waitFor(() => expect(screen.queryAllByTestId('log-item').length).toBe(1));
    expect(screen.getByText('hard gebonk')).toBeInTheDocument();
  });

  void entry;
});
