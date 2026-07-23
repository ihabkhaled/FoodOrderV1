import {
  isSupportedLocale,
  LOCALE_DEFINITIONS,
  SUPPORTED_LOCALES,
} from '@/shared/i18n';

import type { LanguageSelectProps } from './language-select.types';

/** Hook-free native locale selector with names written in each language. */
export function LanguageSelect({
  locale,
  label,
  className,
  onChange,
}: LanguageSelectProps) {
  const classes = ['language-select', className].filter(Boolean).join(' ');

  return (
    <select
      className={classes}
      value={locale}
      aria-label={label}
      title={label}
      onChange={(event) => {
        const nextLocale = event.currentTarget.value;
        if (isSupportedLocale(nextLocale)) onChange(nextLocale);
      }}
    >
      {SUPPORTED_LOCALES.map((supportedLocale) => {
        const definition = LOCALE_DEFINITIONS[supportedLocale];
        return (
          <option
            key={supportedLocale}
            value={supportedLocale}
            lang={supportedLocale}
            dir={definition.direction}
          >
            {definition.nativeName}
          </option>
        );
      })}
    </select>
  );
}
