import { Download, Save, Trash2 } from 'lucide-react';
import { type SyntheticEvent,useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { env } from '@/config/env';
import { authService, dataService } from '@/services';
import { downloadTextFile } from '@/services/platform';
import { useApp } from '@/state/AppContext';
import { SUPPORTED_CURRENCIES } from '@/state/deviceConfig';
import type { CurrencyCode, Locale, ProfileDefaults, Theme } from '@/types/domain';

export function SettingsPage() {
  const { user, profile, storageMode, online, t, saveProfile, showToast } = useApp();
  const [fullName, setFullName] = useState(profile?.fullName ?? ''); const [locale, setLocale] = useState<Locale>(profile?.locale ?? 'en'); const [theme, setTheme] = useState<Theme>(profile?.theme ?? 'system'); const [currency, setCurrency] = useState<CurrencyCode>(profile?.defaultCurrency ?? 'EGP'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false); const [confirmingDelete, setConfirmingDelete] = useState(false); const [deleting, setDeleting] = useState(false);
  useEffect(() => { if (profile) { setFullName(profile.fullName); setLocale(profile.locale); setTheme(profile.theme); setCurrency(profile.defaultCurrency); } }, [profile]);
  const submit = async (event: SyntheticEvent) => { event.preventDefault(); if (!fullName.trim()) { setError(t('fullNameRequired')); return; } try { setBusy(true); setError(''); await saveProfile({ fullName: fullName.trim(), locale, theme, defaultCurrency: currency }); } catch (error_) { setError(error_ instanceof Error ? error_.message : t('tryAgain')); } finally { setBusy(false); } };
  const exportData = async () => {
    if (!user) return;
    try {
      setExporting(true);
      const defaults: ProfileDefaults = { locale, theme, defaultCurrency: currency };
      const data = await dataService.exportUserData(user, defaults);
      downloadTextFile(`foodorder-export-${data.exportedAt.slice(0, 10)}.json`, JSON.stringify(data, null, 2));
      showToast(t('exportReady'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setExporting(false);
    }
  };
  const deleteAccount = async () => {
    if (!user) return;
    try {
      setDeleting(true);
      await dataService.deleteAllUserData(user);
      await authService.deleteAccount(user);
      showToast(t('accountDeleted'), 'success');
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : '';
      showToast(message.includes('requires-recent-login') ? t('requiresRecentLogin') : message || t('tryAgain'), 'error');
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };
  return <div className="page narrow stack-lg"><div className="page-heading"><div><p className="eyebrow">{t('profile')}</p><h1>{t('settings')}</h1></div></div>
    <form className="stack-lg" onSubmit={(event) => void submit(event)}><section className="section-card form-grid"><label>{t('fullName')}<input value={fullName} onChange={(event) => { setFullName(event.target.value); }} /></label><label>{t('email')}<input value={profile?.email ?? ''} disabled /></label><label>{t('language')}<select value={locale} onChange={(event) => { setLocale(event.target.value as Locale); }}><option value="en">English</option><option value="ar">العربية</option></select></label><label>{t('theme')}<select value={theme} onChange={(event) => { setTheme(event.target.value as Theme); }}><option value="system">{t('system')}</option><option value="light">{t('light')}</option><option value="dark">{t('dark')}</option></select></label><label>{t('currency')}<select value={currency} onChange={(event) => { setCurrency(event.target.value as CurrencyCode); }}>{SUPPORTED_CURRENCIES.map((code) => <option key={code}>{code}</option>)}</select></label></section>
      <section className="section-card metadata-grid"><div><span>{t('storageMode')}</span><strong>{storageMode === 'firebase' ? t('firebaseMode') : t('localMode')}</strong></div><div><span>{t('connection')}</span><strong>{online ? t('online') : t('offline')}</strong></div><div><span>{t('appVersion')}</span><strong>v{env.appVersion}</strong></div></section>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="sticky-actions"><button className="button" disabled={busy}><Save />{busy ? t('loading') : t('save')}</button></div>
    </form>
    <section className="section-card stack">
      <div className="section-heading"><div><p className="eyebrow">{t('profile')}</p><h2>{t('exportData')}</h2></div></div>
      <button type="button" className="button secondary" disabled={exporting} onClick={() => void exportData()}><Download />{exporting ? t('loading') : t('exportData')}</button>
    </section>
    <section className="section-card stack danger-zone">
      <div className="section-heading"><div><p className="eyebrow">{t('dangerZone')}</p><h2>{t('deleteAccount')}</h2></div></div>
      <button type="button" className="button danger" disabled={deleting} onClick={() => { setConfirmingDelete(true); }}><Trash2 />{deleting ? t('loading') : t('deleteAccount')}</button>
    </section>
    <ConfirmDialog open={confirmingDelete} title={t('deleteAccount')} message={t('confirmDeleteAccount')} confirmLabel={t('deleteAccount')} cancelLabel={t('cancel')} danger onConfirm={() => void deleteAccount()} onCancel={() => { setConfirmingDelete(false); }} />
  </div>;
}
