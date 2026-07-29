import { useState } from 'react';

import type { ProfileDefaults } from '@/modules/data-access';
import { authService, dataService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { downloadTextFile } from '@/platform/browser';
import type { MessageKey } from '@/shared/i18n';

import type { SettingsMessageKey } from '../i18n/settings-messages.constants';
import { translateSettings } from '../i18n/translate-settings.helper';

export interface SettingsAccountViewModel {
  t: (key: MessageKey) => string;
  settingsT: (key: SettingsMessageKey) => string;
  exporting: boolean;
  exportData: () => Promise<void>;
  confirmingDelete: boolean;
  requestDelete: () => void;
  cancelDelete: () => void;
  deleting: boolean;
  deleteAccount: () => Promise<void>;
}

/** Data export and account deletion for the account subpage. */
export function useSettingsAccount(): SettingsAccountViewModel {
  const { user, profile, locale, t, showToast } = useApp();
  const [exporting, setExporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const exportData = async (): Promise<void> => {
    if (!user) return;
    try {
      setExporting(true);
      const defaults: ProfileDefaults = {
        locale: profile?.locale ?? 'en',
        theme: profile?.theme ?? 'system',
        defaultCurrency: profile?.defaultCurrency ?? 'EGP',
      };
      const data = await dataService.exportUserData(user, defaults);
      downloadTextFile(
        `foodorder-export-${data.exportedAt.slice(0, 10)}.json`,
        JSON.stringify(data, null, 2),
      );
      showToast(t('exportReady'), 'success');
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async (): Promise<void> => {
    if (!user) return;
    try {
      setDeleting(true);
      await dataService.deleteAllUserData(user);
      await authService.deleteAccount(user);
      showToast(t('accountDeleted'), 'success');
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return {
    t,
    settingsT: (key) => translateSettings(locale, key),
    exporting,
    exportData,
    confirmingDelete,
    requestDelete: () => {
      setConfirmingDelete(true);
    },
    cancelDelete: () => {
      setConfirmingDelete(false);
    },
    deleting,
    deleteAccount,
  };
}
