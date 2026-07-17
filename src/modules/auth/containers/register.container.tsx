import { Link } from '@/packages/router';
import { PasswordField } from '@/shared/ui';

import { useRegister } from '../hooks/use-register.hook';
import { LOGIN_PATH } from '../routes/auth-route-paths.constants';

export function RegisterContainer() {
  const vm = useRegister();

  return (
    <form onSubmit={(event) => void vm.submit(event)} className="stack">
      <div>
        <h1>{vm.t('register')}</h1>
        <p className="muted">{vm.t('registerIntro')}</p>
      </div>
      <label>
        {vm.t('fullName')}
        <input
          autoComplete="name"
          value={vm.fullName}
          onChange={(event) => {
            vm.setFullName(event.target.value);
          }}
          maxLength={80}
        />
      </label>
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
      <PasswordField
        id="register-password"
        label={vm.t('password')}
        value={vm.password}
        onChange={vm.setPassword}
        autoComplete="new-password"
        showLabel={vm.t('showPassword')}
        hideLabel={vm.t('hidePassword')}
      />
      {vm.error ? (
        <p className="form-error" role="alert">
          {vm.error}
        </p>
      ) : null}
      <button className="button" disabled={vm.busy}>
        {vm.busy ? vm.t('loading') : vm.t('register')}
      </button>
      <p>
        {vm.t('haveAccount')} <Link to={LOGIN_PATH}>{vm.t('login')}</Link>
      </p>
    </form>
  );
}
