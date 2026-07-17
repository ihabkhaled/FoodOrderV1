import type { Locale } from '@/modules/data-access';

import type { SocialMessageKey } from './social-messages.constants';
import { socialMessages } from './social-messages.constants';

export const translateSocial = (
  locale: Locale,
  key: SocialMessageKey,
): string => socialMessages[locale][key];
