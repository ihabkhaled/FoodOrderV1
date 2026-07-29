import '../settings.css';

import { Download, Trash2 } from '@/packages/icons';
import { BackLink, ConfirmDialog } from '@/shared/ui';

import { useSettingsAccount } from '../hooks/use-settings-account.hook';
import { SETTINGS_PATH } from '../routes/settings-route-paths.constants';

export function SettingsAccountContainer() {
  const vm = useSettingsAccount();

  return (
    <div className="page narrow stack-lg">
      <div className="page-heading">
        <div>
          <BackLink fallback={SETTINGS_PATH} label={vm.t('back')} />
          <h1>{vm.settingsT('accountSection')}</h1>
        </div>
      </div>
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
        busy={vm.deleting}
        onConfirm={() => void vm.deleteAccount()}
        onCancel={vm.cancelDelete}
      />
    </div>
  );
}
