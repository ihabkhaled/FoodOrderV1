import { BUCKET_NEW_PATH, BUCKETS_PATH } from '@/modules/buckets';
import { ORDERS_PATH } from '@/modules/orders';
import {
  CheckCircle2,
  ClipboardList,
  Plus,
  ShoppingBasket,
  Users,
  Utensils,
} from '@/packages/icons';
import { Link } from '@/packages/router';
import { ErrorState, Loading } from '@/shared/ui';

import type { DashboardStatCard } from '../components/dashboard-stat-grid/dashboard-stat-grid.component';
import { DashboardStatGrid } from '../components/dashboard-stat-grid/dashboard-stat-grid.component';
import { RecentOrdersSection } from '../components/recent-orders-section/recent-orders-section.component';
import { useDashboard } from '../hooks/use-dashboard.hook';

export function DashboardContainer() {
  const vm = useDashboard();

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
  if (!summary) return <Loading label={vm.t('loading')} />;

  const cards: DashboardStatCard[] = [
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
      label: vm.locale === 'ar' ? 'الطلبات المكتملة' : 'Completed orders',
      value: summary.completedOrderCount,
      icon: CheckCircle2,
      to: `${ORDERS_PATH}?status=completed`,
    },
  ];

  return (
    <div className="page stack-lg">
      <section className="hero-card">
        <div>
          <p className="eyebrow">{vm.t('welcome')}</p>
          <h1>{vm.profile?.fullName ?? vm.user?.displayName}</h1>
          <p>{vm.t('quickStart')}</p>
        </div>
        <Link className="button" to={BUCKET_NEW_PATH}>
          <Plus />
          {vm.t('createBucket')}
        </Link>
      </section>

      <DashboardStatGrid cards={cards} ariaLabel={vm.t('dashboard')} />

      <RecentOrdersSection
        recentOrders={summary.recentOrders}
        locale={vm.locale}
        t={vm.t}
      />
    </div>
  );
}
