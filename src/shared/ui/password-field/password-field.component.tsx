import { Eye, EyeOff } from '@/packages/icons';

interface PasswordFieldViewProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  autoComplete: string;
  required?: boolean | undefined;
  minLength?: number | undefined;
  /** Accessible name of the eye toggle for the CURRENT state. */
  toggleLabel: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}

/**
 * Presentational password input with an eye toggle. The toggle's accessible
 * name is visually hidden text (not `aria-label`) so label-based queries for
 * the field itself stay unambiguous.
 */
export function PasswordFieldView({
  id,
  label,
  value,
  visible,
  autoComplete,
  required,
  minLength,
  toggleLabel,
  onChange,
  onToggle,
}: PasswordFieldViewProps) {
  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
        <button type="button" className="icon-button password-toggle" onClick={onToggle}>
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          <span className="visually-hidden">{toggleLabel}</span>
        </button>
      </div>
    </div>
  );
}
