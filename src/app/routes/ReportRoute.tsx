import { ReportPreview } from '@/components/ReportPreview';

export function ReportRoute() {
  return (
    <section aria-labelledby="report-heading">
      <h2 id="report-heading" className="text-base font-semibold mb-3">
        Rapport
      </h2>
      <p className="text-muted text-sm mb-3">
        Genereer een HTML-rapport van alle meldingen in de geselecteerde periode.
      </p>
      <ReportPreview />
    </section>
  );
}
