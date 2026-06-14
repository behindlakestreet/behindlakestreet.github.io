import { LogList } from '@/components/LogList';

export function HistoryRoute() {
  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className="text-base font-semibold mb-3">
        Geschiedenis
      </h2>
      <LogList />
    </section>
  );
}
