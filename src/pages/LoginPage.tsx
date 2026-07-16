import { type SyntheticEvent, useState } from 'react';

import { useApp } from '@/modules/session';
import { Link, useNavigate } from '@/packages/router';
import { isEmail } from '@/shared/helpers';

export function LoginPage() {
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
      await navigate('/');
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="stack">
      <div>
        <h1>{t('login')}</h1>
        <p className="muted">{t('loginIntro')}</p>
      </div>
      <label>
        {t('email')}
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
      </label>
      <label>
        {t('password')}
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button" disabled={busy}>
        {busy ? t('loading') : t('login')}
      </button>
      <Link to="/auth/forgot">{t('forgotPassword')}</Link>
      <p>
        {t('noAccount')} <Link to="/auth/register">{t('register')}</Link>
      </p>
    </form>
  );
}
