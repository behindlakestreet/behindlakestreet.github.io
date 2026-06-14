export type ThemeName = 'light' | 'dark';

const STORAGE_KEY = 'overlast.theme';
const ATTR = 'data-theme';

/** Read the current theme from localStorage (sync, safe to call at module init). */
export function readStoredTheme(): ThemeName {
  if (typeof localStorage === 'undefined') return 'light';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'dark' ? 'dark' : 'light';
}

/** Apply a theme to the document by setting the data-theme attribute. */
export function applyTheme(theme: ThemeName): void {
  if (typeof document === 'undefined') return;
  if (theme === 'light') {
    document.documentElement.removeAttribute(ATTR);
  } else {
    document.documentElement.setAttribute(ATTR, theme);
  }
}

/** Persist + apply. Returns the new value. */
export function setTheme(theme: ThemeName): ThemeName {
  applyTheme(theme);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, theme);
  }
  return theme;
}

export const THEME_STORAGE_KEY = STORAGE_KEY;
export const THEME_ATTR = ATTR;
