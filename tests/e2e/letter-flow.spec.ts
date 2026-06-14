import { test, expect } from '@playwright/test';

test.describe('letter flow (mobile viewport)', () => {
  test('user can fill profile, fill letter, and the preview updates live', async ({ page }) => {
    await page.goto('/brief');

    // Profile panel is auto-expanded (no profile set).
    await expect(page.getByText(/Vul je gegevens in/i)).toBeVisible();

    // Fill profile.
    await page.getByLabel('Naam', { exact: true }).fill('Jan de Vries');
    await page.getByLabel('Adres', { exact: true }).fill('Achterstraat 12');
    await page.getByLabel('Postcode', { exact: true }).first().fill('1234 AB');
    await page.getByLabel('Plaats', { exact: true }).first().fill('Amsterdam');
    await page.getByLabel('Telefoon', { exact: true }).fill('06-12345678');
    await page.getByLabel('E-mail', { exact: true }).fill('jan@example.nl');
    await page.getByLabel('Gemeente', { exact: true }).fill('Amsterdam');
    await page.getByLabel('Postbus', { exact: true }).fill('1234');

    // Save profile.
    await page.getByRole('button', { name: 'Opslaan' }).first().click();
    // The indicator appears in the header (which auto-collapses the body
    // once a profile is set).
    await expect(page.getByText('Opgeslagen ✓').first()).toBeVisible();

    // Debug: read the current profile from the page (via the iframe).
    const iframe = page.frameLocator('iframe[title="Brief voorvertoning"]');
    await expect(iframe.locator('body')).toContainText('Jan de Vries');

    // Fill the letter form.
    await page.getByLabel(/Adres van de geluidsbron/).fill('Achterstraat 12');
    await page.getByLabel(/Periode-omschrijving/).fill('sinds circa 1 mei 2026');
    await page.getByLabel('Omschrijving 1').fill('voortdurend gebonk in de avonduren');
    await page.getByLabel('Omschrijving 2').fill('bouwwerkzaamheden op werkdagen vóór 07:00');
    await page.getByLabel('Frequentie').fill('dagelijks');
    await page.getByLabel('Duur per keer').fill('tussen 22:00 en 02:00 uur');

    // The preview iframe should contain the autofilled data.
    await expect(iframe.locator('body')).toContainText('Jan de Vries');
    await expect(iframe.locator('body')).toContainText('Achterstraat 12');
    await expect(iframe.locator('body')).toContainText('voortdurend gebonk');
    await expect(iframe.locator('body')).toContainText('Amsterdam');
    await expect(iframe.locator('body')).toContainText('sinds circa 1 mei 2026');
  });

  test('Bekijk samenvatting toggles a visible summary block', async ({ page }) => {
    await page.goto('/log');

    // Log an entry first so the summary has something to show.
    await page.getByLabel('Duur (minuten)').fill('30');
    await page.getByLabel('Locatie in huis').selectOption('Woonkamer');
    await page.getByLabel('Omschrijving').fill('test entry');
    await page.getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.getByRole('button', { name: /Opgeslagen/ })).toBeVisible();

    // Go to the letter route.
    await page.getByRole('tab', { name: 'Brief' }).click();

    // The summary is hidden by default.
    await expect(page.getByTestId('summary-block')).toBeHidden();

    // Toggle it on.
    await page.getByRole('button', { name: /Bekijk samenvatting/ }).click();
    await expect(page.getByTestId('summary-block')).toBeVisible();
    await expect(page.getByTestId('summary-block')).toContainText('Totaal aantal minuten overlast');
  });

  test('Download brief sets a download with the right filename pattern', async ({ page }) => {
    await page.goto('/brief');

    // Fill the case input so the slug is non-empty.
    await page.getByLabel(/Adres van de geluidsbron/).fill('Achterstraat 12');
    await page.getByLabel('Omschrijving 1').fill('iets');

    // Wait for the preview to reflect the input.
    const iframe = page.frameLocator('iframe[title="Brief voorvertoning"]');
    await expect(iframe.locator('body')).toContainText('Achterstraat 12');

    // Click download and capture the suggested filename.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download brief \(HTML\)/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^klachtbrief-achterstraat-12-\d{4}-\d{2}-\d{2}\.html$/,
    );
  });

  test('Bijlage 1 download is disabled when there are no entries', async ({ page }) => {
    await page.goto('/brief');
    const btn = page.getByRole('button', { name: /Download Bijlage 1/ });
    await expect(btn).toBeDisabled();
  });

  test('Bijlage 1 download produces a zip with the expected files', async ({ page }) => {
    // Seed an entry first.
    await page.goto('/log');
    await page.getByLabel('Duur (minuten)').fill('30');
    await page.getByLabel('Locatie in huis').selectOption('Woonkamer');
    await page.getByLabel('Omschrijving').fill('test entry');
    await page.getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.getByRole('button', { name: /Opgeslagen/ })).toBeVisible();

    await page.getByRole('tab', { name: 'Brief' }).click();
    const btn = page.getByRole('button', { name: /Download Bijlage 1/ });
    await expect(btn).toBeEnabled();

    const downloadPromise = page.waitForEvent('download');
    await btn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^bijlage-1-overlast-\d{4}-\d{2}-\d{2}\.zip$/,
    );

    // Save the zip to a temp file and unzip it via Node.
    const path = await download.path();
    expect(path).not.toBeNull();
    if (path) {
      const fs = await import('node:fs');
      const { execSync } = await import('node:child_process');
      // The zip is small; write it to a temp dir, unzip, and check filenames.
      const tmp = `/tmp/bijlage-test-${Date.now()}`;
      fs.mkdirSync(tmp, { recursive: true });
      fs.copyFileSync(path, `${tmp}/bijlage.zip`);
      execSync(`unzip -o ${tmp}/bijlage.zip -d ${tmp}`);
      const files = fs.readdirSync(tmp);
      expect(files).toEqual(
        expect.arrayContaining([
          'bijlage.zip',
          expect.stringMatching(/^overlast-rapport-.*\.html$/),
          'logboek.csv',
          'logboek-aggregaat.csv',
          'logboek-samenvatting.txt',
        ]),
      );
    }
  });
});
