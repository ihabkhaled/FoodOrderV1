import type { CurrencyCode, Locale, Theme } from '@/modules/data-access';
import { Download, Save, Trash2 } from '@/packages/icons';
import { SUPPORTED_CURRENCIES } from '@/platform/device';
import { ConfirmDialog } from '@/shared/ui';

import { AnalyticsConsentSection } from '../components/analytics-consent-section/analytics-consent-section.component';
import { ChangePasswordSection } from '../components/change-password-section/change-password-section.component';
import { SettingsMetadata } from '../components/settings-metadata/settings-metadata.component';
import { buildAnalyticsConsentOptions } from '../helpers/analytics-consent-options.helper';
import { useChangePassword } from '../hooks/use-change-password.hook';
import { useSettings } from '../hooks/use-settings.hook';

export function SettingsContainer() {
  const vm = useSettings();
  const passwordVm = useChangePassword();
  const analyticsConsentOptions = buildAnalyticsConsentOptions(vm.settingsT);

  return (
    <div className="page narrow stack-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{vm.t('profile')}</p>
          <h1>{vm.t('settings')}</h1>
        </div>
      </div>
      <form className="stack-lg" onSubmit={(event) => void vm.submit(event)}>
        <section className="section-card form-grid">
          <label>
            {vm.t('fullName')}
            <input
              value={vm.fullName}
              onChange={(event) => {
                vm.setFullName(event.target.value);
              }}
            />
          </label>
          <label>
            {vm.t('email')}
            <input value={vm.profileEmail} disabled />
          </label>
          <label>
            {vm.t('language')}
            <select
              value={vm.locale}
              onChange={(event) => {
                vm.setLocale(event.target.value as Locale);
              }}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          <label>
            {vm.t('theme')}
            <select
              value={vm.theme}
              onChange={(event) => {
                vm.setTheme(event.target.value as Theme);
              }}
            >
              <option value="system">{vm.t('system')}</option>
              <option value="light">{vm.t('light')}</option>
              <option value="dark">{vm.t('dark')}</option>
            </select>
          </label>
          <label>
            {vm.t('currency')}
            <select
              value={vm.currency}
              onChange={(event) => {
                vm.setCurrency(event.target.value as CurrencyCode);
              }}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </label>
        </section>
        <AnalyticsConsentSection
          heading={vm.settingsT('analyticsPrivacy')}
          description={vm.settingsT('analyticsPrivacyDescription')}
          legend={vm.settingsT('analyticsConsent')}
          value={vm.analyticsConsent}
          disabled={vm.analyticsConsentLoading || vm.busy}
          options={analyticsConsentOptions}
          onChange={vm.setAnalyticsConsent}
        />
        <SettingsMetadata
          rows={[
            { label: vm.t('storageMode'), value: vm.storageModeValue },
            { label: vm.t('connection'), value: vm.connectionValue },
            { label: vm.t('appVersion'), value: vm.appVersionValue },
          ]}
        />
        {vm.error ? <p className="form-error">{vm.error}</p> : null}
        <div className="sticky-actions">
          <button
            className="button"
            disabled={vm.busy || vm.analyticsConsentLoading}
          >
            <Save />
            {vm.busy ? vm.t('loading') : vm.t('save')}
          </button>
        </div>
      </form>
      <section className="section-card stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{vm.t('profile')}</p>
            <h2>{vm.t('exportData')}</h2>
          </div>
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={vm.exporting}
          onClick={() => void vm.exportData()}
        >
          <Download />
          {vm.exporting ? vm.t('loading') : vm.t('exportData')}
        </button>
      </section>
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
      <section className="section-card stack danger-zone">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{vm.t('dangerZone')}</p>
            <h2>{vm.t('deleteAccount')}</h2>
          </div>
        </div>
        <button
          type="button"
          className="button danger"
          disabled={vm.deleting}
          onClick={vm.requestDelete}
        >
          <Trash2 />
          {vm.deleting ? vm.t('loading') : vm.t('deleteAccount')}
        </button>
      </section>
      <ConfirmDialog
        open={vm.confirmingDelete}
        title={vm.t('deleteAccount')}
        message={vm.t('confirmDeleteAccount')}
        confirmLabel={vm.t('deleteAccount')}
        cancelLabel={vm.t('cancel')}
        danger
        onConfirm={() => void vm.deleteAccount()}
        onCancel={vm.cancelDelete}
      />
    </div>
  );
}
