import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePanel } from '@/components/ProfilePanel';
import { inMemoryRepositories, setRepositories } from '@/lib/repository';
import { EMPTY_PROFILE, type Profile } from '@/types/domain';

const FULL: Profile = {
  verzoeker: {
    naam: 'Jan de Vries',
    adres: 'Achterstraat 12',
    postcode: '1234 AB',
    plaats: 'Amsterdam',
    telefoon: '06-12345678',
    email: 'jan@example.nl',
  },
  gemeente: {
    naam: 'Amsterdam',
    postbus: '1234',
    postcode: '1000 AA',
    plaats: 'Amsterdam',
  },
};

describe('ProfilePanel', () => {
  beforeEach(() => {
    setRepositories(...Object.values(inMemoryRepositories()));
  });

  it('shows a hint to fill in the profile when empty', async () => {
    render(<ProfilePanel />);
    await waitFor(() =>
      expect(screen.getByText(/vul je gegevens in/i)).toBeInTheDocument(),
    );
  });

  it('renders all 10 fields (verzoeker × 6 + gemeente × 4)', async () => {
    render(<ProfilePanel />);
    // The panel auto-expands by default.
    await waitFor(() => expect(screen.getByLabelText(/naam/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/adres/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/postcode/i)).toHaveLength(2);
    expect(screen.getAllByLabelText(/plaats/i)).toHaveLength(2);
    expect(screen.getByLabelText(/telefoon/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-?mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gemeente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/postbus/i)).toBeInTheDocument();
  });

  it('saves the profile on submit and reflects the new state', async () => {
    const user = userEvent.setup();
    const handle = inMemoryRepositories();
    setRepositories(handle.log, handle.profile);

    render(<ProfilePanel />);

    // The panel auto-expands when no profile is set, but the effect
    // runs after the first render.
    await waitFor(() => expect(screen.getByLabelText(/naam/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/naam/i), { target: { value: FULL.verzoeker.naam } });
    fireEvent.change(screen.getByLabelText(/adres/i), { target: { value: FULL.verzoeker.adres } });
    fireEvent.change(screen.getAllByLabelText(/postcode/i)[0] as HTMLInputElement, { target: { value: FULL.verzoeker.postcode } });
    fireEvent.change(screen.getAllByLabelText(/plaats/i)[0] as HTMLInputElement, { target: { value: FULL.verzoeker.plaats } });
    fireEvent.change(screen.getByLabelText(/telefoon/i), { target: { value: FULL.verzoeker.telefoon } });
    fireEvent.change(screen.getByLabelText(/e-?mail/i), { target: { value: FULL.verzoeker.email } });
    fireEvent.change(screen.getByLabelText(/gemeente/i), { target: { value: FULL.gemeente.naam } });
    fireEvent.change(screen.getByLabelText(/postbus/i), { target: { value: FULL.gemeente.postbus } });
    // The recipient also has postcode and plaats; the labels are
    // "Postcode" and "Plaats" — already covered.

    await user.click(screen.getByRole('button', { name: /opslaan/i }));

    await waitFor(async () => {
      const stored = await handle.profile.get();
      expect(stored?.verzoeker.naam).toBe(FULL.verzoeker.naam);
      expect(stored?.gemeente.naam).toBe(FULL.gemeente.naam);
    });
  });

  it('persists the profile across re-mounts', async () => {
    const handle = inMemoryRepositories();
    setRepositories(handle.log, handle.profile);
    await handle.profile.save(FULL);

    const { unmount } = render(<ProfilePanel />);
    // First render: panel auto-collapses. Expand it to inspect the input.
    await waitFor(() => {
      expect(screen.queryByLabelText(/naam/i)).toBeNull();
    });
    fireEvent.click(screen.getByRole('button', { name: /profiel/i }));
    await waitFor(() => {
      const naam = screen.getByLabelText(/naam/i) as HTMLInputElement;
      expect(naam.value).toBe(FULL.verzoeker.naam);
    });
    unmount();

    render(<ProfilePanel />);
    await waitFor(() => {
      expect(screen.queryByLabelText(/naam/i)).toBeNull();
    });
    fireEvent.click(screen.getByRole('button', { name: /profiel/i }));
    await waitFor(() => {
      const naam = screen.getByLabelText(/naam/i) as HTMLInputElement;
      expect(naam.value).toBe(FULL.verzoeker.naam);
    });
  });

  it('does not show the empty-state hint when a profile is set', async () => {
    const handle = inMemoryRepositories();
    setRepositories(handle.log, handle.profile);
    await handle.profile.save(FULL);
    render(<ProfilePanel />);
    await waitFor(() => {
      expect(screen.queryByText(/vul je gegevens in/i)).toBeNull();
    });
  });

  it('hides its body when collapsed (after a profile is loaded)', async () => {
    // Pre-populate the profile so the panel auto-collapses.
    const handle = inMemoryRepositories();
    setRepositories(handle.log, handle.profile);
    await handle.profile.save(FULL);
    render(<ProfilePanel />);
    // Wait for the auto-collapse effect to run.
    await waitFor(() => {
      expect(screen.queryByLabelText(/naam/i)).toBeNull();
    });
  });

  it('expands when the header is clicked', async () => {
    // Pre-populate so the panel starts collapsed.
    const handle = inMemoryRepositories();
    setRepositories(handle.log, handle.profile);
    await handle.profile.save(FULL);
    const user = userEvent.setup();
    render(<ProfilePanel />);
    // Wait for auto-collapse.
    await waitFor(() => {
      expect(screen.queryByLabelText(/naam/i)).toBeNull();
    });
    await user.click(screen.getByRole('button', { name: /profiel/i }));
    expect(screen.getByLabelText(/naam/i)).toBeInTheDocument();
  });

  it('falls back to EMPTY_PROFILE shape if the saved profile is missing fields', async () => {
    const handle = inMemoryRepositories();
    setRepositories(handle.log, handle.profile);
    // @ts-expect-error intentionally bad input
    await handle.profile.save({ verzoeker: { naam: 'X' }, gemeente: {} });
    render(<ProfilePanel />);
    // Auto-collapse on profile load → click to expand.
    await waitFor(() => {
      expect(screen.queryByLabelText(/gemeente/i)).toBeNull();
    });
    fireEvent.click(screen.getByRole('button', { name: /profiel/i }));
    await waitFor(() => {
      const gemeente = screen.getByLabelText(/gemeente/i) as HTMLInputElement;
      expect(gemeente.value).toBe('');
    });
  });

  it('treats null profile as empty', async () => {
    render(<ProfilePanel />);
    await waitFor(() => {
      expect(screen.getByText(/vul je gegevens in/i)).toBeInTheDocument();
    });
    void EMPTY_PROFILE;
  });
});
