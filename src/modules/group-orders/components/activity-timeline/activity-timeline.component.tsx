import type {
  BucketActivityEvent,
  BucketActivityType,
  Locale,
} from '@/modules/data-access';
import { History } from '@/packages/icons';
import { formatDateTime } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

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

interface ActivityTimelineProps {
  events: BucketActivityEvent[];
  locale: Locale;
  t: (key: MessageKey) => string;
}

export function ActivityTimeline({ events, locale, t }: ActivityTimelineProps) {
  if (events.length === 0) return <p className="muted">{t('noActivity')}</p>;
  return (
    <ol className="activity-list">
      {events.map((event) => (
        <li key={event.id} className="activity-row">
          <History aria-hidden="true" />
          <div className="activity-copy">
            <p className="activity-message">
              <strong>
                <bdi>{event.actorName}</bdi>
              </strong>
              <span>
                <bdi>{t(LABELS[event.type])}</bdi>
              </span>
              {detail(event) ? (
                <span className="activity-detail">
                  <span className="activity-separator" aria-hidden="true">
                    ·
                  </span>{' '}
                  <bdi>{detail(event)}</bdi>
                </span>
              ) : null}
            </p>
            <span className="muted">
              {formatDateTime(event.createdAt, locale)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
