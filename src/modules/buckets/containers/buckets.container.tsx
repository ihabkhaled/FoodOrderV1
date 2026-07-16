import { JOIN_PATH } from '@/modules/group-orders';
import { KeyRound, Plus } from '@/packages/icons';
import { Link } from '@/packages/router';
import { ConfirmDialog, ErrorState, Loading } from '@/shared/ui';

import { BucketResults } from '../components/bucket-results/bucket-results.component';
import { useBuckets } from '../hooks/use-buckets.hook';
import { BUCKET_NEW_PATH } from '../routes/buckets-route-paths.constants';

export function BucketsContainer() {
  const vm = useBuckets();

  if (vm.initialError) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.errorMessage(vm.initialError)}
        onRetry={() => void vm.refresh()}
      />
    );
  }
  if (vm.loading) return <Loading label={vm.t('loading')} />;

  return (
    <div className="page stack-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{vm.t('myBuckets')}</p>
          <h1>{vm.t('buckets')}</h1>
        </div>
        <div className="row-actions">
          <Link className="button secondary" to={JOIN_PATH}>
            <KeyRound />
            {vm.t('joinWithCode')}
          </Link>
          <Link className="button" to={BUCKET_NEW_PATH}>
            <Plus />
            {vm.t('createBucket')}
          </Link>
        </div>
      </div>

      <BucketResults
        totalLoaded={vm.totalLoaded}
        query={vm.query}
        scope={vm.scope}
        locale={vm.locale}
        t={vm.t}
        ownedItems={vm.filteredOwned}
        sharedItems={vm.filteredShared}
        ownedLoadingMore={vm.ownedLoadingMore}
        sharedLoadingMore={vm.sharedLoadingMore}
        ownedHasMore={vm.ownedHasMore}
        sharedHasMore={vm.sharedHasMore}
        ownedError={vm.ownedError ? vm.errorMessage(vm.ownedError) : ''}
        sharedError={vm.sharedError ? vm.errorMessage(vm.sharedError) : ''}
        onQueryChange={(value) => {
          vm.updateSearch('q', value);
        }}
        onScopeChange={(value) => {
          vm.updateSearch('scope', value);
        }}
        onOwnedLoadMore={() => void vm.ownedLoadMore()}
        onSharedLoadMore={() => void vm.sharedLoadMore()}
        onDuplicate={(bucket) => void vm.duplicate(bucket)}
        onDelete={vm.setDeleting}
      />

      <ConfirmDialog
        open={Boolean(vm.deleting)}
        title={vm.t('delete')}
        message={
          vm.deleting?.visibility === 'shared'
            ? vm.t('confirmDeleteSharedBucket')
            : vm.t('confirmDeleteBucket')
        }
        confirmLabel={vm.t('delete')}
        cancelLabel={vm.t('cancel')}
        danger
        onConfirm={() => void vm.remove()}
        onCancel={() => {
          vm.setDeleting(null);
        }}
      />
    </div>
  );
}
