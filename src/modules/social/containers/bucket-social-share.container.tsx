import { BackLink, ErrorState, Loading } from '@/shared/ui';

import { BucketSocialSharePanel } from '../components/bucket-social-share-panel/bucket-social-share-panel.container';
import { useBucketSocialShare } from '../hooks/use-bucket-social-share.hook';
import { BUCKETS_REDIRECT_PATH } from '../routes/social-route-paths.constants';

export function BucketSocialShareContainer() {
  const vm = useBucketSocialShare();

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
      <BucketSocialSharePanel
        bucketId={vm.bucket.id}
        locale={vm.locale}
        disabled={(vm.bucket.orderState ?? 'open') !== 'open'}
        onSuccess={vm.handleSuccess}
        onError={vm.handleError}
      />
    </div>
  );
}
