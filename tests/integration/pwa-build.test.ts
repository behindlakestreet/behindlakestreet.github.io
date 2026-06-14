/**
 * Smoke tests for the PWA build output. These run against `dist/` and
 * ensure the Vite build emits the right files. The test is skipped if
 * `dist/` doesn't exist (e.g., before the first `npm run build`).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(__dirname, '../../dist');

describe.skipIf(!existsSync(DIST))('PWA build output', () => {
  it('emits a service worker', () => {
    expect(existsSync(path.join(DIST, 'sw.js'))).toBe(true);
  });

  it('emits a workbox runtime', () => {
    const sw = readFileSync(path.join(DIST, 'sw.js'), 'utf-8');
    // workbox is bundled into its own JS file, referenced by name.
    const wbMatch = sw.match(/workbox-[\w-]+/);
    expect(wbMatch).not.toBeNull();
    if (wbMatch) {
      expect(existsSync(path.join(DIST, `${wbMatch[0]}.js`))).toBe(true);
    }
  });

  it('emits a manifest with the right metadata', () => {
    const manifestPath = path.join(DIST, 'manifest.webmanifest');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
    expect(manifest.name).toBe('Overlast Logger');
    expect(manifest.short_name).toBe('Overlast');
    expect(manifest.lang).toBe('nl');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#2563eb');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect((manifest.icons as unknown[]).length).toBeGreaterThan(0);
  });

  it('index.html links the manifest and the favicon', () => {
    const html = readFileSync(path.join(DIST, 'index.html'), 'utf-8');
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"\s*\/?>/);
    expect(html).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"\s*\/?>/);
    expect(html).toMatch(/<meta name="theme-color" content="#2563eb"\s*\/?>/);
  });

  it('registers the service worker', () => {
    const html = readFileSync(path.join(DIST, 'index.html'), 'utf-8');
    expect(html).toMatch(/registerSW/);
  });
});
