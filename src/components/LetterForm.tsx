import { useMemo } from 'react';
import type { LetterCaseInput } from '@/lib/letter/template';

interface LetterFormProps {
  value: LetterCaseInput;
  onChange: (next: LetterCaseInput) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LetterForm({ value, onChange }: LetterFormProps) {
  const datum = useMemo(() => (value.datumBrief ? value.datumBrief : todayIso()), [value.datumBrief]);

  function patch(p: Partial<LetterCaseInput>) {
    onChange({ ...value, ...p });
  }
  function patchOmschrijving(idx: number, v: string) {
    const next = value.omschrijvingen.slice();
    while (next.length < 5) next.push('');
    next[idx] = v;
    onChange({ ...value, omschrijvingen: next });
  }

  return (
    <form className="space-y-3 mb-4" onSubmit={(e) => e.preventDefault()}>
      <div>
        <label className="block text-sm text-muted mb-0.5" htmlFor="adres-bron">
          Adres van de geluidsbron of nabijheid-aanduiding
        </label>
        <input
          id="adres-bron"
          type="text"
          value={value.adresBron}
          onChange={(e) => patch({ adresBron: e.target.value })}
          className="w-full p-2 border border-border rounded-md text-base"
        />
      </div>
      <div>
        <label className="block text-sm text-muted mb-0.5" htmlFor="periode">
          Periode-omschrijving
        </label>
        <input
          id="periode"
          type="text"
          value={value.periodeOmschrijving}
          onChange={(e) => patch({ periodeOmschrijving: e.target.value })}
          placeholder='bijv. "sinds circa 1 mei 2026"'
          className="w-full p-2 border border-border rounded-md text-base"
        />
      </div>
      <fieldset>
        <legend className="text-sm text-muted mb-1">
          Korte omschrijvingen (max 5)
        </legend>
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i}>
              <label
                className="block text-xs text-muted mb-0.5"
                htmlFor={`omschrijving-${i}`}
              >
                Omschrijving {i + 1}
              </label>
              <textarea
                id={`omschrijving-${i}`}
                rows={2}
                value={value.omschrijvingen[i] ?? ''}
                onChange={(e) => patchOmschrijving(i, e.target.value)}
                className="w-full p-2 border border-border rounded-md text-base"
              />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm text-muted mb-0.5" htmlFor="frequentie">
            Frequentie
          </label>
          <input
            id="frequentie"
            type="text"
            value={value.frequentie}
            onChange={(e) => patch({ frequentie: e.target.value })}
            placeholder='bijv. "dagelijks"'
            className="w-full p-2 border border-border rounded-md text-base"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-0.5" htmlFor="duur-per-keer">
            Duur per keer
          </label>
          <input
            id="duur-per-keer"
            type="text"
            value={value.duurPerKeer}
            onChange={(e) => patch({ duurPerKeer: e.target.value })}
            placeholder='bijv. "tussen 22:00 en 02:00 uur"'
            className="w-full p-2 border border-border rounded-md text-base"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-muted mb-0.5" htmlFor="datum-brief">
          Datum brief
        </label>
        <input
          id="datum-brief"
          type="date"
          value={datum}
          onChange={(e) => patch({ datumBrief: e.target.value })}
          className="p-2 border border-border rounded-md text-base"
        />
      </div>
    </form>
  );
}
