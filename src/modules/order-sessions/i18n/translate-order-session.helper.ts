import type { Locale } from '@/modules/data-access';

import {
  ORDER_SESSION_MESSAGES,
  type OrderSessionMessageKey,
} from './order-session-messages.constants';

export type OrderSessionMessageParameters = Readonly<
  Record<string, string | number>
>;

export const translateOrderSession = (
  locale: Locale,
  key: OrderSessionMessageKey,
  parameters: OrderSessionMessageParameters = {},
): string => {
  let message: string = ORDER_SESSION_MESSAGES[locale][key];
  for (const [parameter, value] of Object.entries(parameters)) {
    message = message.replaceAll(`{${parameter}}`, String(value));
  }
  return message;
};
