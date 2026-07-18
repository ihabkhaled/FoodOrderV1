import { type SyntheticEvent, useState } from 'react';

import { useApp } from '@/modules/session';
import { useNavigate, useSearchParams } from '@/packages/router';
import { isEmail, validatePassword } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

import {
  buildAuthPathWithReturnTo,
  resolvePostAuthRedirect,
  RETURN_TO_QUERY_PARAMETER,
} from '../helpers/post-auth-redirect.helper';
import {
  LOGIN_PATH,
  POST_AUTH_REDIRECT_PATH,
} from '../routes/auth-route-paths.constants';

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
  loginPath: string;
  submit: (event: SyntheticEvent) => Promise<void>;
}

export function useRegister(): RegisterViewModel {
  const { t, register, errorMessage } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = resolvePostAuthRedirect(
    searchParams.get(RETURN_TO_QUERY_PARAMETER),
  );
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
      await navigate(returnTo || POST_AUTH_REDIRECT_PATH);
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
    loginPath: buildAuthPathWithReturnTo(LOGIN_PATH, returnTo),
    submit,
  };
}
