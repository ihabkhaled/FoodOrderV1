import type { MessageKey } from '@/i18n/messages';
import type { Locale } from '@/modules/data-access';
import { Search } from '@/packages/icons';

export type BucketScope = 'all' | 'owned' | 'shared';

interface BucketFiltersProps {
  readonly query: string;
  readonly scope: BucketScope;
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
  readonly onQueryChange: (value: string) => void;
  readonly onScopeChange: (scope: BucketScope) => void;
}

const scopes: BucketScope[] = ['all', 'owned', 'shared'];

const scopeLabel = (
  scope: BucketScope,
  locale: Locale,
  t: (key: MessageKey) => string,
): string => {
  if (scope === 'all') return locale === 'ar' ? 'الكل' : 'All';
  return scope === 'owned' ? t('myBuckets') : t('sharedWithMe');
};

export function BucketFilters({
  query,
  scope,
  locale,
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
            {scopeLabel(value, locale, t)}
          </button>
        ))}
      </div>
    </>
  );
}
