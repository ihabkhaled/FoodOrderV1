import '../settings.css';

import { Save } from '@/packages/icons';
import { BackLink } from '@/shared/ui';

import { AnalyticsConsentSection } from '../components/analytics-consent-section/analytics-consent-section.component';
import { buildAnalyticsConsentOptions } from '../helpers/analytics-consent-options.helper';
import { useSettingsPrivacy } from '../hooks/use-settings-privacy.hook';
import { SETTINGS_PATH } from '../routes/settings-route-paths.constants';

export function SettingsPrivacyContainer() {
  const vm = useSettingsPrivacy();
  const analyticsConsentOptions = buildAnalyticsConsentOptions(vm.settingsT);

  return (
    <div className="page narrow stack-lg">
      <div className="page-heading">
        <div>
          <BackLink fallback={SETTINGS_PATH} label={vm.t('back')} />
          <h1>{vm.settingsT('analyticsPrivacy')}</h1>
        </div>
      </div>
      <form className="stack-lg" onSubmit={(event) => void vm.submit(event)}>
        <AnalyticsConsentSection
          heading={vm.settingsT('analyticsPrivacy')}
          description={vm.settingsT('analyticsPrivacyDescription')}
          legend={vm.settingsT('analyticsConsent')}
          value={vm.analyticsConsent}
          disabled={vm.loading || vm.busy}
          options={analyticsConsentOptions}
          onChange={vm.setAnalyticsConsent}
        />
        <div className="sticky-actions">
          <button className="button" disabled={vm.busy || vm.loading}>
            <Save />
            {vm.busy ? vm.t('loading') : vm.t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
