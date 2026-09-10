# session-invites

The public, unauthenticated "join an order round" page at
`/invite/:shareCode`: preview a round invite, join as a guest with no
account, place or adjust per-item quantities and a done/skipped response,
and optionally link that guest contribution to a real account after signing
in. Has its own 13-locale i18n catalog, independent of `@/shared/i18n`.

## Responsibility

- The UI counterpart to [`@/modules/data-access`](../data-access/README.md)'s
  `sessionInviteService` and guest-capability helpers.
- Owns a `localStorage`-backed store for the guest's own capability, so a
  returning visitor doesn't have to re-join.
- Auto-links a guest contribution to the signed-in user's account when
  they're already signed in, or lets them link it after signing in.

## Public exports (`@/modules/session-invites`)

- `sessionInviteRoutes` — mounts `invite/:shareCode` to
  `SessionInviteContainer`, at the top level of the route tree, outside both
  the guest and protected route guards, so it works while signed out.
- `buildSessionInviteRoute(shareCode)` — builds the `/invite/{shareCode}`
  path; used by other modules (e.g. `auth`'s return-to flow) to link back
  into an invite after login.

`SessionInviteContainer`, the hook, the components, and the i18n catalog are
not exported from the barrel — reachable only via deep import.

## Structure

- `session-invite.container.tsx` — top-level screen: loading/error states,
  language switch, then `GuestSessionOrder` (once joined) or
  `SessionInvitePreview` (before joining).
- `hooks/use-session-invite.hook.ts` — the full view-model: loads the
  preview, restores a stored capability, `joinAsGuest`, `changeQuantity`
  (idempotent via a generated mutation id), `updateResponse`, `linkAccount`.
- `components/` — `GuestSessionOrder` (quantity steppers, response buttons,
  link-account CTA), `SessionInvitePreview` (deadline/menu/participant
  metadata, guest-name form, sign-in/register links),
  `SessionInviteLanguageSwitch`.
- `helpers/` — `guest-capability-storage.helper.ts` (validated, self
  -expiring `localStorage` persistence per session id),
  `session-invite-view.helper.ts` (response/deadline/money formatting).
- `i18n/` — its own 13-locale catalog and a standalone `{param}`
  -interpolating translator, independent of `@/shared/i18n`.
- `routes/`, `types/session-invite-ui.types.ts`,
  `session-invites.css` (page-scoped styles).

## Dependencies

`@/modules/data-access` (`sessionInviteService`, `parseSessionShareCode`,
guest/invite types), `@/modules/auth` (return-to sign-in path builders),
`@/modules/order-sessions` (route to the real session after linking),
`@/modules/session` (`useApp`), `@/packages/{router,icons}`,
`@/platform/storage`, `@/shared/{helpers,i18n,ui}`.

## Testing

`tests/components/SessionInvitePreview.test.tsx` (deep import),
`tests/services/guestCapabilityStorage.test.ts`,
`tests/i18n/message-catalog-validation.test.ts` (validates this module's
locale catalogs). `tests/domain/session-invite.test.ts` covers the
underlying `data-access` logic this module calls into, not this module's own
code. No e2e spec navigates to `/invite/:shareCode`.
