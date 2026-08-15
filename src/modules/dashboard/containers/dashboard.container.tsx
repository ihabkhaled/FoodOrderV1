import '../dashboard-journey.css';

import { BUCKET_NEW_PATH, BUCKETS_PATH } from '@/modules/buckets';
import { ORDERS_PATH } from '@/modules/orders';
import { SOCIAL_PATH } from '@/modules/social';
import {
  CheckCircle2,
  ClipboardList,
  Plus,
  ShoppingBasket,
  Users,
  Utensils,
} from '@/packages/icons';
import { Link, useNavigate } from '@/packages/router';
import { ErrorState, FeatureTour, SkeletonSection } from '@/shared/ui';

import type { DashboardStatCard } from '../components/dashboard-stat-grid/dashboard-stat-grid.component';
import { DashboardStatGrid } from '../components/dashboard-stat-grid/dashboard-stat-grid.component';
import { RecentOrdersSection } from '../components/recent-orders-section/recent-orders-section.component';
import { useDashboard } from '../hooks/use-dashboard.hook';
import { useDashboardTour } from '../hooks/use-dashboard-tour.hook';

export function DashboardContainer() {
  const navigate = useNavigate();
  const vm = useDashboard();
  const { setStatsElement, setCreateElement, steps: tourSteps } =
    useDashboardTour();

  if (vm.error) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.errorMessage(vm.error)}
        onRetry={() => void vm.load()}
      />
    );
  }

  const summary = vm.summary;
  const cards: DashboardStatCard[] = summary
    ? [
        {
          label: vm.t('bucketCount'),
          value: summary.bucketCount,
          icon: ShoppingBasket,
          to: `${BUCKETS_PATH}?scope=owned`,
        },
        {
          label: vm.t('sharedBucketCount'),
          value: summary.sharedBucketCount,
          icon: Users,
          to: `${BUCKETS_PATH}?scope=shared`,
        },
        {
          label: vm.t('itemCount'),
          value: summary.activeItemCount,
          icon: Utensils,
          to: `${BUCKETS_PATH}?scope=owned`,
        },
        {
          label: vm.t('orderCount'),
          value: summary.orderCount,
          icon: ClipboardList,
          to: ORDERS_PATH,
        },
        {
          label: vm.t('placedCount'),
          value: summary.placedOrderCount,
          icon: CheckCircle2,
          to: `${ORDERS_PATH}?status=placed`,
        },
        {
          label: vm.t('completedOrders'),
          value: summary.completedOrderCount,
          icon: CheckCircle2,
          to: `${ORDERS_PATH}?status=completed`,
        },
      ]
    : [];

  return (
    <div className="page stack-lg dashboard-page">
      <section className="hero-card dashboard-hero">
        <div>
          <p className="eyebrow">{vm.t('welcome')}</p>
          <h1>{vm.profile?.fullName ?? vm.user?.displayName}</h1>
          <p>{vm.t('quickStart')}</p>
        </div>
        <div ref={setCreateElement}>
          <Link className="button dashboard-primary-action" to={BUCKET_NEW_PATH}>
            <Plus />
            {vm.t('createBucket')}
          </Link>
        </div>
      </section>

      <ol className="dashboard-journey" aria-label={vm.t('quickStart')}>
        <li>
          <span className="dashboard-journey__number">1</span>
          <button
            type="button"
            className="dashboard-journey__step"
            onClick={() => {
              void navigate(BUCKET_NEW_PATH);
            }}
          >
            <ShoppingBasket />
            <strong>{vm.t('createBucket')}</strong>
          </button>
        </li>
        <li>
          <span className="dashboard-journey__number">2</span>
          <Link to={SOCIAL_PATH}>
            <Users />
            <strong>{vm.t('members')}</strong>
          </Link>
        </li>
        <li>
          <span className="dashboard-journey__number">3</span>
          <Link to={ORDERS_PATH}>
            <ClipboardList />
            <strong>{vm.t('orders')}</strong>
          </Link>
        </li>
      </ol>

      {summary ? (
        <div ref={setStatsElement} className="dashboard-insights">
          <DashboardStatGrid cards={cards} ariaLabel={vm.t('dashboard')} />
        </div>
      ) : (
        <SkeletonSection
          label={vm.t('loading')}
          variant="stat"
          count={6}
        />
      )}

      {summary ? (
        <RecentOrdersSection
          recentOrders={summary.recentOrders}
          locale={vm.locale}
          t={vm.t}
        />
      ) : (
        <SkeletonSection label={vm.t('loading')} variant="row" count={3} />
      )}

      <FeatureTour
        page="dashboard"
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
