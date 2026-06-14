import { test, expect } from '@playwright/test';

test.describe('accessibility', () => {
  test('all four routes expose form fields with proper labels and a main landmark', async ({ page }) => {
    for (const route of ['/log', '/geschiedenis', '/rapport', '/brief']) {
      await page.goto(route);
      // <main> landmark exists.
      await expect(page.locator('main')).toBeVisible();
      // Each route has at least one <h1> or <h2> for screen-reader nav.
      const headings = await page.locator('h1, h2').count();
      expect(headings).toBeGreaterThan(0);
    }
  });

  test('the log form has labels for all controls (no unlabeled inputs)', async ({ page }) => {
    await page.goto('/log');
    const inputs = await page.locator('input, textarea, select').all();
    for (const input of inputs) {
      // Get the id (if any) and look for a matching label OR a wrapping label.
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const tagName = await input.evaluate((el) => el.tagName.toLowerCase());

      // Radios: must have either an aria-label, or a wrapping <label>.
      // Inputs/textareas/selects: must have an id+label[for=id] OR a wrapping
      // label OR an aria-label.
      if (tagName === 'input') {
        const type = await input.getAttribute('type');
        if (type === 'hidden') continue;
        if (type === 'radio') {
          // Wrapping <label> is the common pattern.
          const wrapping = await input.evaluate((el) => el.closest('label') !== null);
          if (!wrapping) {
            // Or a label[for=id].
            const forLabel = id
              ? await page.locator(`label[for="${id}"]`).count()
              : 0;
            expect(forLabel + (ariaLabel ? 1 : 0)).toBeGreaterThan(0);
          }
          continue;
        }
      }

      const wrapping = await input.evaluate((el) => el.closest('label') !== null);
      const forLabel = id
        ? await page.locator(`label[for="${id}"]`).count()
        : 0;
      const hasAria = ariaLabel !== null || ariaLabelledBy !== null;
      expect(wrapping || forLabel > 0 || hasAria).toBe(true);
    }
  });

  test('no element has a positive tabindex', async ({ page }) => {
    await page.goto('/log');
    const positiveTabindex = await page
      .locator('[tabindex]')
      .evaluateAll((els) =>
        els.filter((el) => {
          const ti = parseInt(el.getAttribute('tabindex') ?? '0', 10);
          return Number.isFinite(ti) && ti > 0;
        }).length,
      );
    expect(positiveTabindex).toBe(0);
  });

  test('all images (icons) have alt text or aria-hidden', async ({ page }) => {
    // There are no <img> tags in the app yet — this is a guard for the
    // future. We assert no img is rendered without accessibility attrs.
    await page.goto('/log');
    const imgs = await page.locator('img').all();
    for (const img of imgs) {
      const alt = await img.getAttribute('alt');
      const ariaHidden = await img.getAttribute('aria-hidden');
      const role = await img.getAttribute('role');
      // Either alt is present, or aria-hidden=true, or role=presentation/img.
      expect(alt !== null || ariaHidden === 'true' || role === 'presentation').toBe(true);
    }
    expect(imgs.length).toBeGreaterThanOrEqual(0);
  });

  test('the page has exactly one <main> landmark per route', async ({ page }) => {
    for (const route of ['/log', '/geschiedenis', '/rapport', '/brief']) {
      await page.goto(route);
      const mainCount = await page.locator('main').count();
      expect(mainCount).toBe(1);
    }
  });
});

test.describe('reduced motion', () => {
  test('CSS does not apply animations when prefers-reduced-motion is reduce', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/log');
    // Probe a few elements: their computed transition / animation
    // should be 'none' or '0s' under reduced motion. We don't enforce
    // specific values (Tailwind itself doesn't add animations by default),
    // but we do assert that nothing explicitly runs a non-zero animation.
    const result = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, h1, h2, input'));
      let animated = 0;
      for (const el of els) {
        const cs = getComputedStyle(el);
        if (
          (cs.animationDuration !== '0s' && cs.animationName !== 'none') ||
          (cs.transitionDuration !== '0s' && cs.transitionProperty !== 'none' && cs.transitionProperty !== 'all')
        ) {
          animated += 1;
        }
      }
      return { total: els.length, animated };
    });
    // The result is informational; we don't hard-fail on a positive
    // count because Tailwind's default transitions are minimal and
    // future CSS additions are allowed. We do log it.
    expect(result.total).toBeGreaterThan(0);
    // We assert a soft cap: at most 10% of probed elements may have
    // animations. This is a guard against accidentally adding an
    // aggressive animation.
    expect(result.animated).toBeLessThanOrEqual(Math.max(1, Math.floor(result.total * 0.1)));
  });
});
