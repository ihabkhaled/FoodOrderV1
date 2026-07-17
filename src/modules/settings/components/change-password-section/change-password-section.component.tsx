import type { SyntheticEvent } from 'react';

import { KeyRound } from '@/packages/icons';
import { PasswordField } from '@/shared/ui';

interface ChangePasswordSectionProps {
  heading: string;
  eyebrow: string;
  currentPasswordLabel: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  submitLabel: string;
  busyLabel: string;
  showLabel: string;
  hideLabel: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  error: string;
  busy: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: SyntheticEvent) => void;
}

export function ChangePasswordSection({
  heading,
  eyebrow,
  currentPasswordLabel,
  newPasswordLabel,
  confirmPasswordLabel,
  submitLabel,
  busyLabel,
  showLabel,
  hideLabel,
  currentPassword,
  newPassword,
  confirmPassword,
  error,
  busy,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: ChangePasswordSectionProps) {
  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{heading}</h2>
        </div>
      </div>
      <form className="stack" onSubmit={onSubmit}>
        <PasswordField
          id="settings-current-password"
          label={currentPasswordLabel}
          value={currentPassword}
          onChange={onCurrentPasswordChange}
          autoComplete="current-password"
          showLabel={showLabel}
          hideLabel={hideLabel}
        />
        <PasswordField
          id="settings-new-password"
          label={newPasswordLabel}
          value={newPassword}
          onChange={onNewPasswordChange}
          autoComplete="new-password"
          showLabel={showLabel}
          hideLabel={hideLabel}
        />
        <PasswordField
          id="settings-confirm-password"
          label={confirmPasswordLabel}
          value={confirmPassword}
          onChange={onConfirmPasswordChange}
          autoComplete="new-password"
          showLabel={showLabel}
          hideLabel={hideLabel}
        />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <button className="button secondary" disabled={busy}>
            <KeyRound />
            {busy ? busyLabel : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
