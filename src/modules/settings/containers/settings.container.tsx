import type { CurrencyCode, Locale, Theme } from '@/modules/data-access';
import { Download, Save, Trash2 } from '@/packages/icons';
import { SUPPORTED_CURRENCIES } from '@/platform/device';
import { ConfirmDialog } from '@/shared/ui';

import { SettingsMetadata } from '../components/settings-metadata/settings-metadata.component';
import { useSettings } from '../hooks/use-settings.hook';

export function SettingsContainer() {
  const vm = useSettings();

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
        <SettingsMetadata
          rows={[
            { label: vm.t('storageMode'), value: vm.storageModeValue },
            { label: vm.t('connection'), value: vm.connectionValue },
            { label: vm.t('appVersion'), value: vm.appVersionValue },
          ]}
        />
        {vm.error ? <p className="form-error">{vm.error}</p> : null}
        <div className="sticky-actions">
          <button className="button" disabled={vm.busy}>
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
