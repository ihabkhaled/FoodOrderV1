import {
  type CurrencyCode,
  type Locale,
  ORDER_SESSION_STATUS,
  type OrderSession,
  type OrderSessionStatus,
  PARTICIPANT_RESPONSE,
  type ParticipantResponse,
  type SessionContribution,
  type SessionParticipant,
} from '@/modules/data-access';

import type { OrderSessionMessageKey } from '../i18n/order-session-messages.constants';

const SESSION_STATUS_MESSAGE_KEY: Readonly<
  Record<OrderSessionStatus, OrderSessionMessageKey>
> = {
  draft: 'draft',
  collecting: 'collecting',
  locked: 'locked',
  submitted: 'submitted',
  confirmed: 'confirmed',
  delivered: 'delivered',
  settling: 'settling',
  settled: 'settled',
  cancelled: 'cancelled',
};

const PARTICIPANT_RESPONSE_MESSAGE_KEY: Readonly<
  Record<ParticipantResponse, OrderSessionMessageKey>
> = {
  pending: 'pending',
  viewed: 'viewed',
  ordering: 'ordering',
  done: 'done',
  skipped: 'skipped',
  removed: 'removed',
};

export const sessionStatusMessageKey = (
  status: OrderSessionStatus,
): OrderSessionMessageKey => SESSION_STATUS_MESSAGE_KEY[status];

export const participantResponseMessageKey = (
  response: ParticipantResponse,
): OrderSessionMessageKey => PARTICIPANT_RESPONSE_MESSAGE_KEY[response];

export const formatSessionMoney = (
  minorUnits: number,
  currency: CurrencyCode,
  locale: Locale,
): string =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);

export const formatSessionDateTime = (
  value: string,
  locale: Locale,
): string =>
  new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const participantCanContribute = (
  session: OrderSession,
  participant: SessionParticipant | null,
  now: string,
): boolean => {
  if (!participant || participant.role === 'viewer') return false;
  if (participant.response === PARTICIPANT_RESPONSE.removed) return false;
  if (session.status !== ORDER_SESSION_STATUS.collecting) return false;
  if (!session.deadlineAt) return true;
  return Date.parse(now) < Date.parse(session.deadlineAt);
};

export const participantContribution = (
  contributions: readonly SessionContribution[],
  userId: string,
): SessionContribution | null =>
  contributions.find((contribution) => contribution.userId === userId) ?? null;

export const participantSubtotalMinor = (
  session: OrderSession,
  contribution: SessionContribution | null,
): number => {
  if (!contribution) return 0;
  return session.menuItems.reduce((total, item) => {
    const quantity = contribution.quantities[item.id] ?? 0;
    const lineTotal = item.unitPriceMinor * quantity;
    return Number.isSafeInteger(lineTotal) ? total + lineTotal : total;
  }, 0);
};

export const pendingParticipants = (
  participants: readonly SessionParticipant[],
): SessionParticipant[] =>
  participants.filter(
    (participant) =>
      participant.response === PARTICIPANT_RESPONSE.pending ||
      participant.response === PARTICIPANT_RESPONSE.viewed ||
      participant.response === PARTICIPANT_RESPONSE.ordering,
  );
