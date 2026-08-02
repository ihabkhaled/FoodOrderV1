import { NumericFieldView } from './numeric-field.component';
import { useNumericField } from './use-numeric-field.hook';

export function NumericField({
  id,
  label,
  value,
  onValueChange,
  min = 0,
  max,
  step = '0.01',
  placeholder = '0',
  disabled = false,
}: {
  id: string;
  label: string;
  value: number;
  onValueChange: (next: number) => void;
  min?: number;
  max?: number | undefined;
  step?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const viewModel = useNumericField(value, onValueChange, min, max);
  return (
    <NumericFieldView
      id={id}
      label={label}
      draft={viewModel.draft}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      onChange={viewModel.handleChange}
      onBlur={viewModel.handleBlur}
    />
  );
}
