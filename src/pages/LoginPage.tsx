import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { isEmail } from '@/lib/validation';

export function LoginPage() {
  const { t, login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!isEmail(email)) return setError('Enter a valid email address.');
    if (!password) return setError('Password is required.');
    try { setBusy(true); await login(email, password); navigate('/'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to log in.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={(event) => void submit(event)} className="stack"><div><h1>{t('login')}</h1><p className="muted">Use your account to access your reusable food lists.</p></div>
    <label>{t('email')}<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label>{t('password')}<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <button className="button" disabled={busy}>{busy ? t('loading') : t('login')}</button>
    <Link to="/auth/forgot">{t('forgotPassword')}</Link><p>{t('noAccount')} <Link to="/auth/register">{t('register')}</Link></p>
  </form>;
}
