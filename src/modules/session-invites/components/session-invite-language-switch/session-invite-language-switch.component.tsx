import { translate } from '@/shared/i18n';
import { LanguageSelect } from '@/shared/ui';

import type { SessionInviteLanguageSwitchProps } from '../../types/session-invite-ui.types';

export function SessionInviteLanguageSwitch({
  locale,
  onChange,
}: SessionInviteLanguageSwitchProps) {
  return (
    <div className="session-invite-language-switch">
      <LanguageSelect
        locale={locale}
        label={translate(locale, 'language')}
        className="session-invite-language-select"
        onChange={onChange}
      />
    </div>
  );
}
