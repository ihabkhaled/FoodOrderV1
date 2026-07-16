import type { Locale } from '@/shared/types';

import { type MessageKey, messages } from './messages.constants';

export const translate = (locale: Locale, key: MessageKey): string => messages[locale][key];
