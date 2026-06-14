import { test, expect } from '@playwright/test';

test.describe('log flow (mobile viewport)', () => {
  test('user can log an entry, see it in history, and clear it', async ({ page }) => {
    await page.goto('/log');

    // The log form is visible.
    await expect(page.getByText('Nieuwe melding', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Opslaan' })).toBeVisible();

    // Fill the form.
    await page.getByLabel('Intensiteit:').fill('7');
    // Intensity is a range input, not a text input — `fill` works on
    // range inputs in Playwright (it sets the value).

    await page.getByLabel('Duur (minuten)').fill('15');

    await page.getByLabel('Geluid', { exact: true }).check();
    await page.getByLabel('Locatie in huis').selectOption('Keuken');
    await page.getByLabel('Omschrijving').fill('heel veel lawaai');

    // Submit.
    await page.getByRole('button', { name: 'Opslaan' }).click();

    // The button flashes "Opgeslagen ✓".
    await expect(page.getByRole('button', { name: /Opgeslagen/ })).toBeVisible();

    // Go to history and confirm the entry is listed.
    await page.getByRole('tab', { name: 'Geschiedenis' }).click();
    await expect(page.getByText('heel veel lawaai')).toBeVisible();
    await expect(page.getByText('Keuken')).toBeVisible();
    // Intensity renders as "7/10".
    await expect(page.getByText(/7\/10/)).toBeVisible();

    // Delete the entry via the verwijder button. window.confirm
    // returns true automatically because we listen for it.
    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'verwijder' }).click();
    await expect(page.getByText('heel veel lawaai')).toBeHidden({ timeout: 5000 });
    await expect(page.getByText('Nog geen meldingen.')).toBeVisible();
  });

  test('intensity slider live-updates the displayed value', async ({ page }) => {
    await page.goto('/log');
    // Default is 5.
    await expect(page.getByText('5', { exact: true })).toBeVisible();
    // Change to 8.
    await page.getByLabel('Intensiteit:').fill('8');
    await expect(page.getByText('8', { exact: true })).toBeVisible();
  });

  test('location select uses the fixed Dutch list', async ({ page }) => {
    await page.goto('/log');
    const select = page.getByLabel('Locatie in huis');
    const options = await select.locator('option').allTextContents();
    expect(options).toEqual([
      'Woonkamer',
      'Slaapkamer',
      'Keuken',
      'Badkamer',
      'Hal',
      'Zolder',
      'Kelder',
      'Tuin',
    ]);
  });

  test('all four tabs are reachable and switch the route', async ({ page }) => {
    await page.goto('/');
    // The root route redirects to /log.
    await expect(page).toHaveURL(/\/log$/);

    await page.getByRole('tab', { name: 'Geschiedenis' }).click();
    await expect(page).toHaveURL(/\/geschiedenis$/);

    await page.getByRole('tab', { name: 'Rapport' }).click();
    await expect(page).toHaveURL(/\/rapport$/);

    await page.getByRole('tab', { name: 'Brief' }).click();
    await expect(page).toHaveURL(/\/brief$/);
  });
});
