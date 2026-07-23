import { Search } from '@/packages/icons';
import type { MessageKey } from '@/shared/i18n';

import type {
  BucketFiltersProps,
  BucketScope,
} from './bucket-filters.types';

const scopes: BucketScope[] = ['all', 'owned', 'shared'];

const scopeLabel = (
  scope: BucketScope,
  t: (key: MessageKey) => string,
): string => {
  if (scope === 'all') return t('all');
  return scope === 'owned' ? t('myBuckets') : t('sharedWithMe');
};

export function BucketFilters({
  query,
  scope,
  t,
  onQueryChange,
  onScopeChange,
}: BucketFiltersProps) {
  return (
    <>
      <label className="search-field">
        <Search />
        <input
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          placeholder={t('searchBuckets')}
          aria-label={t('searchBuckets')}
        />
      </label>
      <div className="filter-tabs" role="group" aria-label={t('buckets')}>
        {scopes.map((value) => (
          <button
            type="button"
            key={value}
            className={scope === value ? 'active' : ''}
            onClick={() => {
              onScopeChange(value);
            }}
          >
            {scopeLabel(value, t)}
          </button>
        ))}
      </div>
    </>
  );
}
