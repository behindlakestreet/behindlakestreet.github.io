const NL_NL_DATE_TIME = new Intl.DateTimeFormat('nl-NL', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const NL_NL_DATE = new Intl.DateTimeFormat('nl-NL', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Format an ISO timestamp as a Dutch-locale date+time string in the user's
 * local timezone, e.g. "05-06-2026 14:30". Returns `''` for empty/null/undefined.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return NL_NL_DATE_TIME.format(d);
}

/**
 * Format an ISO timestamp as a Dutch-locale date string in the user's
 * local timezone, e.g. "05-06-2026". Returns `''` for empty/null/undefined.
 */
export function fmtDateOnly(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return NL_NL_DATE.format(d);
}
