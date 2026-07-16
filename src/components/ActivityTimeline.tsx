import type { MessageKey } from '@/i18n/messages';
import { formatDateTime } from '@/lib/date';
import type { BucketActivityEvent, BucketActivityType } from '@/modules/data-access';
import { History } from '@/packages/icons';
import { useApp } from '@/state/AppContext';

const LABELS: Record<BucketActivityType, MessageKey> = {
  bucket_shared: 'activityBucketShared',
  bucket_updated: 'activityBucketUpdated',
  bucket_frozen: 'activityBucketUpdated',
  bucket_unfrozen: 'activityBucketUpdated',
  invite_created: 'activityInviteCreated',
  invite_revoked: 'activityInviteRevoked',
  member_joined: 'activityMemberJoined',
  member_left: 'activityMemberLeft',
  member_revoked: 'activityMemberRevoked',
  member_role_changed: 'activityRoleChanged',
  member_permission_changed: 'activityRoleChanged',
  custom_item_created: 'activityBucketUpdated',
  custom_item_approved: 'activityBucketUpdated',
  custom_item_rejected: 'activityBucketUpdated',
  contribution_updated: 'activityContribution',
  order_placed: 'activityOrderPlaced',
  aggregate_repaired: 'activityAggregateRepaired',
};

const detail = (event: BucketActivityEvent): string => {
  const { itemName, quantity, memberName, total, currency } = event.metadata;
  if (itemName && quantity !== undefined) return `${itemName} × ${quantity}`;
  if (memberName) return memberName;
  if (total && currency) return `${total} ${currency}`;
  return '';
};

export function ActivityTimeline({ events }: { events: BucketActivityEvent[] }) {
  const { t, locale } = useApp();
  if (events.length === 0) return <p className="muted">{t('noActivity')}</p>;
  return (
    <ol className="activity-list">
      {events.map((event) => (
        <li key={event.id} className="activity-row">
          <History aria-hidden="true" />
          <div>
            <p>
              <strong>{event.actorName}</strong> {t(LABELS[event.type])}
              {detail(event) ? <span className="activity-detail"> · {detail(event)}</span> : null}
            </p>
            <span className="muted">{formatDateTime(event.createdAt, locale)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
