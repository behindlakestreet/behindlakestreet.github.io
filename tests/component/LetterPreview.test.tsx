import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LetterPreview } from '@/components/LetterPreview';
import { inMemoryRepositories, setRepositories } from '@/lib/repository';
import { EMPTY_PROFILE, type Profile } from '@/types/domain';
import type { LetterCaseInput } from '@/lib/letter/template';

const PROFILE: Profile = {
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

const CASE: LetterCaseInput = {
  adresBron: 'het bouwterrein aan de Achterstraat 12',
  periodeOmschrijving: 'sinds circa 1 mei 2026',
  omschrijvingen: ['voortdurend gebonk in de avonduren'],
  frequentie: 'dagelijks',
  duurPerKeer: 'tussen 22:00 en 02:00 uur',
  datumBrief: '2026-06-12',
};

const SUMMARY = '<p>Test summary.</p>';

describe('LetterPreview', () => {
  it('renders an iframe with srcdoc built from the inputs', async () => {
    setRepositories(...Object.values(inMemoryRepositories()));
    render(
      <LetterPreview
        profile={PROFILE}
        caseInput={CASE}
        summary={SUMMARY}
      />,
    );
    const iframe = (await waitFor(() => screen.getByTestId('letter-iframe'))) as HTMLIFrameElement;
    expect(iframe.srcdoc).toMatch(/^<!DOCTYPE html>/);
    expect(iframe.srcdoc).toContain('Jan de Vries');
    expect(iframe.srcdoc).toContain('Achterstraat 12');
    expect(iframe.srcdoc).toContain('Test summary.');
  });

  it('updates the iframe srcdoc when the case input changes', async () => {
    setRepositories(...Object.values(inMemoryRepositories()));
    const { rerender } = render(
      <LetterPreview profile={PROFILE} caseInput={CASE} summary={SUMMARY} />,
    );
    const iframe = (await waitFor(() => screen.getByTestId('letter-iframe'))) as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('voortdurend gebonk');

    rerender(
      <LetterPreview
        profile={PROFILE}
        caseInput={{ ...CASE, omschrijvingen: ['helemaal andere klacht'] }}
        summary={SUMMARY}
      />,
    );
    await waitFor(() => {
      const updated = (screen.getByTestId('letter-iframe') as HTMLIFrameElement).srcdoc;
      expect(updated).toContain('helemaal andere klacht');
    });
  });

  it('updates the iframe srcdoc when the profile changes', async () => {
    setRepositories(...Object.values(inMemoryRepositories()));
    const { rerender } = render(
      <LetterPreview profile={PROFILE} caseInput={CASE} summary={SUMMARY} />,
    );
    const iframe = (await waitFor(() => screen.getByTestId('letter-iframe'))) as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('Jan de Vries');

    rerender(
      <LetterPreview
        profile={{ ...PROFILE, verzoeker: { ...PROFILE.verzoeker, naam: 'Piet Pietersen' } }}
        caseInput={CASE}
        summary={SUMMARY}
      />,
    );
    await waitFor(() => {
      const updated = (screen.getByTestId('letter-iframe') as HTMLIFrameElement).srcdoc;
      expect(updated).toContain('Piet Pietersen');
      expect(updated).not.toContain('Jan de Vries');
    });
  });

  it('renders gracefully with an empty profile', async () => {
    setRepositories(...Object.values(inMemoryRepositories()));
    render(
      <LetterPreview
        profile={EMPTY_PROFILE}
        caseInput={CASE}
        summary={SUMMARY}
      />,
    );
    const iframe = (await waitFor(() => screen.getByTestId('letter-iframe'))) as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('Gegevens verzoeker');
    expect(iframe.srcdoc).not.toContain('undefined');
  });

  it('does not throw when re-rendered rapidly', async () => {
    setRepositories(...Object.values(inMemoryRepositories()));
    const { rerender } = render(
      <LetterPreview profile={PROFILE} caseInput={CASE} summary={SUMMARY} />,
    );
    for (let i = 0; i < 5; i++) {
      rerender(
        <LetterPreview
          profile={PROFILE}
          caseInput={{ ...CASE, omschrijvingen: [`iter ${i}`] }}
          summary={SUMMARY}
        />,
      );
    }
    const iframe = screen.getByTestId('letter-iframe') as HTMLIFrameElement;
    expect(iframe.srcdoc).toMatch(/iter 4/);
  });
});
