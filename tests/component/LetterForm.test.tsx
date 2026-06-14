import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LetterForm } from '@/components/LetterForm';
import { inMemoryRepositories, setRepositories } from '@/lib/repository';
import type { LetterCaseInput } from '@/lib/letter/template';

const SAMPLE: LetterCaseInput = {
  adresBron: 'het bouwterrein aan de Achterstraat 12',
  periodeOmschrijving: 'sinds circa 1 mei 2026',
  omschrijvingen: [
    'voortdurend gebonk in de avonduren',
    'bouwwerkzaamheden op werkdagen vóór 07:00 en ná 19:00',
  ],
  frequentie: 'dagelijks',
  duurPerKeer: 'tussen 22:00 en 02:00 uur',
  datumBrief: '2026-06-12',
};

describe('LetterForm', () => {
  it('renders all 5 omschrijvingen slots', () => {
    setRepositories(...Object.values(inMemoryRepositories()));
    render(<LetterForm value={SAMPLE} onChange={() => undefined} />);
    expect(screen.getByLabelText(/omschrijving 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/omschrijving 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/omschrijving 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/omschrijving 4/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/omschrijving 5/i)).toBeInTheDocument();
  });

  it('renders the adres bron, periode, frequentie, duur, datum fields', () => {
    setRepositories(...Object.values(inMemoryRepositories()));
    render(<LetterForm value={SAMPLE} onChange={() => undefined} />);
    expect(screen.getByLabelText(/adres van de geluidsbron/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/periode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/frequentie/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/duur per keer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/datum brief/i)).toBeInTheDocument();
  });

  it('initial value renders in the form fields', () => {
    setRepositories(...Object.values(inMemoryRepositories()));
    render(<LetterForm value={SAMPLE} onChange={() => undefined} />);
    expect(
      (screen.getByLabelText(/adres van de geluidsbron/i) as HTMLInputElement).value,
    ).toBe(SAMPLE.adresBron);
    expect(
      (screen.getByLabelText(/periode/i) as HTMLInputElement).value,
    ).toBe(SAMPLE.periodeOmschrijving);
  });

  it('typing in any field calls onChange with the new value', async () => {
    const onChange = vi.fn();
    setRepositories(...Object.values(inMemoryRepositories()));
    render(<LetterForm value={SAMPLE} onChange={onChange} />);

    const adres = screen.getByLabelText(/adres van de geluidsbron/i) as HTMLInputElement;
    fireEvent.change(adres, { target: { value: 'nieuwe locatie' } });
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as LetterCaseInput;
    expect(lastCall.adresBron).toBe('nieuwe locatie');
  });

  it('adds an omschrijving when the user types in slot 3', () => {
    const onChange = vi.fn();
    setRepositories(...Object.values(inMemoryRepositories()));
    render(<LetterForm value={SAMPLE} onChange={onChange} />);
    const o3 = screen.getByLabelText(/omschrijving 3/i) as HTMLTextAreaElement;
    fireEvent.change(o3, { target: { value: 'een derde klacht' } });
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as LetterCaseInput;
    expect(lastCall.omschrijvingen[2]).toBe('een derde klacht');
  });

  it('datum defaults to today when value.datumBrief is empty', () => {
    setRepositories(...Object.values(inMemoryRepositories()));
    const today = new Date().toISOString().slice(0, 10);
    render(<LetterForm value={{ ...SAMPLE, datumBrief: '' }} onChange={() => undefined} />);
    const datum = screen.getByLabelText(/datum brief/i) as HTMLInputElement;
    expect(datum.value).toBe(today);
  });

  it('preserves the user-provided datum when set', () => {
    setRepositories(...Object.values(inMemoryRepositories()));
    render(<LetterForm value={SAMPLE} onChange={() => undefined} />);
    const datum = screen.getByLabelText(/datum brief/i) as HTMLInputElement;
    expect(datum.value).toBe('2026-06-12');
  });

  it('rendering does not persist form state — it stays in the parent (controlled)', async () => {
    const onChange = vi.fn();
    setRepositories(...Object.values(inMemoryRepositories()));
    const { rerender } = render(<LetterForm value={SAMPLE} onChange={onChange} />);

    const o1 = screen.getByLabelText(/omschrijving 1/i) as HTMLTextAreaElement;
    const user = userEvent.setup();
    await user.clear(o1);
    await user.type(o1, 'X');

    // After rerender with the original SAMPLE, the input is back to
    // SAMPLE's value — the form is fully controlled.
    rerender(<LetterForm value={SAMPLE} onChange={onChange} />);
    await waitFor(() => {
      expect((screen.getByLabelText(/omschrijving 1/i) as HTMLTextAreaElement).value).toBe(
        SAMPLE.omschrijvingen[0],
      );
    });
  });
});
