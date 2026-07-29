import '../settings.css';

import { BackLink } from '@/shared/ui';

import { ChangePasswordSection } from '../components/change-password-section/change-password-section.component';
import { useChangePassword } from '../hooks/use-change-password.hook';
import { SETTINGS_PATH } from '../routes/settings-route-paths.constants';

export function SettingsSecurityContainer() {
  const passwordVm = useChangePassword();

  return (
    <div className="page narrow stack-lg">
      <div className="page-heading">
        <div>
          <BackLink fallback={SETTINGS_PATH} label={passwordVm.t('back')} />
          <h1>{passwordVm.t('changePassword')}</h1>
        </div>
      </div>
      <ChangePasswordSection
        heading={passwordVm.t('changePassword')}
        eyebrow={passwordVm.t('profile')}
        currentPasswordLabel={passwordVm.t('currentPassword')}
        newPasswordLabel={passwordVm.t('newPassword')}
        confirmPasswordLabel={passwordVm.t('confirmNewPassword')}
        submitLabel={passwordVm.t('changePassword')}
        busyLabel={passwordVm.t('loading')}
        showLabel={passwordVm.t('showPassword')}
        hideLabel={passwordVm.t('hidePassword')}
        currentPassword={passwordVm.currentPassword}
        newPassword={passwordVm.newPassword}
        confirmPassword={passwordVm.confirmPassword}
        error={passwordVm.error}
        busy={passwordVm.busy}
        onCurrentPasswordChange={passwordVm.setCurrentPassword}
        onNewPasswordChange={passwordVm.setNewPassword}
        onConfirmPasswordChange={passwordVm.setConfirmPassword}
        onSubmit={(event) => void passwordVm.submit(event)}
      />
    </div>
  );
}
