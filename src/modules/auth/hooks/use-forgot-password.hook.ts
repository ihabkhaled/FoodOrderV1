import { type SyntheticEvent, useState } from 'react';

import { useApp } from '@/modules/session';
import { isEmail } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

export interface ForgotPasswordViewModel {
  t: (key: MessageKey) => string;
  email: string;
  setEmail: (value: string) => void;
  error: string;
  done: boolean;
  busy: boolean;
  confirmationMessage: string;
  submit: (event: SyntheticEvent) => Promise<void>;
}

export function useForgotPassword(): ForgotPasswordViewModel {
  const { t, resetPassword, errorMessage, storageMode } = useApp();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    setError('');
    setDone(false);
    if (!isEmail(email)) {
      setError(t('enterValidEmail'));
      return;
    }
    if (storageMode !== 'firebase') {
      setError(t('firebaseRequired'));
      return;
    }
    try {
      setBusy(true);
      await resetPassword(email.trim().toLowerCase());
      setDone(true);
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setBusy(false);
    }
  };

  return {
    t,
    email,
    setEmail,
    error,
    done,
    busy,
    confirmationMessage: t('resetConfirmation'),
    submit,
  };
}
