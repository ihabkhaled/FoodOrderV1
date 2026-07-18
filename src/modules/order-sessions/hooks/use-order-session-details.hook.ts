import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ORDER_SESSION_STATUS,
  PARTICIPANT_RESPONSE,
  createId,
  orderSessionService,
  type OrderSessionStatus,
  type OrderSessionView,
  type SessionMenuItemSnapshot,
  type SessionParticipant,
} from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useParams } from '@/packages/router';
import { nowIso } from '@/shared/helpers';

import {
  participantCanContribute,
  participantContribution,
  participantSubtotalMinor,
  pendingParticipants,
} from '../helpers/order-session-view.helper';
import { translateOrderSession } from '../i18n/translate-order-session.helper';

export interface SessionLifecycleAction {
  status: OrderSessionStatus;
  labelKey:
    | 'reopenOrder'
    | 'lockOrder'
    | 'submitOrder'
    | 'confirmOrder'
    | 'markDelivered'
    | 'startSettlement'
    | 'markSettled'
    | 'cancelOrder';
  danger: boolean;
}

const lifecycleActions = (
  status: OrderSessionStatus,
): readonly SessionLifecycleAction[] => {
  if (status === ORDER_SESSION_STATUS.collecting) {
    return [
      { status: ORDER_SESSION_STATUS.locked, labelKey: 'lockOrder', danger: false },
      { status: ORDER_SESSION_STATUS.cancelled, labelKey: 'cancelOrder', danger: true },
    ];
  }
  if (status === ORDER_SESSION_STATUS.locked) {
    return [
      { status: ORDER_SESSION_STATUS.collecting, labelKey: 'reopenOrder', danger: false },
      { status: ORDER_SESSION_STATUS.submitted, labelKey: 'submitOrder', danger: false },
      { status: ORDER_SESSION_STATUS.cancelled, labelKey: 'cancelOrder', danger: true },
    ];
  }
  if (status === ORDER_SESSION_STATUS.submitted) {
    return [
      { status: ORDER_SESSION_STATUS.confirmed, labelKey: 'confirmOrder', danger: false },
      { status: ORDER_SESSION_STATUS.cancelled, labelKey: 'cancelOrder', danger: true },
    ];
  }
  if (status === ORDER_SESSION_STATUS.confirmed) {
    return [
      { status: ORDER_SESSION_STATUS.delivered, labelKey: 'markDelivered', danger: false },
      { status: ORDER_SESSION_STATUS.cancelled, labelKey: 'cancelOrder', danger: true },
    ];
  }
  if (status === ORDER_SESSION_STATUS.delivered) {
    return [
      { status: ORDER_SESSION_STATUS.settling, labelKey: 'startSettlement', danger: false },
    ];
  }
  if (status === ORDER_SESSION_STATUS.settling) {
    return [
      { status: ORDER_SESSION_STATUS.settled, labelKey: 'markSettled', danger: false },
    ];
  }
  return [];
};

export interface OrderSessionDetailsViewModel {
  view: OrderSessionView | null;
  loading: boolean;
  busy: boolean;
  busyItemId: string | null;
  error: string;
  locale: 'en' | 'ar';
  translate: typeof translateOrderSession;
  isOrganizer: boolean;
  canContribute: boolean;
  personalSubtotalMinor: number;
  personalQuantities: Readonly<Record<string, number>>;
  pending: SessionParticipant[];
  actions: readonly SessionLifecycleAction[];
  refresh: () => Promise<void>;
  changeQuantity: (
    item: SessionMenuItemSnapshot,
    nextQuantity: number,
  ) => Promise<void>;
  markDone: () => Promise<void>;
  markSkipped: () => Promise<void>;
  transition: (status: OrderSessionStatus) => Promise<void>;
}

export function useOrderSessionDetails(): OrderSessionDetailsViewModel {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const { user, profile, showToast } = useApp();
  const locale = profile?.locale ?? 'en';
  const [view, setView] = useState<OrderSessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user || !sessionId) {
      setView(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      setView(await orderSessionService.getSessionView(user, sessionId));
    } catch (error_) {
      setError(
        error_ instanceof Error
          ? error_.message
          : translateOrderSession(locale, 'sessionChanged'),
      );
    } finally {
      setLoading(false);
    }
  }, [locale, sessionId, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currentContribution = useMemo(
    () =>
      user && view
        ? participantContribution(view.contributions, user.id)
        : null,
    [user, view],
  );

  const changeQuantity = async (
    item: SessionMenuItemSnapshot,
    nextQuantity: number,
  ) => {
    if (!user || !view) return;
    try {
      setBusyItemId(item.id);
      setError('');
      await orderSessionService.updateContribution(user, {
        sessionId: view.session.id,
        expectedSessionRevision: view.session.revision,
        itemId: item.id,
        operation: 'set',
        value: nextQuantity,
        mutationId: createId('session-mutation'),
      });
      showToast(
        translateOrderSession(locale, 'contributionUpdated'),
        'success',
      );
      await refresh();
    } catch (error_) {
      setError(
        error_ instanceof Error
          ? error_.message
          : translateOrderSession(locale, 'sessionChanged'),
      );
    } finally {
      setBusyItemId(null);
    }
  };

  const updateResponse = async (
    response: typeof PARTICIPANT_RESPONSE.done | typeof PARTICIPANT_RESPONSE.skipped,
  ) => {
    if (!user || !view?.currentParticipant) return;
    try {
      setBusy(true);
      setError('');
      await orderSessionService.updateParticipantResponse(user, {
        sessionId: view.session.id,
        expectedSessionRevision: view.session.revision,
        expectedParticipantRevision: view.currentParticipant.revision,
        response,
      });
      showToast(translateOrderSession(locale, 'responseUpdated'), 'success');
      await refresh();
    } catch (error_) {
      setError(
        error_ instanceof Error
          ? error_.message
          : translateOrderSession(locale, 'sessionChanged'),
      );
    } finally {
      setBusy(false);
    }
  };

  const transition = async (status: OrderSessionStatus) => {
    if (!user || !view) return;
    try {
      setBusy(true);
      setError('');
      await orderSessionService.transitionSession(user, {
        sessionId: view.session.id,
        expectedRevision: view.session.revision,
        nextStatus: status,
      });
      showToast(
        translateOrderSession(
          locale,
          status === ORDER_SESSION_STATUS.locked
            ? 'sessionLocked'
            : status === ORDER_SESSION_STATUS.collecting
              ? 'sessionReopened'
              : 'responseUpdated',
        ),
        'success',
      );
      await refresh();
    } catch (error_) {
      setError(
        error_ instanceof Error
          ? error_.message
          : translateOrderSession(locale, 'sessionChanged'),
      );
    } finally {
      setBusy(false);
    }
  };

  return {
    view,
    loading,
    busy,
    busyItemId,
    error,
    locale,
    translate: translateOrderSession,
    isOrganizer: Boolean(user && view?.session.organizerId === user.id),
    canContribute: Boolean(
      view &&
        participantCanContribute(
          view.session,
          view.currentParticipant,
          nowIso(),
        ),
    ),
    personalSubtotalMinor: view
      ? participantSubtotalMinor(view.session, currentContribution)
      : 0,
    personalQuantities: currentContribution?.quantities ?? {},
    pending: view ? pendingParticipants(view.participants) : [],
    actions: view ? lifecycleActions(view.session.status) : [],
    refresh,
    changeQuantity,
    markDone: () => updateResponse(PARTICIPANT_RESPONSE.done),
    markSkipped: () => updateResponse(PARTICIPANT_RESPONSE.skipped),
    transition,
  };
}
