import type {
  GuestSessionView,
  PublicSessionInvitePreview,
} from '@/modules/data-access';
import { formatDateTime, formatMoney } from '@/shared/helpers';

import type { SessionInviteMessageKey } from '../i18n/session-invite-messages.constants';
import type { SessionInviteLocale } from '../types/session-invite-ui.types';

const RESPONSE_MESSAGE_KEYS: Readonly<
  Record<GuestSessionView['participantResponse'], SessionInviteMessageKey>
> = {
  pending: 'statusPending',
  viewed: 'statusViewed',
  ordering: 'statusOrdering',
  done: 'statusDone',
  skipped: 'statusSkipped',
  removed: 'statusRemoved',
};

export const sessionInviteResponseMessageKey = (
  response: GuestSessionView['participantResponse'],
): SessionInviteMessageKey => RESPONSE_MESSAGE_KEYS[response];

export const formatSessionInviteDeadline = (
  preview: PublicSessionInvitePreview,
  locale: SessionInviteLocale,
): string | null =>
  preview.deadlineAt ? formatDateTime(preview.deadlineAt, locale) : null;

export const formatSessionInviteMoney = (
  minorUnits: number,
  preview: PublicSessionInvitePreview,
  locale: SessionInviteLocale,
): string => formatMoney(minorUnits / 100, preview.currency, locale);
