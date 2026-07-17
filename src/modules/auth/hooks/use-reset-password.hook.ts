import { type SyntheticEvent, useEffect, useState } from 'react';

import { authService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useNavigate, useSearchParams } from '@/packages/router';
import { validatePassword } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

import { LOGIN_PATH } from '../routes/auth-route-paths.constants';

export type ResetPasswordStatus = 'loading' | 'invalid' | 'ready';

export interface ResetPasswordViewModel {
  t: (key: MessageKey) => string;
  status: ResetPasswordStatus;
  /** Account email the verified reset code belongs to. */
  email: string;
  /** Translated reason shown when the link cannot be used. */
  invalidReason: string;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  error: string;
  busy: boolean;
  submit: (event: SyntheticEvent) => Promise<void>;
}

/**
 * Drives the in-app Firebase password-reset action page. The one-time code is
 * only VERIFIED on mount (never consumed); it is consumed on submit, so a
 * mail-scanner prefetching the link cannot invalidate it.
 */
export function useResetPassword(): ResetPasswordViewModel {
  const { t, errorMessage, showToast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode') ?? '';

  const [status, setStatus] = useState<ResetPasswordStatus>('loading');
  const [email, setEmail] = useState('');
  const [verifyError, setVerifyError] = useState<unknown>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== 'resetPassword' || !oobCode) {
      setStatus('invalid');
      return;
    }
    let cancelled = false;
    authService
      .verifyPasswordResetCode(oobCode)
      .then((accountEmail) => {
        if (cancelled) return;
        setEmail(accountEmail);
        setStatus('ready');
      })
      .catch((error_: unknown) => {
        if (cancelled) return;
        setVerifyError(error_);
        setStatus('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [mode, oobCode]);

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    setError('');
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
      await authService.confirmPasswordReset(oobCode, newPassword);
      showToast(t('passwordResetDone'), 'success');
      await navigate(LOGIN_PATH);
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setBusy(false);
    }
  };

  return {
    t,
    status,
    email,
    invalidReason: verifyError === null ? t('resetLinkInvalidBody') : errorMessage(verifyError),
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    busy,
    submit,
  };
}
