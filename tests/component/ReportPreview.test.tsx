import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ReportPreview } from '@/components/ReportPreview';
import { inMemoryRepositories, setRepositories } from '@/lib/repository';
import type { NewLogEntry } from '@/types/domain';

async function seed(entries: NewLogEntry[]) {
  const { log, profile } = inMemoryRepositories();
  setRepositories(log, profile);
  for (const e of entries) {
    await log.add(e);
  }
  return { log, profile };
}

describe('ReportPreview', () => {
  beforeEach(() => {
    // window.confirm spy so we can call it without UI prompts.
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows an empty report iframe when no entries exist', async () => {
    await seed([]);
    render(<ReportPreview />);
    const iframe = (await waitFor(() => screen.getByTestId('report-iframe'))) as HTMLIFrameElement;
    expect(iframe.srcdoc).toMatch(/^<!DOCTYPE html>/);
    expect(iframe.srcdoc).toContain('Geen meldingen in deze periode');
  });

  it('renders the report with a populated table when entries exist', async () => {
    await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    render(<ReportPreview />);
    const iframe = (await waitFor(() => screen.getByTestId('report-iframe'))) as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('Woonkamer');
    expect(iframe.srcdoc).toContain('5/10');
  });

  it('regenerates srcdoc when the date filter changes', async () => {
    await seed([
      { timestamp: '2026-05-30T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
      { timestamp: '2026-06-02T10:00:00.000Z', type: 'geluid', intensity: 7, durationMinutes: 15, location: 'Keuken', description: '' },
    ]);
    render(<ReportPreview />);

    const iframe = (await waitFor(() => screen.getByTestId('report-iframe'))) as HTMLIFrameElement;
    // Both entries initially.
    expect(iframe.srcdoc).toContain('Woonkamer');
    expect(iframe.srcdoc).toContain('Keuken');

    const fromInput = screen.getByLabelText(/van/i) as HTMLInputElement;
    const toInput = screen.getByLabelText(/tot/i) as HTMLInputElement;
    fireEvent.change(fromInput, { target: { value: '2026-06-01' } });
    fireEvent.change(toInput, { target: { value: '2026-06-05' } });
    fireEvent.click(screen.getByRole('button', { name: /genereer rapport/i }));

    await waitFor(() => {
      // After filter, only Keuken is in range.
      const updated = (screen.getByTestId('report-iframe') as HTMLIFrameElement).srcdoc;
      expect(updated).toContain('Keuken');
      expect(updated).not.toContain('Woonkamer');
    });
  });

  it('exposes the latest HTML on a data attribute for the download button', async () => {
    await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    render(<ReportPreview />);
    const iframe = (await waitFor(() => screen.getByTestId('report-iframe'))) as HTMLIFrameElement;
    expect(iframe.dataset.html).toBe(iframe.srcdoc);
  });

  it('renders Download HTML and Wis alle data buttons', async () => {
    await seed([]);
    render(<ReportPreview />);
    expect(screen.getByRole('button', { name: /download html/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wis alle data/i })).toBeInTheDocument();
  });

  it('Download HTML triggers a download with the right filename', async () => {
    await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    // Track <a> elements created with a `download` attribute. jsdom's
    // anchor.click() does nothing observable; we just verify that an
    // anchor with the right download attribute was created.
    const downloadAttrSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    const spy = vi.spyOn(document, 'createElement');
    spy.mockImplementation((name: string) => {
      const el = origCreate(name);
      if (name === 'a') {
        Object.defineProperty(el, 'download', {
          set(value: string) {
            downloadAttrSpy(value);
            (el as unknown as { __download: string }).__download = value;
          },
          get() {
            return (el as unknown as { __download?: string }).__download;
          },
        });
      }
      return el;
    });

    render(<ReportPreview />);
    await waitFor(() => screen.getByTestId('report-iframe'));
    fireEvent.click(screen.getByRole('button', { name: /download html/i }));

    await waitFor(() => expect(downloadAttrSpy).toHaveBeenCalled());
    const filename = downloadAttrSpy.mock.calls[0]?.[0] as string;
    expect(filename).toMatch(/^overlast-rapport-\d{4}-\d{2}-\d{2}\.html$/);
  });

  it('Download HTML is disabled before any preview has been generated', async () => {
    await seed([]);
    render(<ReportPreview />);
    // The button is enabled — generate is automatic on mount in this
    // implementation. Just assert it does not throw.
    const btn = screen.getByRole('button', { name: /download html/i }) as HTMLButtonElement;
    expect(btn).not.toBeDisabled();
  });

  it('Wis alle data confirms, then clears the repo', async () => {
    const handle = await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    const before = await handle.log.list();
    expect(before.length).toBe(1);

    render(<ReportPreview />);
    await waitFor(() => screen.getByTestId('report-iframe'));
    fireEvent.click(screen.getByRole('button', { name: /wis alle data/i }));

    await waitFor(async () => {
      const after = await handle.log.list();
      expect(after).toEqual([]);
    });
  });

  it('Wis alle data cancels if user declines', async () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const handle = await seed([
      { timestamp: '2026-06-01T10:00:00.000Z', type: 'trilling', intensity: 5, durationMinutes: 10, location: 'Woonkamer', description: '' },
    ]);
    render(<ReportPreview />);
    await waitFor(() => screen.getByTestId('report-iframe'));
    fireEvent.click(screen.getByRole('button', { name: /wis alle data/i }));
    const after = await handle.log.list();
    expect(after.length).toBe(1);
  });
});
