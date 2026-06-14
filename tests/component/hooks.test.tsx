import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useLogs } from '@/hooks/useLogs';
import { useProfile } from '@/hooks/useProfile';
import { inMemoryRepositories, setRepositories } from '@/lib/repository';

describe('useLogs', () => {
  beforeEach(() => {
    setRepositories(...Object.values(inMemoryRepositories()));
  });

  it('starts with an empty list, then loads', async () => {
    const { result } = renderHook(() => useLogs());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logs).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('add() persists and refreshes the list', async () => {
    const { result } = renderHook(() => useLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.add({
        timestamp: '2026-06-01T10:00:00.000Z',
        type: 'trilling',
        intensity: 5,
        durationMinutes: 10,
        location: 'Woonkamer',
        description: '',
      });
    });
    await waitFor(() => expect(result.current.logs).toHaveLength(1));
    expect(result.current.logs[0]?.type).toBe('trilling');
  });

  it('remove() drops the entry from the list', async () => {
    const { result } = renderHook(() => useLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let id = '';
    await act(async () => {
      const stored = await result.current.add({
        timestamp: '2026-06-01T10:00:00.000Z',
        type: 'geluid',
        intensity: 7,
        durationMinutes: 5,
        location: 'Keuken',
        description: '',
      });
      id = stored.id;
    });
    await waitFor(() => expect(result.current.logs).toHaveLength(1));
    await act(async () => {
      await result.current.remove(id);
    });
    await waitFor(() => expect(result.current.logs).toHaveLength(0));
  });

  it('clear() empties the list', async () => {
    const { result } = renderHook(() => useLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.add({
        timestamp: '2026-06-01T10:00:00.000Z',
        type: 'trilling',
        intensity: 5,
        durationMinutes: 10,
        location: 'Woonkamer',
        description: '',
      });
    });
    await waitFor(() => expect(result.current.logs).toHaveLength(1));
    await act(async () => {
      await result.current.clear();
    });
    await waitFor(() => expect(result.current.logs).toHaveLength(0));
  });
});

describe('useProfile', () => {
  beforeEach(() => {
    setRepositories(...Object.values(inMemoryRepositories()));
  });

  it('starts with no profile (null), then loads', async () => {
    const { result } = renderHook(() => useProfile());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it('save() persists and refreshes the profile', async () => {
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.save({
        verzoeker: {
          naam: 'Jan',
          adres: 'Straat 1',
          postcode: '1234 AB',
          plaats: 'Amsterdam',
          telefoon: '',
          email: '',
        },
        gemeente: { naam: '', postbus: '', postcode: '', plaats: '' },
      });
    });
    await waitFor(() => expect(result.current.profile?.verzoeker.naam).toBe('Jan'));
  });
});
