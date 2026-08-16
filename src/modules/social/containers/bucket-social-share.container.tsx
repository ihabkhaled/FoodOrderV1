import { Link } from '@/packages/router';
import { BackLink, ErrorState, FeatureTour, Loading } from '@/shared/ui';

import { BucketSocialSharePanel } from '../components/bucket-social-share-panel/bucket-social-share-panel.container';
import { useBucketSocialShare } from '../hooks/use-bucket-social-share.hook';
import { useBucketSocialShareTour } from '../hooks/use-bucket-social-share-tour.hook';
import {
  BUCKETS_REDIRECT_PATH,
  buildBucketOrderRedirect,
} from '../routes/social-route-paths.constants';

export function BucketSocialShareContainer() {
  const vm = useBucketSocialShare();
  const { steps: tourSteps } = useBucketSocialShareTour();

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  if (!vm.bucket || vm.error) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.error || vm.t('notAllowed')}
        onRetry={vm.retry}
      />
    );
  }

  return (
    <div className="page narrow stack-lg">
      <BackLink fallback={BUCKETS_REDIRECT_PATH} label={vm.t('back')} />
      <header className="page-heading">
        <div>
          <p className="eyebrow">{vm.s('shareWithFriends')}</p>
          <h1>{vm.bucket.title}</h1>
        </div>
      </header>

      <ol className="bucket-flow-steps" aria-label={vm.t('createBucket')}>
        <li className="bucket-flow-step bucket-flow-step--done">
          <span>1</span>
          <strong>{vm.t('createBucket')}</strong>
        </li>
        <li className="bucket-flow-step bucket-flow-step--active">
          <span>2</span>
          <strong>{vm.s('shareWithFriends')}</strong>
        </li>
        <li className="bucket-flow-step">
          <span>3</span>
          <strong>{vm.t('orderNow')}</strong>
        </li>
      </ol>

      <BucketSocialSharePanel
        bucketId={vm.bucket.id}
        locale={vm.locale}
        disabled={(vm.bucket.orderState ?? 'open') !== 'open'}
        onSuccess={vm.handleSuccess}
        onError={vm.handleError}
      />

      <div className="guided-next-action section-card">
        <div>
          <p className="eyebrow">3 / 3</p>
          <strong>{vm.t('orderNow')}</strong>
        </div>
        <Link className="button" to={buildBucketOrderRedirect(vm.bucket.id)}>
          {vm.t('orderNow')}
        </Link>
      </div>

      <FeatureTour
        page="social-share"
        steps={tourSteps}
        nextLabel={vm.t('tourNext')}
        doneLabel={vm.t('tourDone')}
        skipLabel={vm.t('tourSkip')}
        closeLabel={vm.t('close')}
        skipAllLabel={vm.t('tourSkipAll')}
      />
    </div>
  );
}
