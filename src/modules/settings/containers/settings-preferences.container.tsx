import '../settings.css';

import type { CurrencyCode, Theme } from '@/modules/data-access';
import { Bell, RefreshCcw, Save } from '@/packages/icons';
import { SUPPORTED_CURRENCIES } from '@/platform/device';
import { BackLink, LanguageSelect } from '@/shared/ui';

import { useSettingsPreferences } from '../hooks/use-settings-preferences.hook';
import { SETTINGS_PATH } from '../routes/settings-route-paths.constants';

export function SettingsPreferencesContainer() {
  const vm = useSettingsPreferences();

  return (
    <div className="page narrow stack-lg">
      <div className="page-heading">
        <div>
          <BackLink fallback={SETTINGS_PATH} label={vm.t('back')} />
          <h1>{vm.settingsT('preferencesSection')}</h1>
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
            <LanguageSelect
              locale={vm.locale}
              label={vm.t('language')}
              onChange={vm.setLocale}
            />
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
        {vm.notificationPermission === 'unsupported' ? null : (
          <section className="section-card stack">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{vm.t('notificationsLabel')}</p>
                <h2>
                  <Bell size={18} aria-hidden="true" />
                  {vm.t('notificationsLabel')}
                </h2>
              </div>
            </div>
            {vm.notificationPermission === 'granted' ? (
              <p className="muted">{vm.t('notificationsEnabled')}</p>
            ) : vm.notificationPermission === 'denied' ? (
              <p className="muted">{vm.t('notificationsBlocked')}</p>
            ) : (
              <button
                type="button"
                className="button secondary"
                onClick={() => void vm.enableNotifications()}
              >
                <Bell />
                {vm.t('enableNotifications')}
              </button>
            )}
          </section>
        )}
        <section className="section-card stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{vm.settingsT('preferencesSection')}</p>
              <h2>{vm.t('replayTutorials')}</h2>
            </div>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => void vm.replayTutorials()}
          >
            <RefreshCcw />
            {vm.t('replayTutorials')}
          </button>
        </section>
        {vm.error ? <p className="form-error">{vm.error}</p> : null}
        <div className="sticky-actions">
          <button className="button" disabled={vm.busy}>
            <Save />
            {vm.busy ? vm.t('loading') : vm.t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
