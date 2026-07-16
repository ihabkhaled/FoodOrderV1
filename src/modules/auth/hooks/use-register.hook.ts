import { type SyntheticEvent, useState } from 'react';

import { useApp } from '@/modules/session';
import { useNavigate } from '@/packages/router';
import { isEmail, validatePassword } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

import { POST_AUTH_REDIRECT_PATH } from '../routes/auth-route-paths.constants';

export interface RegisterViewModel {
  t: (key: MessageKey) => string;
  fullName: string;
  setFullName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string;
  busy: boolean;
  submit: (event: SyntheticEvent) => Promise<void>;
}

export function useRegister(): RegisterViewModel {
  const { t, register, errorMessage } = useApp();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    setError('');
    if (fullName.trim().length < 2) {
      setError(t('fullNameRequired'));
      return;
    }
    if (!isEmail(email)) {
      setError(t('enterValidEmail'));
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(t(passwordError));
      return;
    }
    try {
      setBusy(true);
      await register(fullName.trim(), email.trim().toLowerCase(), password);
      await navigate(POST_AUTH_REDIRECT_PATH);
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setBusy(false);
    }
  };

  return {
    t,
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    error,
    busy,
    submit,
  };
}
