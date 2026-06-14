import { test, expect } from '@playwright/test';

/**
 * GitHub Pages SPA routing: a static host serves 404.html for any path
 * that isn't a real file. The 404.html script redirects to /?p=<path>,
 * and the index.html script rewrites history back to the real path so
 * React Router picks it up.
 *
 * This test runs against a TRUE static file server (no history
 * fallback) on port 4173, started by `npx serve dist` before the test
 * suite. The dev server (5173) is Vite with history fallback and
 * wouldn't exercise this path.
 */
test.describe('GitHub Pages SPA 404 fallback', () => {
  test('direct navigation to /brief renders the Letter page (via 404 + ?p= recovery)', async ({
    page,
  }) => {
    // Use the static server, not the dev server.
    await page.goto('http://localhost:4173/brief', { waitUntil: 'networkidle' });
    // The address bar should now show /brief (history was rewritten).
    expect(page.url()).toContain('/brief');
    // And the Letter route heading is visible.
    await expect(page.getByRole('heading', { name: 'Brief' })).toBeVisible();
  });

  test('direct navigation to /log renders the Log page', async ({ page }) => {
    await page.goto('http://localhost:4173/log', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/log');
    await expect(page.getByRole('heading', { name: 'Nieuwe melding' })).toBeVisible();
  });

  test('direct navigation to /rapport renders the Rapport page', async ({ page }) => {
    await page.goto('http://localhost:4173/rapport', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/rapport');
    await expect(page.getByRole('heading', { name: 'Rapport' })).toBeVisible();
  });
});
