import type { RefObject, SyntheticEvent } from 'react';

import { LoaderCircle } from '@/packages/icons';

import { PasswordField } from '../password-field/password-field.container';

interface DangerReauthDialogViewProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  title: string;
  warning: string;
  emailLabel: string;
  passwordLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  showPasswordLabel: string;
  hidePasswordLabel: string;
  email: string;
  password: string;
  errorMessage: string | null;
  busy: boolean;
  canConfirm: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: SyntheticEvent) => void;
  onCancel: () => void;
}

export function DangerReauthDialogView({
  dialogRef,
  title,
  warning,
  emailLabel,
  passwordLabel,
  confirmLabel,
  cancelLabel,
  showPasswordLabel,
  hidePasswordLabel,
  email,
  password,
  errorMessage,
  busy,
  canConfirm,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onCancel,
}: DangerReauthDialogViewProps) {
  return (
    <dialog ref={dialogRef} onCancel={onCancel} className="dialog">
      <h2>{title}</h2>
      <p className="muted">{warning}</p>
      <form className="stack" onSubmit={onSubmit}>
        <label htmlFor="danger-reauth-email">
          {emailLabel}
          <input
            id="danger-reauth-email"
            type="email"
            value={email}
            autoComplete="email"
            required
            disabled={busy}
            onChange={(event) => {
              onEmailChange(event.target.value);
            }}
          />
        </label>
        <PasswordField
          id="danger-reauth-password"
          label={passwordLabel}
          value={password}
          autoComplete="current-password"
          required
          showLabel={showPasswordLabel}
          hideLabel={hidePasswordLabel}
          onChange={onPasswordChange}
        />
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="button danger"
            disabled={busy || !canConfirm}
            aria-busy={busy}
          >
            {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
