import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FOUR_OH_FOUR = readFileSync(
  path.resolve(__dirname, '../../public/404.html'),
  'utf-8',
);

const INDEX_HTML = readFileSync(
  path.resolve(__dirname, '../../index.html'),
  'utf-8',
);

/**
 * Extract the inline script body from an HTML file (the first
 * `<script>` tag without a `src` attribute).
 */
function extractInlineScript(html: string): string {
  const m = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/);
  return m?.[1] ?? '';
}

describe('GitHub Pages SPA 404 fallback', () => {
  describe('public/404.html', () => {
    it('exists and contains an inline redirect script', () => {
      expect(FOUR_OH_FOUR).toContain('<!DOCTYPE html>');
      expect(FOUR_OH_FOUR).toContain('window.location.replace');
    });

    it('redirects paths that look like SPA routes to /?p=<path>', () => {
      const script = extractInlineScript(FOUR_OH_FOUR);
      // Stub the browser globals.
      const replaces: string[] = [];
      const fakeLocation = {
        pathname: '/brief',
        search: '',
        hash: '',
        origin: 'https://example.com',
        replace: (url: string) => {
          replaces.push(url);
        },
      };
      const sandbox: Record<string, unknown> = {
        window: { location: fakeLocation },
        location: fakeLocation,
        URLSearchParams: globalThis.URLSearchParams,
      };
      // Run the script in the sandbox.
      const fn = new Function(...Object.keys(sandbox), script);
      fn(...Object.values(sandbox));
      expect(replaces).toHaveLength(1);
      expect(replaces[0]).toBe('https://example.com/?p=%2Fbrief');
    });

    it('redirects paths with hash to /?p=<path>#<hash>', () => {
      const script = extractInlineScript(FOUR_OH_FOUR);
      const replaces: string[] = [];
      const fakeLocation = {
        pathname: '/rapport',
        search: '',
        hash: '#section',
        origin: 'https://example.com',
        replace: (url: string) => {
          replaces.push(url);
        },
      };
      const sandbox: Record<string, unknown> = {
        window: { location: fakeLocation },
        location: fakeLocation,
      };
      const fn = new Function(...Object.keys(sandbox), script);
      fn(...Object.values(sandbox));
      expect(replaces[0]).toBe('https://example.com/?p=%2Frapport#section');
    });

    it('redirects to / for paths that do not look like SPA routes', () => {
      const script = extractInlineScript(FOUR_OH_FOUR);
      const replaces: string[] = [];
      const fakeLocation = {
        pathname: '/wp-admin/index.php', // has a dot, not a SPA route
        search: '',
        hash: '',
        origin: 'https://example.com',
        replace: (url: string) => {
          replaces.push(url);
        },
      };
      const sandbox: Record<string, unknown> = {
        window: { location: fakeLocation },
        location: fakeLocation,
      };
      const fn = new Function(...Object.keys(sandbox), script);
      fn(...Object.values(sandbox));
      expect(replaces[0]).toBe('https://example.com/');
    });
  });

  describe('index.html (SPA path recovery)', () => {
    it('contains a script that recovers the ?p= param and rewrites history', () => {
      const script = extractInlineScript(INDEX_HTML);
      expect(script).toContain('URLSearchParams');
      expect(script).toContain('history.replaceState');
      // It looks up ?p= from the search params.
      expect(script).toMatch(/params\.get\(['"]p['"]\)/);
    });

    it('rewrites history to the recovered path', () => {
      const script = extractInlineScript(INDEX_HTML);
      const replaces: Array<[unknown, string, string?]> = [];
      const fakeHistory = {
        replaceState: (state: unknown, title: string, url?: string) => {
          replaces.push([state, title, url]);
        },
      };
      const params = new URLSearchParams('?p=%2Fbrief');
      const fakeWindow = {
        history: fakeHistory,
        location: { search: params.toString(), hash: '' },
      };
      const sandbox: Record<string, unknown> = {
        window: fakeWindow,
        URLSearchParams: globalThis.URLSearchParams,
      };
      const fn = new Function(...Object.keys(sandbox), script);
      fn(...Object.values(sandbox));
      expect(replaces).toHaveLength(1);
      expect(replaces[0]?.[2]).toBe('/brief');
    });

    it('leaves the URL alone when there is no ?p= param', () => {
      const script = extractInlineScript(INDEX_HTML);
      const replaces: unknown[] = [];
      const fakeHistory = {
        replaceState: (...args: unknown[]) => {
          replaces.push(args);
        },
      };
      const fakeWindow = {
        history: fakeHistory,
        location: { search: '', hash: '' },
      };
      const sandbox: Record<string, unknown> = {
        window: fakeWindow,
        URLSearchParams: globalThis.URLSearchParams,
      };
      const fn = new Function(...Object.keys(sandbox), script);
      fn(...Object.values(sandbox));
      expect(replaces).toHaveLength(0);
    });

    it('preserves the hash fragment when rewriting', () => {
      const script = extractInlineScript(INDEX_HTML);
      const replaces: Array<[unknown, string, string?]> = [];
      const fakeHistory = {
        replaceState: (state: unknown, title: string, url?: string) => {
          replaces.push([state, title, url]);
        },
      };
      const params = new URLSearchParams('?p=%2Fbrief');
      const fakeWindow = {
        history: fakeHistory,
        location: { search: params.toString(), hash: '#anchor' },
      };
      const sandbox: Record<string, unknown> = {
        window: fakeWindow,
        URLSearchParams: globalThis.URLSearchParams,
      };
      const fn = new Function(...Object.keys(sandbox), script);
      fn(...Object.values(sandbox));
      expect(replaces[0]?.[2]).toBe('/brief#anchor');
    });
  });
});
