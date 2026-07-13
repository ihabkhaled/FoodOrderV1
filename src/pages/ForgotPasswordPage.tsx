import { type SyntheticEvent,useState } from 'react';
import { Link } from 'react-router-dom';

import { isEmail } from '@/lib/validation';
import { useApp } from '@/state/AppContext';
export function ForgotPasswordPage() {
  const { t, resetPassword } = useApp(); const [email, setEmail] = useState(''); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  const submit = async (e: SyntheticEvent) => { e.preventDefault(); setError(''); if (!isEmail(email)) { setError(t('enterValidEmail')); return; } try { await resetPassword(email); setDone(true); } catch (error_) { setError(error_ instanceof Error ? error_.message : t('tryAgain')); } };
  return <form className="stack" onSubmit={(e) => void submit(e)}><h1>{t('resetPassword')}</h1><p className="muted">{t('resetIntro')}</p><label>{t('email')}<input type="email" value={email} onChange={(e) => { setEmail(e.target.value); }} /></label>{error ? <p className="form-error">{error}</p> : null}{done ? <p className="success-message">{t('resetSent')}</p> : null}<button className="button">{t('resetPassword')}</button><Link to="/auth/login">{t('back')}</Link></form>;
}
