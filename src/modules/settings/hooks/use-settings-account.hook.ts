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
  reauthenticating: boolean;
  reauthError: string | null;
  cancelReauthentication: () => void;
  deleting: boolean;
  confirmDeleteIntent: () => void;
  deleteAccount: (email: string, password: string) => Promise<void>;
}

/** Data export and account deletion for the account subpage. */
export function useSettingsAccount(): SettingsAccountViewModel {
  const { user, profile, locale, t, showToast } = useApp();
  const [exporting, setExporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reauthenticating, setReauthenticating] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);
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

  /**
   * Deletion is two-step: the danger confirmation only opens the credential
   * dialog. Nothing is destroyed until re-authentication succeeds here.
   */
  const deleteAccount = async (
    email: string,
    password: string,
  ): Promise<void> => {
    if (!user) return;
    setReauthError(null);
    setDeleting(true);
    try {
      await authService.reauthenticate(user, email, password);
    } catch {
      setReauthError(t('deleteAccountWrongCredentials'));
      setDeleting(false);
      return;
    }
    try {
      await dataService.deleteAllUserData(user);
      await authService.deleteAccount(user);
      showToast(t('accountDeleted'), 'success');
      setReauthenticating(false);
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    } finally {
      setDeleting(false);
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
    reauthenticating,
    reauthError,
    cancelReauthentication: () => {
      if (deleting) return;
      setReauthenticating(false);
      setReauthError(null);
    },
    deleting,
    confirmDeleteIntent: () => {
      setConfirmingDelete(false);
      setReauthError(null);
      setReauthenticating(true);
    },
    deleteAccount,
  };
}
