import { Link } from '@/packages/router';
import { Loading, PasswordField } from '@/shared/ui';

import { useResetPassword } from '../hooks/use-reset-password.hook';
import { FORGOT_PASSWORD_PATH } from '../routes/auth-route-paths.constants';

export function ResetPasswordContainer() {
  const vm = useResetPassword();

  if (vm.status === 'loading') return <Loading label={vm.t('loading')} />;

  if (vm.status === 'invalid') {
    return (
      <div className="stack">
        <h1>{vm.t('resetLinkInvalidTitle')}</h1>
        <p className="form-error" role="alert">
          {vm.invalidReason}
        </p>
        <Link to={FORGOT_PASSWORD_PATH}>{vm.t('requestNewResetLink')}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void vm.submit(event)} className="stack">
      <div>
        <h1>{vm.t('resetPasswordTitle')}</h1>
        <p className="muted">
          {vm.t('resetPasswordFor')} <strong>{vm.email}</strong>
        </p>
      </div>
      <PasswordField
        id="reset-new-password"
        label={vm.t('newPassword')}
        value={vm.newPassword}
        onChange={vm.setNewPassword}
        autoComplete="new-password"
        showLabel={vm.t('showPassword')}
        hideLabel={vm.t('hidePassword')}
      />
      <PasswordField
        id="reset-confirm-password"
        label={vm.t('confirmNewPassword')}
        value={vm.confirmPassword}
        onChange={vm.setConfirmPassword}
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
        {vm.busy ? vm.t('loading') : vm.t('resetPassword')}
      </button>
    </form>
  );
}
