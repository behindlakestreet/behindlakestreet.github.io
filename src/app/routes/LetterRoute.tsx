import { useCallback, useMemo, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useLogs } from '@/hooks/useLogs';
import { EMPTY_PROFILE, type Profile } from '@/types/domain';
import { ProfilePanel } from '@/components/ProfilePanel';
import { LetterForm } from '@/components/LetterForm';
import { LetterPreview } from '@/components/LetterPreview';
import { aggregate } from '@/lib/report/aggregate';
import { summaryForLetter } from '@/lib/letter/summary';
import { buildLetterHtml, type LetterCaseInput } from '@/lib/letter/template';
import { buildBijlage1Zip } from '@/lib/letter/bijlage1';
import { buildReportHtml } from '@/lib/report/buildHtml';
import { slug } from '@/lib/letter/slug';

const EMPTY_CASE: LetterCaseInput = {
  adresBron: '',
  periodeOmschrijving: '',
  omschrijvingen: ['', '', '', '', ''],
  frequentie: '',
  duurPerKeer: '',
  datumBrief: new Date().toISOString().slice(0, 10),
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LetterRoute() {
  const { profile } = useProfile();
  const { logs } = useLogs();
  const [caseInput, setCaseInput] = useState<LetterCaseInput>(EMPTY_CASE);
  const [showSummary, setShowSummary] = useState(false);
  const [bijlageFrom, setBijlageFrom] = useState('');
  const [bijlageTo, setBijlageTo] = useState('');

  const safeProfile: Profile = profile ?? EMPTY_PROFILE;
  const summary = useMemo(() => {
    if (logs.length === 0) return '<p>Geen meldingen in de geselecteerde periode.</p>';
    const agg = aggregate(logs);
    return summaryForLetter(logs, agg, { periodDays: agg.days || 1 });
  }, [logs]);

  const letterHtml = useMemo(
    () => buildLetterHtml({ profile: safeProfile, caseInput, summary }),
    [safeProfile, caseInput, summary],
  );

  const onDownloadBrief = useCallback(() => {
    const blob = new Blob([letterHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateSlug = todayIso();
    const streetSlug = slug(caseInput.adresBron);
    a.download = streetSlug
      ? `klachtbrief-${streetSlug}-${dateSlug}.html`
      : `klachtbrief-${dateSlug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [letterHtml, caseInput.adresBron]);

  const filteredBijlage = useMemo(() => {
    return logs.filter((l) => {
      if (bijlageFrom && l.timestamp < bijlageFrom) return false;
      if (bijlageTo && l.timestamp > bijlageTo + 'T23:59:59') return false;
      return true;
    });
  }, [logs, bijlageFrom, bijlageTo]);

  const aggBijlage = useMemo(() => aggregate(filteredBijlage), [filteredBijlage]);

  const onDownloadBijlage1 = useCallback(() => {
    if (filteredBijlage.length === 0) {
      window.alert('Geen meldingen in de geselecteerde periode.');
      return;
    }
    const reportHtml = buildReportHtml(filteredBijlage, aggBijlage);
    const summaryForBijlage = summaryForLetter(filteredBijlage, aggBijlage, {
      periodDays: aggBijlage.days || 1,
    });
    const zip = buildBijlage1Zip({
      period: {
        from: bijlageFrom || 'alles',
        to: bijlageTo || 'alles',
      },
      logs: filteredBijlage,
      agg: aggBijlage,
      reportHtml,
      summary: summaryForBijlage,
    });
    const blob = new Blob([zip as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateSlug = todayIso();
    a.download = `bijlage-1-overlast-${dateSlug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredBijlage, aggBijlage, bijlageFrom, bijlageTo]);

  return (
    <section aria-labelledby="letter-heading">
      <h2 id="letter-heading" className="text-base font-semibold mb-3">
        Brief
      </h2>

      <ProfilePanel />

      <LetterForm value={caseInput} onChange={setCaseInput} />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setShowSummary((s) => !s)}
          aria-expanded={showSummary}
          className="border border-border rounded-md px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          {showSummary ? 'Verberg samenvatting' : 'Bekijk samenvatting'}
        </button>
      </div>
      {showSummary ? (
        <div
          className="border border-border rounded-md p-3 mb-3 bg-card text-sm"
          data-testid="summary-block"
          dangerouslySetInnerHTML={{ __html: summary }}
        />
      ) : null}

      <div className="border border-border rounded-md p-3 mb-3">
        <p className="text-sm text-muted mb-2">
          Periode voor Bijlage 1 (optioneel; leeg = alle meldingen)
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm flex items-center gap-1.5">
            Van:{' '}
            <input
              type="date"
              value={bijlageFrom}
              onChange={(e) => setBijlageFrom(e.target.value)}
              className="border border-border rounded-md px-2 py-1"
            />
          </label>
          <label className="text-sm flex items-center gap-1.5">
            Tot:{' '}
            <input
              type="date"
              value={bijlageTo}
              onChange={(e) => setBijlageTo(e.target.value)}
              className="border border-border rounded-md px-2 py-1"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={onDownloadBrief}
          className="bg-primary text-white border border-primary rounded-md px-3 py-1.5 text-sm hover:opacity-90"
        >
          Download brief (HTML)
        </button>
        <button
          type="button"
          onClick={onDownloadBijlage1}
          disabled={filteredBijlage.length === 0}
          title={
            filteredBijlage.length === 0
              ? 'Geen meldingen in de geselecteerde periode'
              : 'Download als ZIP'
          }
          className="border border-border rounded-md px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          Download Bijlage 1 (ZIP)
        </button>
      </div>

      <LetterPreview
        profile={safeProfile}
        caseInput={caseInput}
        summary={summary}
      />
    </section>
  );
}
