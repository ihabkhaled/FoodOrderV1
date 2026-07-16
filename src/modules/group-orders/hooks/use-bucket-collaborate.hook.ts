import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  BucketActivityEvent,
  BucketContribution,
  Locale,
  SessionUser,
  SharedBucketView,
} from '@/modules/data-access';
import {
  detectAggregateDrift,
  MAX_CONTRIBUTION_QUANTITY,
  omitKey,
  sharingService,
} from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useNavigate, useParams } from '@/packages/router';
import { createId } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

import type { CollaborativePendingChange } from '../components/collaborative-item-list/collaborative-item-list.component';
import { translateGroupOrder } from '../i18n/translate-group-order.helper';
import {
  BUCKETS_REDIRECT_PATH,
  buildPlacedOrderRedirect,
} from '../routes/group-orders-route-paths.constants';

const DEBOUNCE_MS = 500;

export interface BucketCollaborateViewModel {
  user: SessionUser | null;
  locale: Locale;
  t: (key: MessageKey) => string;
  view: SharedBucketView | null;
  activity: BucketActivityEvent[];
  loading: boolean;
  error: string;
  reload: () => void;
  pending: Record<string, CollaborativePendingChange>;
  myContribution: BucketContribution | null;
  drifted: boolean;
  notes: string;
  setNotes: (notes: string) => void;
  ordering: boolean;
  repairing: boolean;
  leaving: boolean;
  setLeaving: (leaving: boolean) => void;
  adjust: (itemId: string, delta: number) => void;
  retryItem: (itemId: string) => void;
  placeGroupOrder: () => Promise<void>;
  leave: () => Promise<void>;
  repair: () => Promise<void>;
  addCustomItem: (input: {
    name: string;
    description: string;
    category: string;
    unitPrice: number;
  }) => Promise<void>;
  approveCustomItem: (itemId: string, unitPrice: number) => Promise<void>;
}

export function useBucketCollaborate(): BucketCollaborateViewModel {
  const { bucketId } = useParams();
  const navigate = useNavigate();
  const { user, locale, t, showToast } = useApp();
  const gt = (key: Parameters<typeof translateGroupOrder>[1]) =>
    translateGroupOrder(locale, key);
  const [view, setView] = useState<SharedBucketView | null>(null);
  const [activity, setActivity] = useState<BucketActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<
    Record<string, CollaborativePendingChange>
  >({});
  const [notes, setNotes] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    if (!user || !bucketId) return;
    try {
      setError('');
      const [nextView, nextActivity] = await Promise.all([
        sharingService.getSharedBucketView(user, bucketId),
        sharingService.listActivity(user, bucketId).catch(() => []),
      ]);
      if (!nextView) throw new Error(t('notAllowed'));
      setView(nextView);
      setActivity(nextActivity);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    } finally {
      setLoading(false);
    }
  }, [user, bucketId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of Object.values(activeTimers)) {
        clearTimeout(timer);
      }
    };
  }, []);

  const myContribution = useMemo<BucketContribution | null>(
    () =>
      view?.contributions.find(
        (contribution) => contribution.userId === user?.id,
      ) ?? null,
    [view, user],
  );
  const drifted = useMemo(
    () =>
      view
        ? detectAggregateDrift(view.bucket.aggregate, view.contributions)
            .drifted
        : false,
    [view],
  );

  const send = useCallback(
    async (itemId: string, change: CollaborativePendingChange) => {
      if (!user || !bucketId) return;
      setPending((current) => ({
        ...current,
        [itemId]: { ...change, state: 'sending' },
      }));
      try {
        const record = await sharingService.setContribution(
          user,
          bucketId,
          itemId,
          'set',
          change.target,
          change.mutationId,
        );
        setPending((current) => omitKey(current, itemId));
        setView((current) => {
          if (!current) return current;
          const contributions = current.contributions.filter(
            (item) => item.userId !== user.id,
          );
          const mine = current.contributions.find(
            (item) => item.userId === user.id,
          );
          const baseQuantities = mine?.quantities ?? {};
          const quantities =
            record.resultQuantity === 0
              ? omitKey(baseQuantities, itemId)
              : { ...baseQuantities, [itemId]: record.resultQuantity };
          contributions.push({
            bucketId,
            userId: user.id,
            displayName: user.displayName,
            quantities,
            revision: (mine?.revision ?? 0) + 1,
            lastMutationId: record.id,
            updatedAt: record.createdAt,
          });
          const nextTotal =
            (current.bucket.aggregate[itemId] ?? 0) + record.appliedDelta;
          const aggregate =
            nextTotal <= 0
              ? omitKey(current.bucket.aggregate, itemId)
              : { ...current.bucket.aggregate, [itemId]: nextTotal };
          return {
            ...current,
            contributions,
            bucket: {
              ...current.bucket,
              aggregate,
              revision: record.resultRevision,
            },
          };
        });
      } catch {
        setPending((current) => ({
          ...current,
          [itemId]: { ...change, state: 'failed' },
        }));
        showToast(t('contributionFailed'), 'error');
      }
    },
    [user, bucketId, showToast, t],
  );

  const adjust = (itemId: string, delta: number): void => {
    const base =
      pending[itemId]?.target ?? myContribution?.quantities[itemId] ?? 0;
    const target = Math.max(
      0,
      Math.min(MAX_CONTRIBUTION_QUANTITY, base + delta),
    );
    if (target === base && pending[itemId] === undefined) return;
    const existing = pending[itemId];
    const mutationId =
      existing?.state === 'debouncing'
        ? existing.mutationId
        : createId('mutation');
    const change: CollaborativePendingChange = {
      target,
      mutationId,
      state: 'debouncing',
    };
    setPending((current) => ({ ...current, [itemId]: change }));
    clearTimeout(timers.current[itemId]);
    timers.current[itemId] = setTimeout(() => {
      void send(itemId, change);
    }, DEBOUNCE_MS);
  };

  const retryItem = (itemId: string): void => {
    const change = pending[itemId];
    if (change) void send(itemId, change);
  };

  const placeGroupOrder = async (): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      setOrdering(true);
      const order = await sharingService.placeGroupOrder(user, bucketId, notes);
      showToast(t('orderPlaced'), 'success');
      await navigate(buildPlacedOrderRedirect(order.id));
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    } finally {
      setOrdering(false);
    }
  };

  const leave = async (): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      await sharingService.leaveBucket(user, bucketId);
      showToast(t('leftBucket'), 'success');
      await navigate(BUCKETS_REDIRECT_PATH);
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    } finally {
      setLeaving(false);
    }
  };

  const repair = async (): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      setRepairing(true);
      await sharingService.repairAggregate(user, bucketId);
      showToast(t('totalsRepaired'), 'success');
      await load();
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    } finally {
      setRepairing(false);
    }
  };

  const addCustomItem = async (input: {
    name: string;
    description: string;
    category: string;
    unitPrice: number;
  }): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      await sharingService.addCustomItem(user, bucketId, input);
      showToast(gt('customItemAdded'), 'success');
      await load();
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    }
  };

  const approveCustomItem = async (
    itemId: string,
    unitPrice: number,
  ): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      await sharingService.approveCustomItem(user, bucketId, itemId, unitPrice);
      showToast(gt('customItemApproved'), 'success');
      await load();
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    }
  };

  return {
    user,
    locale,
    t,
    view,
    activity,
    loading,
    error,
    reload: () => {
      void load();
    },
    pending,
    myContribution,
    drifted,
    notes,
    setNotes,
    ordering,
    repairing,
    leaving,
    setLeaving,
    adjust,
    retryItem,
    placeGroupOrder,
    leave,
    repair,
    addCustomItem,
    approveCustomItem,
  };
}
