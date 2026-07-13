import { useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { isEmail } from '@/lib/validation';

export function LoginPage() {
  const { t, login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: SyntheticEvent) => {
    event.preventDefault(); setError('');
    if (!isEmail(email)) { setError(t('enterValidEmail')); return; }
    if (!password) { setError(t('passwordRequired')); return; }
    try { setBusy(true); await login(email, password); await navigate('/'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('tryAgain')); }
    finally { setBusy(false); }
  };
  return <form onSubmit={(event) => void submit(event)} className="stack"><div><h1>{t('login')}</h1><p className="muted">{t('loginIntro')}</p></div>
    <label>{t('email')}<input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); }} /></label>
    <label>{t('password')}<input type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); }} /></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <button className="button" disabled={busy}>{busy ? t('loading') : t('login')}</button>
    <Link to="/auth/forgot">{t('forgotPassword')}</Link><p>{t('noAccount')} <Link to="/auth/register">{t('register')}</Link></p>
  </form>;
}
