import '../order-sessions.css';

import { BackLink, ErrorState, Loading } from '@/shared/ui';

import { CreateOrderSessionForm } from '../components/create-order-session-form/create-order-session-form.component';
import { useCreateOrderSession } from '../hooks/use-create-order-session.hook';
import { ORDER_SESSIONS_PATH } from '../routes/order-sessions-route-paths.constants';

export function CreateOrderSessionContainer() {
  const viewModel = useCreateOrderSession();
  const backLabel = viewModel.translate(viewModel.locale, 'backToSessions');

  if (viewModel.loading) {
    return <Loading label={viewModel.translate(viewModel.locale, 'loadingSession')} />;
  }

  if (!viewModel.menu) {
    return (
      <div className="page narrow stack-lg">
        <BackLink fallback={ORDER_SESSIONS_PATH} label={backLabel} />
        <ErrorState
          message={viewModel.error}
          retryLabel={viewModel.translate(viewModel.locale, 'refresh')}
        />
      </div>
    );
  }

  return (
    <div className="page narrow stack-lg">
      <BackLink fallback={ORDER_SESSIONS_PATH} label={backLabel} />
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            {viewModel.translate(viewModel.locale, 'createFromMenu')}
          </p>
          <h1>{viewModel.translate(viewModel.locale, 'createSession')}</h1>
          <p className="muted measure">
            {viewModel.translate(
              viewModel.locale,
              'createSessionDescription',
            )}
          </p>
        </div>
      </header>
      <section className="session-source-card stack-xs">
        <strong>{viewModel.menu.title}</strong>
        <span className="muted">
          {viewModel.translate(viewModel.locale, 'sourceMenuSnapshotDescription')}
        </span>
      </section>
      <CreateOrderSessionForm
        titleLabel={viewModel.translate(viewModel.locale, 'titleOptional')}
        deadlineLabel={viewModel.translate(
          viewModel.locale,
          'deadlineOptional',
        )}
        timezoneLabel={viewModel.translate(viewModel.locale, 'timezone')}
        autoLockLabel={viewModel.translate(viewModel.locale, 'autoLock')}
        submitLabel={viewModel.translate(viewModel.locale, 'openSession')}
        savingLabel={viewModel.translate(viewModel.locale, 'saving')}
        title={viewModel.title}
        deadline={viewModel.deadline}
        timezone={viewModel.timezone}
        autoLock={viewModel.autoLock}
        saving={viewModel.saving}
        error={viewModel.error}
        onTitleChange={viewModel.setTitle}
        onDeadlineChange={viewModel.setDeadline}
        onTimezoneChange={viewModel.setTimezone}
        onAutoLockChange={viewModel.setAutoLock}
        onSubmit={(event) => void viewModel.submit(event)}
      />
    </div>
  );
}
