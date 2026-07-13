import { type SyntheticEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { isEmail, validatePassword } from '@/lib/validation';
import { useApp } from '@/state/AppContext';

export function RegisterPage() {
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
        <h1>{t('register')}</h1>
        <p className="muted">{t('registerIntro')}</p>
      </div>
      <label>
        {t('fullName')}
        <input
          autoComplete="name"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
          }}
          maxLength={80}
        />
      </label>
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
          autoComplete="new-password"
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
        {busy ? t('loading') : t('register')}
      </button>
      <p>
        {t('haveAccount')} <Link to="/auth/login">{t('login')}</Link>
      </p>
    </form>
  );
}
