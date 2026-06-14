import { describe, expect, it } from 'vitest';
import { buildLetterHtml, type LetterInput } from '@/lib/letter/template';
import { EMPTY_PROFILE, type Profile } from '@/types/domain';

const FULL_PROFILE: Profile = {
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

const FULL_INPUT: LetterInput = {
  profile: FULL_PROFILE,
  caseInput: {
    adresBron: 'het bouwterrein aan de Achterstraat 12',
    periodeOmschrijving: 'sinds circa 1 mei 2026',
    omschrijvingen: [
      'voortdurend gebonk in de avonduren',
      'bouwwerkzaamheden op werkdagen vóór 07:00 en ná 19:00',
      'piekende geluiden van ventilatoren die dag en nacht doorgaan',
    ],
    frequentie: 'dagelijks',
    duurPerKeer: 'tussen 22:00 en 02:00 uur',
    datumBrief: '2026-06-12',
  },
  summary: '<p>Test summary.</p>',
};

describe('buildLetterHtml', () => {
  it('produces a self-contained HTML document with no external assets', () => {
    const html = buildLetterHtml(FULL_INPUT);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toMatch(/<html lang="nl">/);
    expect(html).toMatch(/<style>/);
    expect(html).not.toMatch(/<link [^>]*rel=["']stylesheet/);
    expect(html).not.toMatch(/<script /);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('contains all required Dutch section headings', () => {
    const html = buildLetterHtml(FULL_INPUT);
    expect(html).toContain('Gegevens verzoeker');
    expect(html).toContain('Omschrijving van de situatie');
    expect(html).toContain('Kwantitatieve onderbouwing');
    expect(html).toContain('Verzoek tot handhaving');
    expect(html).toContain('Wettelijke grondslag');
    expect(html).toContain('Termijn');
    expect(html).toContain('Verzuim en rechtsmiddel');
    expect(html).toContain('Bijlagen');
    expect(html).toContain('Ontvangstbevestiging');
    expect(html).toContain('Verzendadvies');
  });

  it('inlines the verzoeker profile fields', () => {
    const html = buildLetterHtml(FULL_INPUT);
    expect(html).toContain('Jan de Vries');
    expect(html).toContain('Achterstraat 12');
    expect(html).toContain('1234 AB');
    expect(html).toContain('Amsterdam');
    expect(html).toContain('06-12345678');
    expect(html).toContain('jan@example.nl');
  });

  it('inlines the recipient (gemeente) block', () => {
    const html = buildLetterHtml(FULL_INPUT);
    expect(html).toContain('Amsterdam');
    expect(html).toContain('Postbus 1234');
    expect(html).toContain('1000 AA');
  });

  it('inlines the case-specific omschrijvingen as bullet points', () => {
    const html = buildLetterHtml(FULL_INPUT);
    for (const o of FULL_INPUT.caseInput.omschrijvingen) {
      expect(html).toContain(o);
    }
  });

  it('inlines the summary block', () => {
    const html = buildLetterHtml(FULL_INPUT);
    expect(html).toContain('<p>Test summary.</p>');
  });

  it('renders a placeholder for the onderwerp with the adres bron', () => {
    const html = buildLetterHtml(FULL_INPUT);
    expect(html).toContain('Onderwerp');
    expect(html).toContain('het bouwterrein aan de Achterstraat 12');
  });

  it('leaves no unfilled `{{...}}` placeholders in the output', () => {
    const html = buildLetterHtml(FULL_INPUT);
    expect(html).not.toMatch(/\{\{[A-Za-z_]+\}\}/);
  });

  it('HTML-escapes user input in omschrijvingen', () => {
    const input: LetterInput = {
      ...FULL_INPUT,
      caseInput: {
        ...FULL_INPUT.caseInput,
        omschrijvingen: ['<script>alert("xss")</script> & "quoted"'],
      },
    };
    const html = buildLetterHtml(input);
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
  });

  it('renders a graceful placeholder for an empty profile (not "undefined")', () => {
    const html = buildLetterHtml({ ...FULL_INPUT, profile: EMPTY_PROFILE });
    expect(html).not.toContain('undefined');
    // Some empty-bracket placeholders are fine; we just need it not to
    // be ugly.
    expect(html.length).toBeGreaterThan(1000);
  });

  it('mentions Awb, Woo, and Omgevingswet somewhere in the body', () => {
    const html = buildLetterHtml(FULL_INPUT);
    expect(html).toContain('Awb');
    expect(html).toContain('Woo');
    expect(html).toMatch(/Omgevingswet|Besluit bouwwerken leefomgeving/i);
  });

  it('is pure — same input yields same output', () => {
    expect(buildLetterHtml(FULL_INPUT)).toBe(buildLetterHtml(FULL_INPUT));
  });
});
