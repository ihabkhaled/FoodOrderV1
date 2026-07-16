import type {
  Bucket,
  BucketActivityEvent,
  BucketContribution,
  BucketItem,
  BucketRole,
  Locale,
  SessionUser,
  SharedBucketView,
} from '@/modules/data-access';
import {
  calculateBasisPointCharge,
  DEFAULT_PRICING_POLICY,
  effectiveCustomItemPermissions,
  roleAllows,
} from '@/modules/data-access';
import {
  ArrowLeft,
  LogOut,
  RefreshCcw,
  Settings2,
  ShoppingCart,
  Users,
} from '@/packages/icons';
import { Link } from '@/packages/router';
import { formatMoney } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';
import { ConfirmDialog } from '@/shared/ui';

import {
  BUCKETS_REDIRECT_PATH,
  buildBucketShareRoute,
} from '../../routes/group-orders-route-paths.constants';
import { ActivityTimeline } from '../activity-timeline/activity-timeline.component';
import type { CollaborativePendingChange } from '../collaborative-item-list/collaborative-item-list.component';
import { CollaborativeItemList } from '../collaborative-item-list/collaborative-item-list.component';
import { CustomItemPanel } from '../custom-item-panel/custom-item-panel.container';
import { BucketLifecycleNotice } from './bucket-lifecycle-notice.component';

const ROLE_LABEL: Record<BucketRole, MessageKey> = {
  owner: 'roleOwner',
  editor: 'roleEditor',
  contributor: 'roleContributor',
  viewer: 'roleViewer',
};

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
    (subtotalMinor +
      calculateBasisPointCharge(subtotalMinor, policy.vatBasisPoints) +
      calculateBasisPointCharge(subtotalMinor, policy.serviceBasisPoints) +
      policy.deliveryMinor) /
    100
  );
};

interface BucketCollaborateContentProps {
  view: SharedBucketView;
  user: SessionUser;
  locale: Locale;
  translate: (key: MessageKey) => string;
  activity: BucketActivityEvent[];
  pending: Record<string, CollaborativePendingChange>;
  myContribution: BucketContribution | null;
  drifted: boolean;
  notes: string;
  ordering: boolean;
  repairing: boolean;
  leaving: boolean;
  onAdjust: (itemId: string, delta: number) => void;
  onRetry: (itemId: string) => void;
  onRepair: () => void;
  onNotesChange: (notes: string) => void;
  onPlaceOrder: () => void;
  onAddCustomItem: (input: {
    name: string;
    description: string;
    category: string;
    unitPrice: number;
  }) => void;
  onApproveCustomItem: (itemId: string, unitPrice: number) => void;
  onRequestLeave: () => void;
  onConfirmLeave: () => void;
  onCancelLeave: () => void;
}

export function BucketCollaborateContent({
  view,
  user,
  locale,
  translate,
  activity,
  pending,
  myContribution,
  drifted,
  notes,
  ordering,
  repairing,
  leaving,
  onAdjust,
  onRetry,
  onRepair,
  onNotesChange,
  onPlaceOrder,
  onAddCustomItem,
  onApproveCustomItem,
  onRequestLeave,
  onConfirmLeave,
  onCancelLeave,
}: BucketCollaborateContentProps) {
  const { bucket, members, contributions, myRole } = view;
  const state = bucket.orderState ?? 'open';
  const isOpen = state === 'open';
  const canContribute = isOpen && roleAllows(myRole, 'contribute');
  const canOrder =
    (state === 'open' || state === 'frozen') &&
    roleAllows(myRole, 'placeGroupOrder');
  const isOwner = myRole === 'owner';
  const currentMember = members.find((member) => member.userId === user.id);
  const customItemPermissions = effectiveCustomItemPermissions(currentMember);
  const canCreateCustomItems =
    isOpen &&
    (isOwner ||
      (customItemPermissions.canCreateCustomItems &&
        bucket.customItemMode !== 'disabled'));
  const canSetCustomItemPrice =
    isOwner || customItemPermissions.canSetCustomItemPrice;
  const activeItems = bucket.items.filter((item) => item.active);
  const pendingItems: BucketItem[] = bucket.items.filter(
    (item) => item.source === 'custom' && item.approvalStatus === 'pending',
  );
  const hasAnyQuantity = activeItems.some(
    (item) => (bucket.aggregate[item.id] ?? 0) > 0,
  );

  return (
    <div className="page narrow stack-lg">
      <Link className="back-link" to={BUCKETS_REDIRECT_PATH}>
        <ArrowLeft />
        {translate('back')}
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{translate('groupOrder')}</p>
          <h1>{bucket.title}</h1>
          <p className="muted">
            <Users size={14} aria-hidden="true" /> {members.length} ·{' '}
            {translate('role')}: {translate(ROLE_LABEL[myRole])}
          </p>
        </div>
        <div className="total-block">
          <span>{translate('estimated')}</span>
          <strong>
            {formatMoney(
              calculateEstimatedTotal(bucket),
              bucket.currency,
              locale,
            )}
          </strong>
        </div>
      </header>

      <BucketLifecycleNotice bucket={bucket} locale={locale} />
      {drifted ? (
        <section className="notice-card warning" role="alert">
          <p>{translate('totalsDriftDetected')}</p>
          {isOwner ? (
            <button
              className="button secondary"
              disabled={repairing}
              onClick={onRepair}
            >
              <RefreshCcw />
              {repairing ? translate('loading') : translate('repairTotals')}
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
        translate={translate}
        onAdjust={onAdjust}
        onRetry={onRetry}
      />

      <CustomItemPanel
        locale={locale}
        canCreate={canCreateCustomItems}
        canSetPrice={canSetCustomItemPrice}
        canApprove={isOwner}
        disabled={!isOpen}
        pendingItems={pendingItems}
        onAdd={onAddCustomItem}
        onApprove={onApproveCustomItem}
      />

      {canOrder ? (
        <section className="section-card stack">
          <label>
            {translate('notes')}
            <textarea
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(event) => {
                onNotesChange(event.target.value);
              }}
              placeholder={translate('orderNotesPlaceholder')}
            />
          </label>
          <button
            className="button"
            disabled={ordering || !hasAnyQuantity}
            onClick={onPlaceOrder}
          >
            <ShoppingCart />
            {ordering ? translate('loading') : translate('placeGroupOrder')}
          </button>
        </section>
      ) : null}

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{translate('activity')}</p>
            <h2>
              {translate('members')}: {members.length}
            </h2>
          </div>
          <div className="row-actions">
            {isOwner ? (
              <Link
                className="button secondary"
                to={buildBucketShareRoute(bucket.id)}
              >
                <Settings2 />
                {translate('sharing')}
              </Link>
            ) : (
              <button className="button danger" onClick={onRequestLeave}>
                <LogOut />
                {translate('leaveBucket')}
              </button>
            )}
          </div>
        </div>
        <ActivityTimeline events={activity} locale={locale} t={translate} />
      </section>

      <ConfirmDialog
        open={leaving}
        title={translate('leaveBucket')}
        message={translate('confirmLeaveBucket')}
        confirmLabel={translate('leaveBucket')}
        cancelLabel={translate('cancel')}
        danger
        onConfirm={onConfirmLeave}
        onCancel={onCancelLeave}
      />
    </div>
  );
}
