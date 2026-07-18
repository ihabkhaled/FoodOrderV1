import './session-invites.css';

import { ErrorState, Loading } from '@/shared/ui';

import { GuestSessionOrder } from './components/guest-session-order/guest-session-order.component';
import { SessionInviteLanguageSwitch } from './components/session-invite-language-switch/session-invite-language-switch.component';
import { SessionInvitePreview } from './components/session-invite-preview/session-invite-preview.component';
import { useSessionInvite } from './hooks/use-session-invite.hook';

export function SessionInviteContainer() {
  const viewModel = useSessionInvite();
  const direction = viewModel.locale === 'ar' ? 'rtl' : 'ltr';

  if (viewModel.loading && !viewModel.preview) {
    return (
      <main className="session-invite-page" dir={direction}>
        <Loading
          label={viewModel.translate(viewModel.locale, 'loadingInvite')}
        />
      </main>
    );
  }

  if (!viewModel.preview) {
    return (
      <main className="session-invite-page" dir={direction}>
        <div className="session-invite-shell stack-lg">
          <SessionInviteLanguageSwitch
            locale={viewModel.locale}
            translate={viewModel.translate}
            onChange={viewModel.setLocale}
          />
          <ErrorState
            message={
              viewModel.error ||
              viewModel.translate(viewModel.locale, 'invalidInvite')
            }
            retryLabel={viewModel.translate(viewModel.locale, 'retry')}
            onRetry={() => void viewModel.refresh()}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="session-invite-page" dir={direction}>
      <div className="session-invite-shell stack-lg">
        <SessionInviteLanguageSwitch
          locale={viewModel.locale}
          translate={viewModel.translate}
          onChange={viewModel.setLocale}
        />
        {viewModel.error ? (
          <p className="session-invite-inline-error" role="alert">
            {viewModel.error}
          </p>
        ) : null}
        {viewModel.notice ? (
          <p className="session-invite-inline-notice" role="status">
            {viewModel.notice}
          </p>
        ) : null}
        {viewModel.guestView ? (
          <GuestSessionOrder
            locale={viewModel.locale}
            view={viewModel.guestView}
            busyItemId={viewModel.busyItemId}
            responseBusy={viewModel.responseBusy}
            linking={viewModel.linking}
            authenticated={viewModel.authenticated}
            loginPath={viewModel.loginPath}
            registerPath={viewModel.registerPath}
            translate={viewModel.translate}
            onQuantityChange={(item, quantity) => {
              void viewModel.changeQuantity(item, quantity);
            }}
            onResponseChange={(response) => {
              void viewModel.updateResponse(response);
            }}
            onLinkAccount={() => {
              void viewModel.linkAccount();
            }}
          />
        ) : (
          <SessionInvitePreview
            locale={viewModel.locale}
            preview={viewModel.preview}
            guestName={viewModel.guestName}
            joining={viewModel.joining}
            loginPath={viewModel.loginPath}
            registerPath={viewModel.registerPath}
            translate={viewModel.translate}
            onGuestNameChange={viewModel.setGuestName}
            onJoin={() => {
              void viewModel.join();
            }}
          />
        )}
      </div>
    </main>
  );
}
