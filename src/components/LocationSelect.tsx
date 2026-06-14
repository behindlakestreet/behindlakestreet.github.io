import { LOCATIONS } from '@/types/domain';

interface LocationSelectProps {
  value: string;
  onChange: (next: string) => void;
  id?: string;
}

export function LocationSelect({ value, onChange, id = 'location' }: LocationSelectProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm text-muted mb-1">
        Locatie in huis
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-border rounded-md text-base"
      >
        {LOCATIONS.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
    </div>
  );
}
