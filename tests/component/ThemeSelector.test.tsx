import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeSelector } from '@/components/ThemeSelector';
import { THEME_ATTR, THEME_STORAGE_KEY } from '@/lib/theme';

describe('ThemeSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_ATTR);
  });

  it('renders a labelled select with the two theme options', () => {
    render(<ThemeSelector />);
    const select = screen.getByTestId('theme-select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toEqual(['Standaard', 'Dark (terminal)']);
  });

  it('shows the persisted dark theme as the selected value on mount', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeSelector />);
    const select = screen.getByTestId('theme-select') as HTMLSelectElement;
    expect(select.value).toBe('dark');
    // And the DOM attribute is in sync.
    expect(document.documentElement.getAttribute(THEME_ATTR)).toBe('dark');
  });

  it('changing the select to dark applies the theme and persists it', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector />);
    const select = screen.getByTestId('theme-select') as HTMLSelectElement;
    await user.selectOptions(select, 'dark');
    expect(document.documentElement.getAttribute(THEME_ATTR)).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('changing the select to light removes the attribute and persists it', async () => {
    document.documentElement.setAttribute(THEME_ATTR, 'dark');
    const user = userEvent.setup();
    render(<ThemeSelector />);
    const select = screen.getByTestId('theme-select') as HTMLSelectElement;
    await user.selectOptions(select, 'light');
    expect(document.documentElement.getAttribute(THEME_ATTR)).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('two selectors in the same app stay in sync (broadcasts on change)', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ThemeSelector />
        <ThemeSelector />
      </>,
    );
    const selects = screen.getAllByTestId('theme-select') as HTMLSelectElement[];
    expect(selects).toHaveLength(2);

    await user.selectOptions(selects[0]!, 'dark');
    // The second selector reflects the new value.
    expect(selects[1]!.value).toBe('dark');
  });
});
