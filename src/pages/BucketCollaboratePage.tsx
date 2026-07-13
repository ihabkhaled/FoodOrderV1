import {
  ArrowLeft,
  Lock,
  LogOut,
  RefreshCcw,
  Settings2,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ActivityTimeline } from '@/components/ActivityTimeline';
import {
  CollaborativeItemList,
  type CollaborativePendingChange,
} from '@/components/CollaborativeItemList';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CustomItemPanel } from '@/components/CustomItemPanel';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import type { MessageKey } from '@/i18n/messages';
import { DEFAULT_PRICING_POLICY } from '@/lib/bucket';
import { calculateBasisPointCharge } from '@/lib/groupOrder';
import { createId } from '@/lib/id';
import { formatMoney } from '@/lib/money';
import {
  detectAggregateDrift,
  MAX_CONTRIBUTION_QUANTITY,
  omitKey,
  roleAllows,
} from '@/lib/sharing';
import { sharingService } from '@/services';
import type { SharedBucketView } from '@/services/contracts';
import { useApp } from '@/state/AppContext';
import type {
  Bucket,
  BucketActivityEvent,
  BucketItem,
  BucketRole,
} from '@/types/domain';

const ROLE_LABEL: Record<BucketRole, MessageKey> = {
  owner: 'roleOwner',
  editor: 'roleEditor',
  contributor: 'roleContributor',
  viewer: 'roleViewer',
};

const DEBOUNCE_MS = 500;

const calculateEstimatedTotal = (bucket: Bucket): number => {
  const subtotalMinor = Math.round(
    bucket.items
      .filter((item) => item.active)
      .reduce(
        (total, item) =>
          total + (bucket.aggregate[item.id] ?? 0) * item.unitPrice,
        0,
      ) * 100,
  );
  const policy = bucket.pricingPolicy ?? DEFAULT_PRICING_POLICY;

  return (
    subtotalMinor +
    calculateBasisPointCharge(subtotalMinor, policy.vatBasisPoints) +
    calculateBasisPointCharge(subtotalMinor, policy.serviceBasisPoints) +
    policy.deliveryMinor
  ) / 100;
};

function BucketLifecycleNotice({
  bucket,
  locale,
}: {
  bucket: Bucket;
  locale: 'en' | 'ar';
}) {
  const state = bucket.orderState ?? 'open';
  if (state === 'open') return null;

  return (
    <div className="status-banner warning" role="status">
      <Lock aria-hidden="true" />
      <span>
        {translateGroupOrder(
          locale,
          state === 'ordered' ? 'orderedBucket' : 'frozenBucket',
        )}
      </span>
    </div>
  );
}

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

  const myContribution = useMemo(
    () =>
      view?.contributions.find(
        (contribution) => contribution.userId === user?.id,
      ) ?? null,
    [view, user],
  );
  const drift = useMemo(
    () =>
      view
        ? detectAggregateDrift(view.bucket.aggregate, view.contributions)
        : { drifted: false, expected: {} },
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

  const { bucket, members, contributions, myRole } = view;
  const state = bucket.orderState ?? 'open';
  const isOpen = state === 'open';
  const canContribute = isOpen && roleAllows(myRole, 'contribute');
  const canOrder =
    (state === 'open' || state === 'frozen') &&
    roleAllows(myRole, 'placeGroupOrder');
  const isOwner = myRole === 'owner';
  const currentMember = members.find((member) => member.userId === user.id);
  const canCreateCustomItems =
    isOpen &&
    (isOwner ||
      (currentMember?.canCreateCustomItems === true &&
        bucket.customItemMode !== 'disabled'));
  const canSetCustomItemPrice =
    isOwner || currentMember?.canSetCustomItemPrice === true;
  const activeItems = bucket.items.filter((item) => item.active);
  const pendingItems: BucketItem[] = bucket.items.filter(
    (item) => item.source === 'custom' && item.approvalStatus === 'pending',
  );
  const hasAnyQuantity = activeItems.some(
    (item) => (bucket.aggregate[item.id] ?? 0) > 0,
  );

  return (
    <div className="page narrow stack-lg">
      <Link className="back-link" to="/buckets">
        <ArrowLeft />
        {t('back')}
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{t('groupOrder')}</p>
          <h1>{bucket.title}</h1>
          <p className="muted">
            <Users size={14} aria-hidden="true" /> {members.length} · {t('role')}:{' '}
            {t(ROLE_LABEL[myRole])}
          </p>
        </div>
        <div className="total-block">
          <span>{t('estimated')}</span>
          <strong>
            {formatMoney(calculateEstimatedTotal(bucket), bucket.currency, locale)}
          </strong>
        </div>
      </header>

      <BucketLifecycleNotice bucket={bucket} locale={locale} />
      {drift.drifted ? (
        <section className="notice-card warning" role="alert">
          <p>{t('totalsDriftDetected')}</p>
          {isOwner ? (
            <button
              className="button secondary"
              disabled={repairing}
              onClick={() => {
                void repair();
              }}
            >
              <RefreshCcw />
              {repairing ? t('loading') : t('repairTotals')}
            </button>
          ) : null}
        </section>
      ) : null}

      <CollaborativeItemList
        items={activeItems}
        aggregate={bucket.aggregate}
        contributions={contributions}
        currentUserId={user.id}
        currentQuantities={myContribution?.quantities ?? {}}
        pending={pending}
        currency={bucket.currency}
        locale={locale}
        canContribute={canContribute}
        translate={t}
        onAdjust={adjust}
        onRetry={retry}
      />

      <CustomItemPanel
        locale={locale}
        canCreate={canCreateCustomItems}
        canSetPrice={canSetCustomItemPrice}
        canApprove={isOwner}
        disabled={!isOpen}
        pendingItems={pendingItems}
        onAdd={(input) => {
          void addCustomItem(input);
        }}
        onApprove={(itemId, unitPrice) => {
          void approveCustomItem(itemId, unitPrice);
        }}
      />

      {canOrder ? (
        <section className="section-card stack">
          <label>
            {t('notes')}
            <textarea
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
              }}
              placeholder={t('orderNotesPlaceholder')}
            />
          </label>
          <button
            className="button"
            disabled={ordering || !hasAnyQuantity}
            onClick={() => {
              void placeGroupOrder();
            }}
          >
            <ShoppingCart />
            {ordering ? t('loading') : t('placeGroupOrder')}
          </button>
        </section>
      ) : null}

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('activity')}</p>
            <h2>
              {t('members')}: {members.length}
            </h2>
          </div>
          <div className="row-actions">
            {isOwner ? (
              <Link className="button secondary" to={`/buckets/${bucket.id}/share`}>
                <Settings2 />
                {t('sharing')}
              </Link>
            ) : (
              <button
                className="button danger"
                onClick={() => {
                  setLeaving(true);
                }}
              >
                <LogOut />
                {t('leaveBucket')}
              </button>
            )}
          </div>
        </div>
        <ActivityTimeline events={activity} />
      </section>

      <ConfirmDialog
        open={leaving}
        title={t('leaveBucket')}
        message={t('confirmLeaveBucket')}
        confirmLabel={t('leaveBucket')}
        cancelLabel={t('cancel')}
        danger
        onConfirm={() => {
          void leave();
        }}
        onCancel={() => {
          setLeaving(false);
        }}
      />
    </div>
  );
}
