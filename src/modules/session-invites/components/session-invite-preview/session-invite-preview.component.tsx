import { Link } from '@/packages/router';

import { formatSessionInviteDeadline } from '../../helpers/session-invite-view.helper';
import type { SessionInvitePreviewProps } from '../../types/session-invite-ui.types';

export function SessionInvitePreview({
  locale,
  preview,
  guestName,
  joining,
  loginPath,
  registerPath,
  translate,
  onGuestNameChange,
  onJoin,
}: SessionInvitePreviewProps) {
  const deadline = formatSessionInviteDeadline(preview, locale);

  return (
    <div className="session-invite-preview stack-lg">
      <header className="session-invite-hero stack">
        <span
          className={`session-invite-status ${preview.isCollecting ? 'is-open' : 'is-closed'}`}
        >
          {translate(locale, preview.isCollecting ? 'orderOpen' : 'orderClosed')}
        </span>
        <div className="stack-xs">
          <p className="eyebrow">FoodOrder</p>
          <h1>{preview.title}</h1>
          <p className="muted">
            {translate(locale, 'organizedBy', {
              name: preview.organizerDisplayName,
            })}
          </p>
        </div>
        <p className="session-invite-description">
          {translate(locale, 'pageDescription')}
        </p>
      </header>

      <section
        className="session-invite-metadata"
        aria-label={translate(locale, 'pageTitle')}
      >
        <div>
          <span>{translate(locale, 'deadline')}</span>
          {deadline && preview.deadlineAt ? (
            <time dateTime={preview.deadlineAt}>{deadline}</time>
          ) : (
            <strong>{translate(locale, 'noDeadline')}</strong>
          )}
        </div>
        <div>
          <span>{translate(locale, 'menu')}</span>
          <strong>
            {translate(locale, 'itemsAvailable', {
              count: preview.activeItemCount,
            })}
          </strong>
        </div>
        <div>
          <span>{translate(locale, 'participants')}</span>
          <strong>
            {translate(locale, 'participants', {
              count: preview.participantCount,
            })}
          </strong>
        </div>
      </section>

      <section className="session-invite-join-card stack">
        <div className="stack-xs">
          <p className="eyebrow">{translate(locale, 'secureGuest')}</p>
          <h2>{translate(locale, 'continueAsGuest')}</h2>
          <p className="muted">{translate(locale, 'guestPrivacy')}</p>
        </div>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            onJoin();
          }}
        >
          <label htmlFor="session-invite-guest-name">
            {translate(locale, 'guestName')}
          </label>
          <input
            id="session-invite-guest-name"
            autoComplete="name"
            value={guestName}
            maxLength={120}
            disabled={!preview.isCollecting || joining}
            onChange={(event) => {
              onGuestNameChange(event.target.value);
            }}
          />
          <button
            type="submit"
            className="button"
            disabled={!preview.isCollecting || joining}
          >
            {translate(locale, joining ? 'joining' : 'joinOrder')}
          </button>
        </form>
        <div className="session-invite-account-links">
          <Link to={loginPath}>{translate(locale, 'signIn')}</Link>
          <Link to={registerPath}>{translate(locale, 'register')}</Link>
        </div>
      </section>
    </div>
  );
}
