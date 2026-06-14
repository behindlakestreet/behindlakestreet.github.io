interface IntensitySliderProps {
  value: number;
  onChange: (next: number) => void;
  id?: string;
}

export function IntensitySlider({ value, onChange, id = 'intensity' }: IntensitySliderProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm text-muted mb-1">
        Intensiteit:{' '}
        <span data-testid="intensity-value" className="intensity-value">
          {value}
        </span>
        /10
      </label>
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
