import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { isEmail, validatePassword } from '@/lib/validation';

export function RegisterPage() {
  const { t, register } = useApp(); const navigate = useNavigate();
  const [fullName, setFullName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (fullName.trim().length < 2) return setError('Full name is required.');
    if (!isEmail(email)) return setError('Enter a valid email address.');
    const passwordError = validatePassword(password); if (passwordError) return setError(passwordError);
    try { setBusy(true); await register(fullName, email, password); navigate('/'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to register.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={(event) => void submit(event)} className="stack"><div><h1>{t('register')}</h1><p className="muted">Create buckets once and reuse them for every order.</p></div>
    <label>{t('fullName')}<input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} /></label>
    <label>{t('email')}<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label>{t('password')}<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <button className="button" disabled={busy}>{busy ? t('loading') : t('register')}</button><p>{t('haveAccount')} <Link to="/auth/login">{t('login')}</Link></p>
  </form>;
}
