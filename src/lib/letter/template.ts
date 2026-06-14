import { fmtDateOnly } from '@/lib/time/format';
import type { Profile } from '@/types/domain';

export interface LetterCaseInput {
  /** Adres of the noise source. */
  adresBron: string;
  /** Free text period description, e.g. "sinds circa 1 mei 2026". */
  periodeOmschrijving: string;
  /** Up to 5 short descriptions of the nuisance. */
  omschrijvingen: string[];
  /** Free text frequency description, e.g. "dagelijks". */
  frequentie: string;
  /** Free text duration description, e.g. "tussen 22:00 en 02:00 uur". */
  duurPerKeer: string;
  /** ISO date string for the date of the letter. */
  datumBrief: string;
}

export interface LetterInput {
  profile: Profile;
  caseInput: LetterCaseInput;
  /** Pre-rendered summary HTML, e.g. from `summaryForLetter`. */
  summary: string;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

function nl(s: string | undefined | null): string {
  // Render a friendly placeholder for missing fields, never the literal
  // string "undefined" or "null".
  if (s == null) return '';
  const trimmed = s.trim();
  return trimmed === '' ? '__________' : esc(trimmed);
}

const LETTER_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #222; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  h1 { font-size: 1.2rem; border-bottom: 1px solid #222; padding-bottom: 0.5rem; }
  h2 { font-size: 1rem; margin-top: 1.5rem; color: #333; }
  .header { display: flex; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.5rem; }
  .recipient, .sender { font-size: 0.9rem; }
  .sender { text-align: right; }
  .meta { margin: 1rem 0; }
  .subject { font-weight: 600; margin: 1rem 0; }
  ul { margin: 0.5rem 0 1rem 1.5rem; }
  ol { margin: 0.5rem 0 1rem 1.5rem; }
  .signature { margin-top: 2rem; }
  .verzendadvies { background: #f7f7f7; border: 1px solid #e5e5e5; border-radius: 6px; padding: 1rem; margin-top: 2rem; font-size: 0.9rem; }
  @media print { body { max-width: none; margin: 1.5cm; } .verzendadvies { background: transparent; border: none; padding: 0; } }
`;

function buildBullets(items: readonly string[]): string {
  const cleaned = items.map((s) => s.trim()).filter((s) => s.length > 0);
  if (cleaned.length === 0) return '<li>__________</li>';
  return cleaned.map((s) => `<li>${esc(s)}</li>`).join('\n');
}

/**
 * Build the full klachtbrief HTML. Pure — given the same input, the output
 * is fully deterministic. The result is a self-contained print-ready
 * document: all CSS is inlined, no external assets, opens via `file://`.
 */
export function buildLetterHtml(input: LetterInput): string {
  const { profile, caseInput, summary } = input;
  const v = profile.verzoeker;
  const g = profile.gemeente;

  const datumBriefLabel = fmtDateOnly(caseInput.datumBrief);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Klachtbrief overlast — ${esc(caseInput.adresBron || 'zonder adres')}</title>
<style>${LETTER_CSS}</style>
</head>
<body>

<h1>Onderwerp: Verzoek om handhaving en geluidsmeting — ${esc(caseInput.adresBron || '__________')}</h1>

<div class="header">
  <div class="recipient">
    Aan het college van burgemeester en wethouders<br>
    van de gemeente ${nl(g.naam)}<br>
    Postbus ${nl(g.postbus)}<br>
    ${nl(g.postcode)} ${nl(g.plaats)}
  </div>
  <div class="sender">
    ${esc(datumBriefLabel)}
  </div>
</div>

<div class="meta">
  <strong>Van:</strong> ${nl(v.naam)}<br>
  ${nl(v.adres)}<br>
  ${nl(v.postcode)} ${nl(v.plaats)}<br>
  ${v.telefoon ? `Tel: ${esc(v.telefoon)}<br>` : ''}
  ${v.email ? `E-mail: ${esc(v.email)}<br>` : ''}
</div>

<p>Geacht college,</p>

<h2>1. Gegevens verzoeker</h2>
<p>
  Naam&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${nl(v.naam)}<br>
  Adres&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${nl(v.adres)}<br>
  postcode/plaats: ${nl(v.postcode)} ${nl(v.plaats)}<br>
  Telefoon&nbsp;: ${nl(v.telefoon)}<br>
  E-mail&nbsp;&nbsp;&nbsp;&nbsp;: ${nl(v.email)}
</p>

<h2>2. Omschrijving van de situatie</h2>
<p>
  Op het adres ${esc(caseInput.adresBron || '__________')}, dan wel vanuit de nabije omgeving,
  wordt ${esc(caseInput.periodeOmschrijving || '__________')} aanhoudend en/of op onaanvaardbare wijze
  geluidsoverlast veroorzaakt.
</p>
<p>De overlast uit zich onder meer in:</p>
<ul>
  ${buildBullets(caseInput.omschrijvingen)}
</ul>
<p>
  <strong>Frequentie:</strong> ${esc(caseInput.frequentie || '__________')}<br>
  <strong>Duur per keer:</strong> ${esc(caseInput.duurPerKeer || '__________')}
</p>

<h2>2a. Kwantitatieve onderbouwing</h2>
${summary}

<h2>3. Verzoek tot handhaving en geluidsmeting</h2>
<p>Ik verzoek u:</p>
<ol type="a">
  <li>handhavend op te treden tegen de geconstateerde overtreding van de toepasselijke regelgeving (waaronder in elk geval de Algemene plaatselijke verordening, de Omgevingswet, het Besluit bouwwerken leefomgeving en/of de voor de inrichting verleende vergunning);</li>
  <li>een deugdelijke geluidsmeting te (laten) verrichten op of nabij mijn woning, dan wel de geluidsbelasting objectief te (laten) onderzoeken, zodat kan worden vastgesteld of de wettelijke normen worden overschreden;</li>
  <li>mij van de resultaten van deze meting, alsook van de bevindingen van eventueel nader onderzoek, een volledig afschrift te verstrekken.</li>
</ol>

<h2>4. Wettelijke grondslag afschrift meetrapport</h2>
<p>
  Dit verzoek om afschrift baseer ik, naast de Awb, mede op de Wet open overheid (Woo).
  In het geval het rapport gegevens van derden bevat, verzoek ik u deze gegevens
  overeenkomstig artikel 5.1 Woo te lakken en het overige deel alsnog aan mij te verstrekken.
</p>

<h2>5. Termijn</h2>
<p>
  Ik verzoek u binnen vier weken na dagtekening van deze brief een besluit te nemen
  op dit handhavingsverzoek en mij van de uitkomst — en zodra beschikbaar van het
  meetrapport — schriftelijk in kennis te stellen.
</p>

<h2>6. Verzuim en rechtsmiddel</h2>
<p>
  Indien u niet binnen de hierboven gestelde termijn op dit verzoek beslist,
  beschouw ik het niet (tijdig) nemen van een besluit als een fictieve weigering
  (artikel 6:2 Awb), waartegen bezwaar en beroep openstaat.
  Tegen een (gedeeltelijke) afwijzing kan binnen zes weken bezwaar worden gemaakt
  bij het college van burgemeester en wethouders (artikel 6:7 Awb).
</p>

<h2>7. Bijlagen</h2>
<p>Bij deze brief zijn de volgende bijlagen gevoegd:</p>
<ul>
  <li>Bijlage 1: Logboek en samenvatting geluidsoverlast (bestanden <code>logboek.csv</code>, <code>logboek-samenvatting.txt</code> en <code>logboek-aggregaat.csv</code>) — datum, tijdstip, duur, type, sterkte (1–5) en eventueel db-meting per geregistreerd incident.</li>
  <li>[BIJLAGE 2, bijv. kopie van eerdere melding(en) aan gemeente/politie]</li>
  <li>[BIJLAGE 3, bijv. eventuele audio-/video-opnames of foto's]</li>
</ul>

<h2>8. Ontvangstbevestiging</h2>
<p>
  Tot slot verzoek ik u de ontvangst van dit verzoek schriftelijk aan mij te bevestigen.
</p>

<p class="signature">
  Met vriendelijke groet,<br><br>
  ${nl(v.naam)}<br>
  ${nl(v.adres)}<br>
  ${nl(v.postcode)} ${nl(v.plaats)}<br>
  ${v.telefoon ? `Tel: ${esc(v.telefoon)}<br>` : ''}
  ${v.email ? `E-mail: ${esc(v.email)}` : ''}
</p>

<div class="verzendadvies">
  <strong>Verzendadvies</strong>
  <ul>
    <li>Per aangetekende post versturen, of per e-mail met leesbevestiging.</li>
    <li>Bewaar een kopie (inclusief alle bijlagen) voor uw eigen dossier.</li>
    <li>Stuur de brief bij voorkeur ook digitaal naar het algemene e-mailadres van de gemeente en/of via het online meldingsformulier (vermeld in de brief dat de digitale verzending naast de aangetekende post geschiedt).</li>
    <li>Reageert de gemeente niet binnen 4 weken? Dien dan bezwaar in of stap naar de Nationale Ombudsman (www.nationaleombudsman.nl).</li>
    <li>Overweeg bij ernstige of langdurige overlast gelijktijdig een Woo-verzoek in te dienen om (eerdere) documenten boven tafel te krijgen.</li>
  </ul>
</div>

</body>
</html>`;
}
