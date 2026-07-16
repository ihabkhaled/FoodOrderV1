import type { Bucket, Locale } from '@/modules/data-access';

import { translateGroupOrder } from '../../i18n/translate-group-order.helper';

interface BucketLifecycleNoticeProps {
  bucket: Bucket;
  locale: Locale;
}

export function BucketLifecycleNotice({
  bucket,
  locale,
}: BucketLifecycleNoticeProps) {
  const state = bucket.orderState ?? 'open';
  if (state === 'open') return null;

  return (
    <div className="status-banner warning" role="status">
      <span>
        {translateGroupOrder(
          locale,
          state === 'ordered' ? 'orderedBucket' : 'frozenBucket',
        )}
      </span>
    </div>
  );
}
