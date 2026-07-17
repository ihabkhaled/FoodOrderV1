import { type SyntheticEvent, useState } from 'react';

import { authService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { validatePassword } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

export interface ChangePasswordViewModel {
  t: (key: MessageKey) => string;
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  error: string;
  busy: boolean;
  submit: (event: SyntheticEvent) => Promise<void>;
}

/** Change password with the current one — works in Firebase AND local mode, no email involved. */
export function useChangePassword(): ChangePasswordViewModel {
  const { user, t, errorMessage, showToast } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    if (!user) return;
    setError('');
    if (!currentPassword) {
      setError(t('passwordRequired'));
      return;
    }
    const policyError = validatePassword(newPassword);
    if (policyError) {
      setError(t(policyError));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    try {
      setBusy(true);
      await authService.changePassword(user, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(t('passwordChanged'), 'success');
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setBusy(false);
    }
  };

  return {
    t,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    busy,
    submit,
  };
}
