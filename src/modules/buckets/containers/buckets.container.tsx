import { JOIN_PATH } from '@/modules/group-orders';
import { KeyRound, Plus } from '@/packages/icons';
import { Link } from '@/packages/router';
import { ConfirmDialog, ErrorState, FeatureTour } from '@/shared/ui';

import { BucketResults } from '../components/bucket-results/bucket-results.component';
import { useBuckets } from '../hooks/use-buckets.hook';
import { useBucketsTour } from '../hooks/use-buckets-tour.hook';
import { BUCKET_NEW_PATH } from '../routes/buckets-route-paths.constants';

export function BucketsContainer() {
  const vm = useBuckets();
  const {
    setTemplateElement,
    setRoundElement,
    steps: tourSteps,
  } = useBucketsTour();

  if (vm.initialError) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.errorMessage(vm.initialError)}
        onRetry={() => void vm.refresh()}
      />
    );
  }
  // The heading and filters never wait for data; each collection below shows
  // its own placeholder until that collection's first page arrives.
  return (
    <div className="page stack-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{vm.t('myBuckets')}</p>
          <h1>{vm.t('buckets')}</h1>
        </div>
        <div className="row-actions" ref={setRoundElement}>
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

      <div ref={setTemplateElement}>
      <BucketResults
        totalLoaded={vm.totalLoaded}
        query={vm.query}
        scope={vm.scope}
        locale={vm.locale}
        t={vm.t}
        ownedItems={vm.filteredOwned}
        sharedItems={vm.filteredShared}
        ownedLoading={vm.ownedLoading}
        sharedLoading={vm.sharedLoading}
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
      </div>

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

      <FeatureTour
        page="buckets"
        steps={tourSteps}
        nextLabel={vm.t('tourNext')}
        doneLabel={vm.t('tourDone')}
        skipLabel={vm.t('tourSkip')}
        closeLabel={vm.t('close')}
        dontShowAgainLabel={vm.t('tourDontShowAgain')}
      />
    </div>
  );
}
