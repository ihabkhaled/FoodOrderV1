import type { Locale } from '@/modules/data-access';
import type { MessageKey } from '@/shared/i18n';

export type BucketScope = 'all' | 'owned' | 'shared';

export interface BucketFiltersProps {
  readonly query: string;
  readonly scope: BucketScope;
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
  readonly onQueryChange: (value: string) => void;
  readonly onScopeChange: (scope: BucketScope) => void;
}
