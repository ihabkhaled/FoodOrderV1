import '../settings.css';

import { Database, KeyRound, Settings2, ShieldCheck } from '@/packages/icons';
import { FeatureTour, LinkRow } from '@/shared/ui';

import { SettingsMetadata } from '../components/settings-metadata/settings-metadata.component';
import { useSettingsHub } from '../hooks/use-settings-hub.hook';
import { useSettingsTour } from '../hooks/use-settings-tour.hook';
import {
  SETTINGS_ACCOUNT_PATH,
  SETTINGS_PREFERENCES_PATH,
  SETTINGS_PRIVACY_PATH,
  SETTINGS_SECURITY_PATH,
} from '../routes/settings-route-paths.constants';

export function SettingsHubContainer() {
  const vm = useSettingsHub();
  const { setSectionsElement, steps: tourSteps } = useSettingsTour();
  const rows = [
    {
      to: SETTINGS_PREFERENCES_PATH,
      icon: Settings2,
      title: vm.settingsT('preferencesSection'),
      hint: vm.settingsT('preferencesSectionHint'),
    },
    {
      to: SETTINGS_PRIVACY_PATH,
      icon: ShieldCheck,
      title: vm.settingsT('analyticsPrivacy'),
      hint: vm.settingsT('privacySectionHint'),
    },
    {
      to: SETTINGS_SECURITY_PATH,
      icon: KeyRound,
      title: vm.settingsT('securitySection'),
      hint: vm.settingsT('securitySectionHint'),
    },
    {
      to: SETTINGS_ACCOUNT_PATH,
      icon: Database,
      title: vm.settingsT('accountSection'),
      hint: vm.settingsT('accountSectionHint'),
    },
  ];

  return (
    <div className="page narrow stack-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{vm.t('profile')}</p>
          <h1>{vm.t('settings')}</h1>
          <p className="page-intro">{vm.t('settingsIntro')}</p>
        </div>
      </div>
      <section className="section-card stack">
        <strong>{vm.fullName}</strong>
        <span className="muted">{vm.email}</span>
      </section>
      <nav ref={setSectionsElement} className="link-rows" aria-label={vm.t('settings')}>
        {rows.map((row) => (
          <LinkRow
            key={row.to}
            to={row.to}
            icon={row.icon}
            title={row.title}
            hint={row.hint}
          />
        ))}
      </nav>
      <SettingsMetadata
        rows={[
          { label: vm.t('connection'), value: vm.connectionValue },
          { label: vm.t('appVersion'), value: vm.appVersionValue },
        ]}
      />

      <FeatureTour
        page="settings"
        steps={tourSteps}
        nextLabel={vm.t('tourNext')}
        doneLabel={vm.t('tourDone')}
        skipLabel={vm.t('tourSkip')}
        closeLabel={vm.t('close')}
        skipAllLabel={vm.t('tourSkipAll')}
      />
    </div>
  );
}
