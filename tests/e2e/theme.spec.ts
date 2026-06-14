import { test, expect } from '@playwright/test';

test.describe('theme switcher', () => {
  test('the theme select renders in the header with both options', async ({ page }) => {
    await page.goto('/log');
    const select = page.getByTestId('theme-select');
    await expect(select).toBeVisible();
    const labels = await select.locator('option').allTextContents();
    expect(labels).toEqual(['Standaard', 'Dark (terminal)']);
  });

  test('selecting dark sets data-theme="dark" on <html>', async ({ page }) => {
    await page.goto('/log');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

    await page.getByTestId('theme-select').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('selecting dark applies dark background color (CSS variable resolves)', async ({ page }) => {
    await page.goto('/log');
    await page.getByTestId('theme-select').selectOption('dark');
    // Wait for the 150ms body-color transition to finish before reading.
    await page.waitForTimeout(250);
    const bg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor,
    );
    // The example's --bg is #07110c = rgb(7, 17, 12).
    expect(bg).toBe('rgb(7, 17, 12)');
  });

  test('switching back to light removes the data-theme attribute', async ({ page }) => {
    await page.goto('/log');
    await page.getByTestId('theme-select').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByTestId('theme-select').selectOption('light');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
    // Wait for transition.
    await page.waitForTimeout(250);
    const bg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor,
    );
    // The light --bg is #f5f5f5 = rgb(245, 245, 245).
    expect(bg).toBe('rgb(245, 245, 245)');
  });

  test('the choice persists across reload (localStorage)', async ({ page }) => {
    await page.goto('/log');
    await page.getByTestId('theme-select').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Reload — the inline script in index.html should re-apply before
    // first paint, so data-theme="dark" is present immediately.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // And the select reflects the persisted value.
    const value = await page.getByTestId('theme-select').inputValue();
    expect(value).toBe('dark');
  });

  test('dark mode trilling/geluid/beide colors are present (CSS variables resolved)', async ({ page }) => {
    await page.goto('/log');
    // Seed an entry of each type.
    await page.evaluate(() => {
      // No real seeding path here; just check the CSS variables resolve.
      const root = document.documentElement;
      return window.getComputedStyle(root);
    });
    // Switch to dark.
    await page.getByTestId('theme-select').selectOption('dark');
    const colors = await page.evaluate(() => {
      const cs = window.getComputedStyle(document.documentElement);
      return {
        bg: cs.getPropertyValue('--bg').trim(),
        primary: cs.getPropertyValue('--primary').trim(),
        trilling: cs.getPropertyValue('--trilling').trim(),
        geluid: cs.getPropertyValue('--geluid').trim(),
        beide: cs.getPropertyValue('--beide').trim(),
        border: cs.getPropertyValue('--border').trim(),
      };
    });
    // The example's dark tokens.
    expect(colors.bg).toBe('#07110c');
    expect(colors.primary).toBe('#5eba82');
    expect(colors.trilling).toBe('#c9933a');
    expect(colors.geluid).toBe('#5e9eba');
    expect(colors.beide).toBe('#9e7ec8');
    // border is rgba(255, 255, 255, 0.07) — getPropertyValue normalizes.
    expect(colors.border).toMatch(/^rgba?\(255, 255, 255, 0\.07\)$/);
  });

  test('intensity value pill: green text on light-green bg in dark mode', async ({ page }) => {
    await page.goto('/log');
    await page.getByTestId('theme-select').selectOption('dark');
    await page.waitForTimeout(250);
    const pill = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="intensity-value"]');
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      return {
        text: el.textContent,
        color: cs.color,
        background: cs.backgroundColor,
        borderColor: cs.borderColor,
        hasPillClass: el.classList.contains('intensity-value'),
      };
    });
    expect(pill?.hasPillClass).toBe(true);
    // Text is the dark primary green: #5eba82.
    expect(pill?.color).toBe('rgb(94, 186, 130)');
    // Background is the dim green: rgba(94, 186, 130, 0.1) — Chromium
    // reports it as rgb(94 186 130 / 0.1) in modern versions.
    expect(pill?.background).toMatch(/rgba?\(\s*94,\s*186,\s*130/);
  });

  test('intensity value pill: blue text on light-blue bg in light mode', async ({ page }) => {
    await page.goto('/log');
    const pill = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="intensity-value"]');
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      return {
        color: cs.color,
        background: cs.backgroundColor,
        hasPillClass: el.classList.contains('intensity-value'),
      };
    });
    expect(pill?.hasPillClass).toBe(true);
    // Light mode primary is #2563eb.
    expect(pill?.color).toBe('rgb(37, 99, 235)');
    expect(pill?.background).toMatch(/rgba?\(\s*37,\s*99,\s*235/);
  });

  test('slider input has appearance:none in dark mode (so the custom thumb shows)', async ({ page }) => {
    await page.goto('/log');
    await page.getByTestId('theme-select').selectOption('dark');
    await page.waitForTimeout(250);
    // Headless Chromium doesn't return pseudo-element computed values
    // reliably, but the input's own appearance IS observable. When
    // appearance is "none", the custom ::-webkit-slider-thumb rule
    // applies and the green disc shows.
    const appearance = await page.evaluate(() => {
      const slider = document.getElementById('intensity');
      return slider ? window.getComputedStyle(slider).appearance : null;
    });
    expect(appearance).toBe('none');
  });
});
