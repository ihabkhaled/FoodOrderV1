import type { Bucket, Locale } from '@/modules/data-access';
import { buildBucketCollaborateRoute } from '@/modules/group-orders';
import { Users } from '@/packages/icons';
import { Link } from '@/packages/router';
import { formatDateTime } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

import { BUCKETS_NAVIGATION_STATE } from '../../routes/buckets-route-paths.constants';

interface SharedBucketCardProps {
  readonly bucket: Bucket;
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
}

export function SharedBucketCard({
  bucket,
  locale,
  t,
}: SharedBucketCardProps) {
  return (
    <article className="bucket-card">
      <div className="bucket-card-top">
        <div className="bucket-icon shared">
          <Users />
        </div>
        <span className="mode-pill">{bucket.ownerName}</span>
      </div>
      <div>
        <h2>{bucket.title}</h2>
        <p>{bucket.description || `${bucket.items.length} ${t('items')}`}</p>
      </div>
      <div className="bucket-meta">
        <span>
          {bucket.items.filter((item) => item.active).length}{' '}
          {t('availableCount')}
        </span>
        <span>{formatDateTime(bucket.updatedAt, locale)}</span>
      </div>
      <div className="card-actions">
        <Link
          className="button"
          to={buildBucketCollaborateRoute(bucket.id)}
          state={BUCKETS_NAVIGATION_STATE}
        >
          <Users />
          {t('collaborate')}
        </Link>
      </div>
    </article>
  );
}
