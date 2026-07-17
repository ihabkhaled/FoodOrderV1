import type { Bucket, Locale } from '@/modules/data-access';
import { Lock } from '@/packages/icons';

import { translateGroupOrder } from '../../i18n/translate-group-order.helper';

interface BucketStateBannerProps {
  bucket: Bucket;
  locale: Locale;
}

export function BucketStateBanner({ bucket, locale }: BucketStateBannerProps) {
  const state = bucket.orderState ?? 'open';
  if (state === 'open') return null;

  const key = state === 'ordered' ? 'orderedBucket' : 'frozenBucket';

  return (
    <div className="status-banner warning" role="status">
      <Lock aria-hidden="true" />
      <span>{translateGroupOrder(locale, key)}</span>
    </div>
  );
}
