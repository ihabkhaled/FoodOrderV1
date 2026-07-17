import { Link } from '@/packages/router';

import { useLogin } from '../hooks/use-login.hook';
import {
  FORGOT_PASSWORD_PATH,
  REGISTER_PATH,
} from '../routes/auth-route-paths.constants';

export function LoginContainer() {
  const vm = useLogin();

  return (
    <form onSubmit={(event) => void vm.submit(event)} className="stack">
      <div>
        <h1>{vm.t('login')}</h1>
        <p className="muted">{vm.t('loginIntro')}</p>
      </div>
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
      <label>
        {vm.t('password')}
        <input
          type="password"
          autoComplete="current-password"
          value={vm.password}
          onChange={(event) => {
            vm.setPassword(event.target.value);
          }}
        />
      </label>
      {vm.error ? (
        <p className="form-error" role="alert">
          {vm.error}
        </p>
      ) : null}
      <button className="button" disabled={vm.busy}>
        {vm.busy ? vm.t('loading') : vm.t('login')}
      </button>
      <Link to={FORGOT_PASSWORD_PATH}>{vm.t('forgotPassword')}</Link>
      <p>
        {vm.t('noAccount')} <Link to={REGISTER_PATH}>{vm.t('register')}</Link>
      </p>
    </form>
  );
}
