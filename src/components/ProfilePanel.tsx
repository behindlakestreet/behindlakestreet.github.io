import { useEffect, useState, type FormEvent } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { EMPTY_PROFILE, type Profile } from '@/types/domain';
import { isProfileEmpty, normalizeProfile } from '@/lib/repository/memoryProfileRepository';

const FIELDS_VERZOEKER: Array<{ key: keyof Profile['verzoeker']; label: string; type?: string }> = [
  { key: 'naam', label: 'Naam' },
  { key: 'adres', label: 'Adres' },
  { key: 'postcode', label: 'Postcode' },
  { key: 'plaats', label: 'Plaats' },
  { key: 'telefoon', label: 'Telefoon', type: 'tel' },
  { key: 'email', label: 'E-mail', type: 'email' },
];

const FIELDS_GEMEENTE: Array<{ key: keyof Profile['gemeente']; label: string }> = [
  { key: 'naam', label: 'Gemeente' },
  { key: 'postbus', label: 'Postbus' },
  { key: 'postcode', label: 'Postcode' },
  { key: 'plaats', label: 'Plaats' },
];

export function ProfilePanel() {
  const { profile, save, loading } = useProfile();
  const [draft, setDraft] = useState<Profile>(EMPTY_PROFILE);
  // Default open so the empty-state hint is visible. Once a profile
  // loads, collapse it so it doesn't get in the way. The user can
  // always toggle manually.
  const [expanded, setExpanded] = useState(true);
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (profile) {
      setDraft(profile);
      // Once a profile exists, auto-collapse (only once).
      if (!autoCollapsed) {
        setExpanded(false);
        setAutoCollapsed(true);
      }
    }
  }, [profile, autoCollapsed]);

  function onChangeVerzoeker<K extends keyof Profile['verzoeker']>(key: K, value: string) {
    setDraft((d) => ({ ...d, verzoeker: { ...d.verzoeker, [key]: value } }));
  }
  function onChangeGemeente<K extends keyof Profile['gemeente']>(key: K, value: string) {
    setDraft((d) => ({ ...d, gemeente: { ...d.gemeente, [key]: value } }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await save(normalizeProfile(draft));
    setSavedAt(Date.now());
  }

  const isEmpty = !loading && isProfileEmpty(profile);

  return (
    <section className="border border-border rounded-md mb-4">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full text-left px-3 py-2 bg-card flex items-center justify-between"
      >
        <span className="font-semibold">Profiel</span>
        <span className="text-muted text-sm">
          {isEmpty ? 'Vul je gegevens in' : savedAt ? 'Opgeslagen ✓' : 'Ingevuld'}
        </span>
      </button>
      {expanded ? (
        <form onSubmit={onSubmit} className="p-3 space-y-3">
          <fieldset>
            <legend className="text-sm text-muted mb-1">Verzoeker (jij)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FIELDS_VERZOEKER.map((f) => (
                <label key={f.key} className="text-sm">
                  <span className="block text-muted mb-0.5">{f.label}</span>
                  <input
                    type={f.type ?? 'text'}
                    value={draft.verzoeker[f.key]}
                    onChange={(e) => onChangeVerzoeker(f.key, e.target.value)}
                    className="w-full p-2 border border-border rounded-md text-base"
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm text-muted mb-1">Gemeente (ontvanger)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FIELDS_GEMEENTE.map((f) => (
                <label key={f.key} className="text-sm">
                  <span className="block text-muted mb-0.5">{f.label}</span>
                  <input
                    type="text"
                    value={draft.gemeente[f.key]}
                    onChange={(e) => onChangeGemeente(f.key, e.target.value)}
                    className="w-full p-2 border border-border rounded-md text-base"
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="bg-primary text-white border border-primary rounded-md px-3 py-1.5 text-sm hover:opacity-90"
            >
              Opslaan
            </button>
            {savedAt ? <span className="text-muted text-sm">Opgeslagen ✓</span> : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
