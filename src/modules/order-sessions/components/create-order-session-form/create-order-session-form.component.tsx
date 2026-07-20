import type { SyntheticEvent } from 'react';

interface CreateOrderSessionFormProps {
  titleLabel: string;
  deadlineLabel: string;
  timezoneLabel: string;
  autoLockLabel: string;
  submitLabel: string;
  savingLabel: string;
  title: string;
  deadline: string;
  timezone: string;
  autoLock: boolean;
  saving: boolean;
  error: string;
  onTitleChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onAutoLockChange: (value: boolean) => void;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
}

export function CreateOrderSessionForm({
  titleLabel,
  deadlineLabel,
  timezoneLabel,
  autoLockLabel,
  submitLabel,
  savingLabel,
  title,
  deadline,
  timezone,
  autoLock,
  saving,
  error,
  onTitleChange,
  onDeadlineChange,
  onTimezoneChange,
  onAutoLockChange,
  onSubmit,
}: CreateOrderSessionFormProps) {
  return (
    <form className="section-card form-grid" onSubmit={onSubmit}>
      <label className="form-field-wide">
        {titleLabel}
        <input
          value={title}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => {
            onTitleChange(event.target.value);
          }}
        />
      </label>
      <label>
        {deadlineLabel}
        <input
          type="datetime-local"
          value={deadline}
          onChange={(event) => {
            onDeadlineChange(event.target.value);
          }}
        />
      </label>
      <label>
        {timezoneLabel}
        <input
          value={timezone}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => {
            onTimezoneChange(event.target.value);
          }}
        />
      </label>
      <label className="choice-card form-field-wide">
        <input
          type="checkbox"
          checked={autoLock}
          onChange={(event) => {
            onAutoLockChange(event.target.checked);
          }}
        />
        <span>{autoLockLabel}</span>
      </label>
      {error ? (
        <p className="form-error form-field-wide" role="alert">
          {error}
        </p>
      ) : null}
      <div className="sticky-actions form-field-wide">
        <button className="button" disabled={saving}>
          {saving ? savingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
