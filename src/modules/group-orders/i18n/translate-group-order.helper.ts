import type { Locale } from '@/modules/data-access';

import type { GroupOrderMessageKey } from './group-order-messages.constants';
import { groupOrderMessages } from './group-order-messages.constants';

export const translateGroupOrder = (
  locale: Locale,
  key: GroupOrderMessageKey,
): string => groupOrderMessages[locale][key];
