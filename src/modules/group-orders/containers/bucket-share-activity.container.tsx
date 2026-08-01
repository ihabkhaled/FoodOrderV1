import { BackLink, ErrorState, Loading } from '@/shared/ui';

import { ActivityTimeline } from '../components/activity-timeline/activity-timeline.component';
import { useBucketShare } from '../hooks/use-bucket-share.hook';
import { buildBucketShareRoute } from '../routes/group-orders-route-paths.constants';

/** The bucket's activity log: joins, orders, and freezes in order. */
export function BucketShareActivityContainer() {
  const vm = useBucketShare();

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  if (!vm.view || vm.error) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.error || vm.t('notAllowed')}
        onRetry={vm.reload}
      />
    );
  }

  const { bucket } = vm.view;

  return (
    <div className="page narrow stack-lg">
      <div className="page-heading">
        <div>
          <BackLink
            fallback={buildBucketShareRoute(bucket.id)}
            label={vm.t('back')}
          />
          <p className="eyebrow">{bucket.title}</p>
          <h1>{vm.t('activity')}</h1>
        </div>
      </div>
      <section className="section-card">
        <ActivityTimeline events={vm.activity} locale={vm.locale} t={vm.t} />
      </section>
    </div>
  );
}
