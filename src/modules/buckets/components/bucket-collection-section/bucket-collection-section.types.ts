import type { Bucket, Locale } from '@/modules/data-access';
import type { MessageKey } from '@/shared/i18n';

export interface BucketCollectionSectionProps {
  readonly kind: 'owned' | 'shared';
  readonly items: Bucket[];
  readonly locale: Locale;
  readonly query: string;
  readonly loadingMore: boolean;
  readonly hasMore: boolean;
  readonly error: string;
  readonly t: (key: MessageKey) => string;
  readonly onLoadMore: () => void;
  readonly onRetry: () => void;
  readonly onDuplicate: (bucket: Bucket) => void;
  readonly onDelete: (bucket: Bucket) => void;
}
