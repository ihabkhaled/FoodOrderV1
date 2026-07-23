import type { Locale } from '@/shared/types';

export interface LanguageSelectProps {
  readonly locale: Locale;
  readonly label: string;
  readonly className?: string | undefined;
  readonly onChange: (locale: Locale) => void;
}
