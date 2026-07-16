import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BucketCollaborateContent,
} from '@/components/BucketCollaborateContent';
import type { CollaborativePendingChange } from '@/components/CollaborativeItemList';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import { createId } from '@/lib/id';
import type { BucketActivityEvent, BucketContribution,SharedBucketView } from '@/modules/data-access';
import { detectAggregateDrift, MAX_CONTRIBUTION_QUANTITY, omitKey, sharingService } from '@/modules/data-access';
import { useNavigate, useParams } from '@/packages/router';
import { useApp } from '@/state/AppContext';

const DEBOUNCE_MS = 500;

export function BucketCollaboratePage() {
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
  const timers = useRef<Record<string, number>>({});

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
        window.clearTimeout(timer);
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
        ? detectAggregateDrift(view.bucket.aggregate, view.contributions).drifted
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

  const adjust = (itemId: string, delta: number) => {
    const base =
      pending[itemId]?.target ?? myContribution?.quantities[itemId] ?? 0;
    const target = Math.max(
      0,
      Math.min(MAX_CONTRIBUTION_QUANTITY, base + delta),
    );
    if (target === base && pending[itemId] === undefined) return;
    const existing = pending[itemId];
    const mutationId =
      existing?.state === 'debouncing' ? existing.mutationId : createId('mutation');
    const change: CollaborativePendingChange = {
      target,
      mutationId,
      state: 'debouncing',
    };
    setPending((current) => ({ ...current, [itemId]: change }));
    window.clearTimeout(timers.current[itemId]);
    timers.current[itemId] = window.setTimeout(() => {
      void send(itemId, change);
    }, DEBOUNCE_MS);
  };

  const retry = (itemId: string) => {
    const change = pending[itemId];
    if (change) void send(itemId, change);
  };

  const placeGroupOrder = async () => {
    if (!user || !bucketId) return;
    try {
      setOrdering(true);
      const order = await sharingService.placeGroupOrder(user, bucketId, notes);
      showToast(t('orderPlaced'), 'success');
      await navigate(`/orders/${order.id}`);
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setOrdering(false);
    }
  };

  const leave = async () => {
    if (!user || !bucketId) return;
    try {
      await sharingService.leaveBucket(user, bucketId);
      showToast(t('leftBucket'), 'success');
      await navigate('/buckets');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setLeaving(false);
    }
  };

  const repair = async () => {
    if (!user || !bucketId) return;
    try {
      setRepairing(true);
      await sharingService.repairAggregate(user, bucketId);
      showToast(t('totalsRepaired'), 'success');
      await load();
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setRepairing(false);
    }
  };

  const addCustomItem = async (input: {
    name: string;
    description: string;
    category: string;
    unitPrice: number;
  }) => {
    if (!user || !bucketId) return;
    try {
      await sharingService.addCustomItem(user, bucketId, input);
      showToast(gt('customItemAdded'), 'success');
      await load();
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  const approveCustomItem = async (itemId: string, unitPrice: number) => {
    if (!user || !bucketId) return;
    try {
      await sharingService.approveCustomItem(user, bucketId, itemId, unitPrice);
      showToast(gt('customItemApproved'), 'success');
      await load();
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  if (loading) return <Loading />;
  if (!view || !user || error) {
    return (
      <ErrorState
        message={error || t('notAllowed')}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  return (
    <BucketCollaborateContent
      view={view}
      user={user}
      locale={locale}
      translate={t}
      activity={activity}
      pending={pending}
      myContribution={myContribution}
      drifted={drifted}
      notes={notes}
      ordering={ordering}
      repairing={repairing}
      leaving={leaving}
      onAdjust={adjust}
      onRetry={retry}
      onRepair={() => {
        void repair();
      }}
      onNotesChange={setNotes}
      onPlaceOrder={() => {
        void placeGroupOrder();
      }}
      onAddCustomItem={(input) => {
        void addCustomItem(input);
      }}
      onApproveCustomItem={(itemId, unitPrice) => {
        void approveCustomItem(itemId, unitPrice);
      }}
      onRequestLeave={() => {
        setLeaving(true);
      }}
      onConfirmLeave={() => {
        void leave();
      }}
      onCancelLeave={() => {
        setLeaving(false);
      }}
    />
  );
}
