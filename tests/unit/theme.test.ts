import { describe, expect, it, beforeEach } from 'vitest';
import { applyTheme, readStoredTheme, setTheme, THEME_ATTR, THEME_STORAGE_KEY } from '@/lib/theme';

describe('theme helper', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_ATTR);
  });

  it('readStoredTheme returns "light" by default', () => {
    expect(readStoredTheme()).toBe('light');
  });

  it('readStoredTheme returns "dark" when persisted', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('readStoredTheme ignores unknown values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readStoredTheme()).toBe('light');
  });

  it('applyTheme("dark") sets the data-theme attribute on <html>', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute(THEME_ATTR)).toBe('dark');
  });

  it('applyTheme("light") removes the data-theme attribute', () => {
    document.documentElement.setAttribute(THEME_ATTR, 'dark');
    applyTheme('light');
    expect(document.documentElement.getAttribute(THEME_ATTR)).toBeNull();
  });

  it('setTheme persists the value to localStorage and applies it', () => {
    setTheme('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute(THEME_ATTR)).toBe('dark');
  });

  it('setTheme("light") clears the data-theme attribute (not just sets to "light")', () => {
    setTheme('dark');
    setTheme('light');
    expect(document.documentElement.getAttribute(THEME_ATTR)).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
