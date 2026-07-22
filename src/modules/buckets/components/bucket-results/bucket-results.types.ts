import type { Bucket, Locale } from '@/modules/data-access';
import type { MessageKey } from '@/shared/i18n';

import type { BucketScope } from '../bucket-filters/bucket-filters.types';

export interface BucketResultsProps {
  readonly totalLoaded: number;
  readonly query: string;
  readonly scope: BucketScope;
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
  readonly ownedItems: Bucket[];
  readonly sharedItems: Bucket[];
  readonly ownedLoadingMore: boolean;
  readonly sharedLoadingMore: boolean;
  readonly ownedHasMore: boolean;
  readonly sharedHasMore: boolean;
  readonly ownedError: string;
  readonly sharedError: string;
  readonly onQueryChange: (value: string) => void;
  readonly onScopeChange: (value: BucketScope) => void;
  readonly onOwnedLoadMore: () => void;
  readonly onSharedLoadMore: () => void;
  readonly onDuplicate: (bucket: Bucket) => void;
  readonly onDelete: (bucket: Bucket) => void;
}
