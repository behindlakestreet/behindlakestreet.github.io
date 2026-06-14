import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogForm } from '@/components/LogForm';
import { inMemoryRepositories, setRepositories } from '@/lib/repository';

describe('LogForm', () => {
  beforeEach(() => {
    setRepositories(...Object.values(inMemoryRepositories()));
    // Pin the clock so createdAt is deterministic. The default
    // memoryRepository uses `new Date()` which is fine for these tests.
  });

  it('renders all the fields from the reference form', () => {
    render(<LogForm />);
    expect(screen.getByRole('radio', { name: /trilling/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /geluid/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /beide/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/intensiteit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/duur/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/locatie/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/omschrijving/i)).toBeInTheDocument();
  });

  it('intensity slider live-updates the displayed value', async () => {
    render(<LogForm />);
    const slider = screen.getByLabelText(/intensiteit/i) as HTMLInputElement;
    expect(screen.getByText('5')).toBeInTheDocument(); // default
    fireEvent.change(slider, { target: { value: '8' } });
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('location select uses the fixed Dutch list', () => {
    render(<LogForm />);
    const select = screen.getByLabelText(/locatie/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
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

  it('submitting calls the repository with the form data', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<LogForm onSaved={onSaved} />);

    // Change intensity to 7 (range input → use change event).
    const slider = screen.getByLabelText(/intensiteit/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '7' } });

    // Change duration to 15.
    const duration = screen.getByLabelText(/duur/i) as HTMLInputElement;
    fireEvent.change(duration, { target: { value: '15' } });

    // Pick Geluid.
    await user.click(screen.getByRole('radio', { name: /geluid/i }));

    // Pick a location.
    await user.selectOptions(screen.getByLabelText(/locatie/i), 'Keuken');

    // Description.
    await user.type(screen.getByLabelText(/omschrijving/i), 'heel veel lawaai');

    // Submit.
    await user.click(screen.getByRole('button', { name: /opslaan/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const saved = onSaved.mock.calls[0]?.[0];
    expect(saved).toMatchObject({
      type: 'geluid',
      intensity: 7,
      durationMinutes: 15,
      location: 'Keuken',
      description: 'heel veel lawaai',
    });
    expect(saved.id).toBeTypeOf('string');
    expect(saved.createdAt).toBeTypeOf('string');
  });

  it('flashes "Opgeslagen ✓" on the submit button and disables it briefly', async () => {
    const user = userEvent.setup();
    render(<LogForm />);
    const submit = screen.getByRole('button', { name: /opslaan/i });
    await user.click(submit);
    expect(submit).toBeDisabled();
    expect(submit.textContent).toMatch(/opgeslagen/i);
    await waitFor(
      () => {
        expect(submit).not.toBeDisabled();
      },
      { timeout: 3000 },
    );
  });

  it('clears the description after a successful submit', async () => {
    const user = userEvent.setup();
    render(<LogForm />);
    const desc = screen.getByLabelText(/omschrijving/i) as HTMLTextAreaElement;
    await user.type(desc, 'iets');
    await user.click(screen.getByRole('button', { name: /opslaan/i }));
    await waitFor(() => expect(desc.value).toBe(''));
  });

  it('validates intensity within 1..10', () => {
    render(<LogForm />);
    const slider = screen.getByLabelText(/intensiteit/i) as HTMLInputElement;
    expect(slider.min).toBe('1');
    expect(slider.max).toBe('10');
  });

  it('validates duration >= 1', () => {
    render(<LogForm />);
    const duration = screen.getByLabelText(/duur/i) as HTMLInputElement;
    expect(duration.min).toBe('1');
  });
});
