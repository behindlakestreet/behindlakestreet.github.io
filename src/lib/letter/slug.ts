/**
 * Slugify a string for use in a filename. Lowercases, replaces whitespace
 * with hyphens, removes any character that's not [a-z0-9-_]. Collapses
 * repeated separators. Returns '' for an empty input.
 */
export function slug(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
