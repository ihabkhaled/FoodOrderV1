interface NumericFieldViewProps {
  id: string;
  label: string;
  draft: string;
  min: number;
  max: number | undefined;
  step: string;
  placeholder: string;
  disabled: boolean;
  onChange: (raw: string) => void;
  onBlur: () => void;
}

export function NumericFieldView({
  id,
  label,
  draft,
  min,
  max,
  step,
  placeholder,
  disabled,
  onChange,
  onBlur,
}: NumericFieldViewProps) {
  return (
    <label htmlFor={id}>
      {label}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onBlur={onBlur}
      />
    </label>
  );
}
