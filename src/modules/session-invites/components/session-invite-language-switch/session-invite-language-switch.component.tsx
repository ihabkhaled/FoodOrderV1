import type { SessionInviteLanguageSwitchProps } from '../../types/session-invite-ui.types';

export function SessionInviteLanguageSwitch({
  locale,
  translate,
  onChange,
}: SessionInviteLanguageSwitchProps) {
  return (
    <div
      className="session-invite-language-switch"
      role="group"
      aria-label={translate(locale, 'pageTitle')}
    >
      <button
        type="button"
        className={locale === 'en' ? 'is-active' : ''}
        aria-pressed={locale === 'en'}
        onClick={() => {
          onChange('en');
        }}
      >
        {translate(locale, 'languageEnglish')}
      </button>
      <button
        type="button"
        className={locale === 'ar' ? 'is-active' : ''}
        aria-pressed={locale === 'ar'}
        onClick={() => {
          onChange('ar');
        }}
      >
        {translate(locale, 'languageArabic')}
      </button>
    </div>
  );
}
