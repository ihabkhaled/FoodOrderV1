import { type SyntheticEvent, useState } from 'react';

import { useApp } from '@/modules/session';
import { Link } from '@/packages/router';
import { isEmail } from '@/shared/helpers';

const resetConfirmation = (locale: 'en' | 'ar'): string =>
  locale === 'ar'
    ? 'إذا كان هناك حساب بهذا البريد، فستصلك رسالة إعادة تعيين كلمة المرور. افحص البريد غير المرغوب فيه أيضًا.'
    : 'If an account exists for this email, a password-reset message will arrive. Check your spam folder too.';

const firebaseRequired = (locale: 'en' | 'ar'): string =>
  locale === 'ar'
    ? 'إرسال رسائل إعادة تعيين كلمة المرور يحتاج إلى تفعيل Firebase في هذا الإصدار.'
    : 'Password-reset email requires Firebase to be configured for this build.';

export function ForgotPasswordPage() {
  const { t, resetPassword, errorMessage, locale, storageMode } = useApp();
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
      setError(firebaseRequired(locale));
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

  return (
    <form className="stack" onSubmit={(event) => void submit(event)}>
      <h1>{t('resetPassword')}</h1>
      <p className="muted">{t('resetIntro')}</p>
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
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="success-message" role="status">
          {resetConfirmation(locale)}
        </p>
      ) : null}
      <button className="button" disabled={busy}>
        {busy ? t('loading') : t('resetPassword')}
      </button>
      <Link to="/auth/login">{t('back')}</Link>
    </form>
  );
}
