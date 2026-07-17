import { Link } from '@/packages/router';

import { useForgotPassword } from '../hooks/use-forgot-password.hook';
import { LOGIN_PATH } from '../routes/auth-route-paths.constants';

export function ForgotPasswordContainer() {
  const vm = useForgotPassword();

  return (
    <form className="stack" onSubmit={(event) => void vm.submit(event)}>
      <h1>{vm.t('resetPassword')}</h1>
      <p className="muted">{vm.t('resetIntro')}</p>
      <label>
        {vm.t('email')}
        <input
          type="email"
          autoComplete="email"
          value={vm.email}
          onChange={(event) => {
            vm.setEmail(event.target.value);
          }}
        />
      </label>
      {vm.error ? (
        <p className="form-error" role="alert">
          {vm.error}
        </p>
      ) : null}
      {vm.done ? (
        <p className="success-message" role="status">
          {vm.confirmationMessage}
        </p>
      ) : null}
      <button className="button" disabled={vm.busy}>
        {vm.busy ? vm.t('loading') : vm.t('resetPassword')}
      </button>
      <Link to={LOGIN_PATH}>{vm.t('back')}</Link>
    </form>
  );
}
