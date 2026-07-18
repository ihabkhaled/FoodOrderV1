import { ErrorState, Loading } from '@/shared/ui';

import '../order-sessions.css';
import { OrderSessionList } from '../components/order-session-list/order-session-list.component';
import { useOrderSessions } from '../hooks/use-order-sessions.hook';

export function OrderSessionsContainer() {
  const viewModel = useOrderSessions();

  if (viewModel.loading) {
    return <Loading label={viewModel.translate(viewModel.locale, 'loadingSession')} />;
  }

  if (viewModel.error) {
    return (
      <div className="page stack-lg">
        <ErrorState
          message={viewModel.error}
          retryLabel={viewModel.translate(viewModel.locale, 'refresh')}
          onRetry={() => void viewModel.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="page stack-lg">
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            {viewModel.translate(viewModel.locale, 'organizerCommandCenter')}
          </p>
          <h1>{viewModel.translate(viewModel.locale, 'activeOrders')}</h1>
          <p className="muted measure">
            {viewModel.translate(
              viewModel.locale,
              'activeOrdersDescription',
            )}
          </p>
        </div>
      </header>
      {viewModel.sessions.length === 0 ? (
        <section className="section-card empty-session-state stack">
          <h2>{viewModel.translate(viewModel.locale, 'noActiveOrders')}</h2>
          <p className="muted">
            {viewModel.translate(
              viewModel.locale,
              'noActiveOrdersDescription',
            )}
          </p>
        </section>
      ) : (
        <OrderSessionList
          sessions={viewModel.sessions}
          locale={viewModel.locale}
          translate={viewModel.translate}
        />
      )}
    </div>
  );
}
