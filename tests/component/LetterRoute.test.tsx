import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LetterRoute } from '@/app/routes/LetterRoute';
import { inMemoryRepositories, setRepositories } from '@/lib/repository';
import { EMPTY_PROFILE, type Profile } from '@/types/domain';
import type { NewLogEntry } from '@/types/domain';

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

async function seed(entries: NewLogEntry[]) {
  const { log, profile } = inMemoryRepositories();
  setRepositories(log, profile);
  for (const e of entries) {
    await log.add(e);
  }
  return { log, profile };
}

function renderRoute() {
  return render(
    <MemoryRouter>
      <LetterRoute />
    </MemoryRouter>,
  );
}

describe('LetterRoute', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('renders profile, form, and preview sections', async () => {
    await seed([]);
    renderRoute();
    expect(screen.getByText(/profiel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/adres van de geluidsbron/i)).toBeInTheDocument();
    expect(await screen.findByTestId('letter-iframe')).toBeInTheDocument();
  });

  it('autofills the form preview with the profile name once filled in', async () => {
    const { profile } = await seed([]);
    await profile.save(FULL);
    renderRoute();
    const iframe = (await screen.findByTestId('letter-iframe')) as HTMLIFrameElement;
    await waitFor(() => {
      expect(iframe.srcdoc).toContain('Jan de Vries');
    });
  });

  it('renders a graceful placeholder when no profile is set', async () => {
    await seed([]);
    renderRoute();
    const iframe = (await screen.findByTestId('letter-iframe')) as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('Gegevens verzoeker');
    expect(iframe.srcdoc).not.toContain('undefined');
  });

  it('typing in the form updates the preview live', async () => {
    await seed([]);
    renderRoute();
    const adresInput = screen.getByLabelText(/adres van de geluidsbron/i) as HTMLInputElement;
    fireEvent.change(adresInput, { target: { value: 'een heel andere plek' } });
    await waitFor(() => {
      const iframe = screen.getByTestId('letter-iframe') as HTMLIFrameElement;
      expect(iframe.srcdoc).toContain('een heel andere plek');
    });
  });

  it('Bekijk samenvatting toggles a visible summary block', async () => {
    await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    renderRoute();
    const toggle = screen.getByRole('button', { name: /bekijk samenvatting/i });
    fireEvent.click(toggle);
    // The summary should now be visible (use a text-content probe).
    await waitFor(() => {
      expect(screen.getByText(/Totaal aantal minuten overlast/i)).toBeInTheDocument();
    });
  });

  it('Download brief (HTML) and Bijlage 1 download buttons are present', async () => {
    await seed([]);
    renderRoute();
    expect(screen.getByRole('button', { name: /download brief/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download bijlage 1|bijlage 1 downloaden/i })).toBeInTheDocument();
  });

  it('Download brief button sets a download attribute with the right filename pattern', async () => {
    const handle = await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    await handle.profile.save(FULL);
    const downloadAttr = vi.fn();
    const origCreate = document.createElement.bind(document);
    const spy = vi.spyOn(document, 'createElement');
    spy.mockImplementation((name: string) => {
      const el = origCreate(name);
      if (name === 'a') {
        Object.defineProperty(el, 'download', {
          set(value: string) {
            downloadAttr(value);
            (el as unknown as { __download: string }).__download = value;
          },
          get() {
            return (el as unknown as { __download?: string }).__download;
          },
        });
      }
      return el;
    });

    renderRoute();
    // Wait for the iframe to populate.
    await screen.findByTestId('letter-iframe');
    // Fill in the adres bron so the slug is non-empty.
    fireEvent.change(screen.getByLabelText(/adres van de geluidsbron/i), {
      target: { value: 'Achterstraat 12' },
    });
    await waitFor(() => {
      const iframe = screen.getByTestId('letter-iframe') as HTMLIFrameElement;
      expect(iframe.srcdoc).toContain('Achterstraat 12');
    });
    fireEvent.click(screen.getByRole('button', { name: /download brief/i }));
    await waitFor(() => expect(downloadAttr).toHaveBeenCalled());
    const filename = downloadAttr.mock.calls[0]?.[0] as string;
    expect(filename).toMatch(/^klachtbrief-achterstraat-12-\d{4}-\d{2}-\d{2}\.html$/);
  });

  it('Bijlage 1 download button is disabled when there are no entries in the period', async () => {
    await seed([]);
    renderRoute();
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /download bijlage 1|bijlage 1 downloaden/i }) as HTMLButtonElement;
      expect(btn).toBeDisabled();
    });
  });

  it('Bijlage 1 download button is enabled when there are entries', async () => {
    await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    renderRoute();
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /download bijlage 1|bijlage 1 downloaden/i }) as HTMLButtonElement;
      expect(btn).not.toBeDisabled();
    });
  });

  it('does not crash on no profile and no entries', async () => {
    await seed([]);
    renderRoute();
    expect(screen.getByTestId('letter-iframe')).toBeInTheDocument();
    void EMPTY_PROFILE;
  });
});
