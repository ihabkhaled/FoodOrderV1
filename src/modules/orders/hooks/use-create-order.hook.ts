import { useEffect, useMemo, useState } from 'react';

import type {
  Bucket,
  GroupOrderReceiptSnapshot,
  Locale,
  OrderLine,
} from '@/modules/data-access';
import {
  buildPersonalOrderReceipt,
  calculateOrderTotal,
  dataService,
  MAX_ORDER_QUANTITY,
  orderSessionService,
  PARTICIPANT_RESPONSE,
} from '@/modules/data-access';
import type { GroupOrderMessageKey } from '@/modules/group-orders';
import { translateGroupOrder } from '@/modules/group-orders';
import {
  buildOrderSessionDetailsRoute,
  translateOrderSession,
} from '@/modules/order-sessions';
import { useApp } from '@/modules/session';
import { useNavigate, useParams } from '@/packages/router';
import { createId } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

import { buildOrderDetailsRoute } from '../routes/orders-route-paths.constants';

export type OrderStep = 1 | 2 | 3;

const defaultTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo';

const OPEN_FOR_FRIENDS_LABELS: Readonly<Record<Locale, string>> = {
  en: 'Open for friends',
  ar: 'افتح للأصحاب',
  'ar-Latn': 'Eftah lel so7ab',
  it: 'Apri agli amici',
  fa: 'برای دوستان باز کن',
  fr: 'Ouvrir aux amis',
  de: 'Für Freunde öffnen',
  es: 'Abrir para amigos',
  'pt-BR': 'Abrir para amigos',
  hi: 'दोस्तों के लिए खोलें',
  th: 'เปิดให้เพื่อน',
  'zh-CN': '向朋友开放',
  ja: '友だちに公開',
};

export interface CreateOrderViewModel {
  t: (key: MessageKey) => string;
  gt: (key: GroupOrderMessageKey) => string;
  locale: Locale;
  bucket: Bucket | null;
  quantities: Record<string, number>;
  notes: string;
  setNotes: (notes: string) => void;
  loading: boolean;
  busy: boolean;
  error: string;
  step: OrderStep;
  moveTo: (step: OrderStep) => void;
  selectedLines: Omit<OrderLine, 'lineTotal'>[];
  subtotal: number;
  receipt: GroupOrderReceiptSnapshot | null;
  total: number;
  canOpenForFriends: boolean;
  openForFriendsLabel: string;
  adjust: (id: string, delta: number) => void;
  submit: (status: 'draft' | 'placed') => Promise<void>;
  openForFriends: () => Promise<void>;
}

export function useCreateOrder(): CreateOrderViewModel {
  const { bucketId } = useParams();
  const navigate = useNavigate();
  const { user, locale, t, showToast } = useApp();
  const gt = (key: GroupOrderMessageKey) => translateGroupOrder(locale, key);
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<OrderStep>(1);

  useEffect(() => {
    if (!user || !bucketId) return;
    void dataService
      .getBucket(user, bucketId)
      .then((value) => {
        if (!value) throw new Error('Bucket was not found.');
        setBucket(value);
      })
      .catch((error_: unknown) => {
        setError(
          error_ instanceof Error ? error_.message : 'Unable to load bucket.',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [bucketId, user]);

  const selectedLines = useMemo(
    () =>
      bucket?.items
        .filter((item) => item.active && (quantities[item.id] ?? 0) > 0)
        .map((item) => ({
          id: item.id,
          bucketItemId: item.id,
          name: item.name,
          quantity: quantities[item.id] ?? 0,
          unitPrice: item.unitPrice,
        })) ?? [],
    [bucket, quantities],
  );
  const subtotal = calculateOrderTotal(selectedLines);
  const receipt = useMemo(
    () =>
      bucket && user && selectedLines.length > 0
        ? buildPersonalOrderReceipt(bucket, user, selectedLines)
        : null,
    [bucket, selectedLines, user],
  );
  const total = receipt ? receipt.grandTotalMinor / 100 : subtotal;

  const adjust = (id: string, delta: number): void => {
    setQuantities((current) => ({
      ...current,
      [id]: Math.max(
        0,
        Math.min(MAX_ORDER_QUANTITY, (current[id] ?? 0) + delta),
      ),
    }));
  };

  const moveTo = (nextStep: OrderStep): void => {
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (status: 'draft' | 'placed'): Promise<void> => {
    if (!user || !bucket) return;
    if (selectedLines.length === 0 || !receipt) {
      setError(t('noItemsSelected'));
      return;
    }
    try {
      setBusy(true);
      setError('');
      const order = await dataService.createOrder(user.id, {
        bucketId: bucket.id,
        bucketTitle: bucket.title,
        currency: bucket.currency,
        lines: selectedLines,
        notes,
        status,
        sourceBucketRevision: bucket.revision,
        groupReceipt: receipt,
      });
      showToast(
        status === 'placed' ? t('orderPlaced') : t('draftSaved'),
        'success',
      );
      await navigate(buildOrderDetailsRoute(order.id));
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  const openForFriends = async (): Promise<void> => {
    if (!user || !bucket) return;
    if (selectedLines.length === 0 || !receipt) {
      setError(t('noItemsSelected'));
      return;
    }
    try {
      setBusy(true);
      setError('');
      const session = await orderSessionService.createSession(user, {
        menuTemplateId: bucket.id,
        title: bucket.title,
        timezone: defaultTimezone(),
        deadlineAt: null,
        autoLock: false,
      });

      for (const line of selectedLines) {
        const view = await orderSessionService.getSessionView(user, session.id);
        if (!view) throw new Error('Order session was not found.');
        await orderSessionService.updateContribution(user, {
          sessionId: session.id,
          expectedSessionRevision: view.session.revision,
          itemId: line.bucketItemId,
          operation: 'set',
          value: line.quantity,
          mutationId: createId('session-mutation'),
        });
      }

      const readyView = await orderSessionService.getSessionView(user, session.id);
      if (readyView?.currentParticipant) {
        await orderSessionService.updateParticipantResponse(user, {
          sessionId: session.id,
          expectedSessionRevision: readyView.session.revision,
          expectedParticipantRevision: readyView.currentParticipant.revision,
          response: PARTICIPANT_RESPONSE.done,
        });
      }

      showToast(translateOrderSession(locale, 'sessionCreated'), 'success');
      await navigate(buildOrderSessionDetailsRoute(session.id));
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  return {
    t,
    gt,
    locale,
    bucket,
    quantities,
    notes,
    setNotes,
    loading,
    busy,
    error,
    step,
    moveTo,
    selectedLines,
    subtotal,
    receipt,
    total,
    canOpenForFriends: Boolean(user && bucket && bucket.ownerId === user.id),
    openForFriendsLabel: OPEN_FOR_FRIENDS_LABELS[locale],
    adjust,
    submit,
    openForFriends,
  };
}
