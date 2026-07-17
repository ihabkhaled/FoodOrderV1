import { PasswordFieldView } from './password-field.component';
import { usePasswordField } from './use-password-field.hook';

interface PasswordFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly autoComplete: 'current-password' | 'new-password';
  readonly required?: boolean;
  readonly minLength?: number;
  /** Localized copy is passed in: shared UI never reads i18n context itself. */
  readonly showLabel: string;
  readonly hideLabel: string;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  showLabel,
  hideLabel,
}: PasswordFieldProps) {
  const { visible, toggle } = usePasswordField();
  return (
    <PasswordFieldView
      id={id}
      label={label}
      value={value}
      visible={visible}
      autoComplete={autoComplete}
      required={required}
      minLength={minLength}
      toggleLabel={visible ? hideLabel : showLabel}
      onChange={onChange}
      onToggle={toggle}
    />
  );
}
