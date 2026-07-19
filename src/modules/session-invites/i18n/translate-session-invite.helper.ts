import type { Locale } from '@/modules/data-access';

import {
  SESSION_INVITE_MESSAGES,
  type SessionInviteMessageKey,
} from './session-invite-messages.constants';

export const translateSessionInvite = (
  locale: Locale,
  key: SessionInviteMessageKey,
  parameters: Readonly<Record<string, string | number>> = {},
): string => {
  let message: string = SESSION_INVITE_MESSAGES[locale][key];
  for (const [parameter, value] of Object.entries(parameters)) {
    message = message.replaceAll(`{${parameter}}`, String(value));
  }
  return message;
};
