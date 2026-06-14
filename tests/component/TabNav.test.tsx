import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TabNav } from '@/components/TabNav';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TabNav />
    </MemoryRouter>,
  );
}

describe('TabNav', () => {
  it('renders all four tabs with Dutch labels', () => {
    renderAt('/log');
    expect(screen.getByRole('tab', { name: 'Log' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Geschiedenis' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rapport' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Brief' })).toBeInTheDocument();
  });

  it('marks the tab matching the current route as active', () => {
    renderAt('/rapport');
    const rapportTab = screen.getByRole('tab', { name: 'Rapport' });
    expect(rapportTab).toHaveClass('active');
    expect(rapportTab).toHaveAttribute('aria-current', 'page');

    const logTab = screen.getByRole('tab', { name: 'Log' });
    expect(logTab).not.toHaveClass('active');
    expect(logTab).not.toHaveAttribute('aria-current', 'page');
  });

  it('navigates when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/log');
    await user.click(screen.getByRole('tab', { name: 'Geschiedenis' }));
    // After click, the Geschiedenis tab is the active one.
    expect(screen.getByRole('tab', { name: 'Geschiedenis' })).toHaveClass('active');
  });

  it('uses tablist role for the container and tab role for the items', () => {
    renderAt('/log');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
