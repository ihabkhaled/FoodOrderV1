import type { SyntheticEvent } from 'react';

import { DangerReauthDialogView } from './danger-reauth-dialog.component';
import { useDangerReauthDialog } from './use-danger-reauth-dialog.hook';

export function DangerReauthDialog({
  open,
  title,
  warning,
  emailLabel,
  passwordLabel,
  confirmLabel,
  cancelLabel,
  showPasswordLabel,
  hidePasswordLabel,
  errorMessage,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  warning: string;
  emailLabel: string;
  passwordLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  showPasswordLabel: string;
  hidePasswordLabel: string;
  errorMessage: string | null;
  busy: boolean;
  onConfirm: (email: string, password: string) => void;
  onCancel: () => void;
}) {
  const state = useDangerReauthDialog(open);

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    if (!state.email.trim() || !state.password) return;
    onConfirm(state.email, state.password);
  };

  return (
    <DangerReauthDialogView
      dialogRef={state.dialogRef}
      title={title}
      warning={warning}
      emailLabel={emailLabel}
      passwordLabel={passwordLabel}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      showPasswordLabel={showPasswordLabel}
      hidePasswordLabel={hidePasswordLabel}
      email={state.email}
      password={state.password}
      errorMessage={errorMessage}
      busy={busy}
      canConfirm={Boolean(state.email.trim()) && state.password.length > 0}
      onEmailChange={state.setEmail}
      onPasswordChange={state.setPassword}
      onSubmit={submit}
      onCancel={onCancel}
    />
  );
}
