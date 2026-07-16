import { type SyntheticEvent, useState } from 'react';

import { useApp } from '@/modules/session';
import { useNavigate } from '@/packages/router';
import { isEmail } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

import { POST_AUTH_REDIRECT_PATH } from '../routes/auth-route-paths.constants';

export interface LoginViewModel {
  t: (key: MessageKey) => string;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string;
  busy: boolean;
  submit: (event: SyntheticEvent) => Promise<void>;
}

export function useLogin(): LoginViewModel {
  const { t, login, errorMessage } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    setError('');
    if (!isEmail(email)) {
      setError(t('enterValidEmail'));
      return;
    }
    if (!password) {
      setError(t('passwordRequired'));
      return;
    }
    try {
      setBusy(true);
      await login(email.trim().toLowerCase(), password);
      await navigate(POST_AUTH_REDIRECT_PATH);
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setBusy(false);
    }
  };

  return { t, email, setEmail, password, setPassword, error, busy, submit };
}
