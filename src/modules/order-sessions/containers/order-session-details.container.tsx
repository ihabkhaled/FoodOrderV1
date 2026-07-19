import '../order-sessions.css';

import { BackLink, ConfirmDialog, ErrorState, Loading } from '@/shared/ui';

import { SessionActionPanel } from '../components/session-action-panel/session-action-panel.component';
import { SessionMenu } from '../components/session-menu/session-menu.component';
import { SessionParticipantList } from '../components/session-participant-list/session-participant-list.component';
import { SessionSummary } from '../components/session-summary/session-summary.component';
import { useSessionCommandCenter } from '../hooks/use-session-command-center.hook';
import { useSessionLifecycleConfirmation } from '../hooks/use-session-lifecycle-confirmation.hook';
import { ORDER_SESSIONS_PATH } from '../routes/order-sessions-route-paths.constants';

export function OrderSessionDetailsContainer() {
  const viewModel = useSessionCommandCenter();
  const confirmation = useSessionLifecycleConfirmation();
  const backLabel = viewModel.translate(viewModel.locale, 'backToSessions');

  if (viewModel.loading) {
    return <Loading label={viewModel.translate(viewModel.locale, 'loadingSession')} />;
  }

  if (!viewModel.view) {
    return (
      <div className="page stack-lg">
        <BackLink fallback={ORDER_SESSIONS_PATH} label={backLabel} />
        <ErrorState
          message={
            viewModel.error ||
            viewModel.translate(viewModel.locale, 'sessionNotFound')
          }
          retryLabel={viewModel.translate(viewModel.locale, 'refresh')}
          onRetry={() => void viewModel.refresh()}
        />
      </div>
    );
  }

  const { session, participants } = viewModel.view;

  return (
    <div className="page session-command-center stack-lg">
      <BackLink fallback={ORDER_SESSIONS_PATH} label={backLabel} />
      <SessionSummary
        session={session}
        locale={viewModel.locale}
        translate={viewModel.translate}
      />
      {viewModel.error ? (
        <div className="inline-error" role="alert">
          <span>{viewModel.error}</span>
          <button
            type="button"
            className="button secondary compact"
            onClick={() => void viewModel.refresh()}
          >
            {viewModel.translate(viewModel.locale, 'refresh')}
          </button>
        </div>
      ) : null}
      <div className="session-command-layout">
        <div className="stack-lg">
          <SessionMenu
            session={session}
            locale={viewModel.locale}
            quantities={viewModel.personalQuantities}
            canContribute={viewModel.canContribute}
            busyItemId={viewModel.busyItemId}
            personalSubtotalMinor={viewModel.personalSubtotalMinor}
            translate={viewModel.translate}
            onQuantityChange={(item, quantity) =>
              void viewModel.changeQuantity(item, quantity)
            }
          />
          <SessionActionPanel
            locale={viewModel.locale}
            isOrganizer={viewModel.isOrganizer}
            canRespond={viewModel.canContribute}
            busy={viewModel.busy}
            actions={viewModel.actions}
            translate={viewModel.translate}
            onDone={() => void viewModel.markDone()}
            onSkip={() => void viewModel.markSkipped()}
            onLifecycleAction={confirmation.request}
          />
        </div>
        <aside className="stack-lg">
          <SessionParticipantList
            participants={participants}
            locale={viewModel.locale}
            translate={viewModel.translate}
          />
          {viewModel.isOrganizer ? (
            <section className="section-card stack">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    {viewModel.translate(
                      viewModel.locale,
                      'pendingParticipants',
                    )}
                  </p>
                  <h2>{viewModel.pending.length}</h2>
                </div>
              </div>
              <p className="muted">
                {viewModel.pending.length === 0
                  ? viewModel.translate(
                      viewModel.locale,
                      'allResponsesComplete',
                    )
                  : viewModel.pending
                      .map((participant) => participant.displayName)
                      .join(', ')}
              </p>
            </section>
          ) : null}
        </aside>
      </div>
      <ConfirmDialog
        open={confirmation.pendingAction !== null}
        title={viewModel.translate(
          viewModel.locale,
          'confirmLifecycleAction',
        )}
        message={viewModel.translate(
          viewModel.locale,
          'confirmLifecycleActionDescription',
        )}
        confirmLabel={
          confirmation.pendingAction
            ? viewModel.translate(
                viewModel.locale,
                confirmation.pendingAction.labelKey,
              )
            : viewModel.translate(viewModel.locale, 'status')
        }
        cancelLabel={backLabel}
        danger={confirmation.pendingAction?.danger ?? false}
        onConfirm={() => void confirmation.confirm(viewModel.transition)}
        onCancel={confirmation.cancel}
      />
    </div>
  );
}
