# network

Network/connectivity adapters and the two unauthenticated public HTTP form
submissions.

## Responsibility

- Online/offline detection, combining native Capacitor `Network` status with
  browser `navigator.onLine`/events.
- The public contact form and the "forgot password" email request — the
  only two places the app makes an unauthenticated HTTP call to its own API
  routes.

## Public exports (`@/platform/network`)

- `submitContactForm(form)` — POSTs to `/api/contact`, throws on a non-ok
  response or `body.ok !== true`.
- `ContactSubmissionResult` (type) — `{ ok: boolean; previewUrl?: string }`.
- `getNetworkStatus()` — async connectivity check via Capacitor
  `Network.getStatus()`.
- `isNavigatorOnline()` — synchronous `navigator.onLine` fallback.
- `subscribeToOnlineChange(listener)` — browser `online`/`offline` events.
- `requestPasswordResetEmail(email, locale)` — POSTs to
  `/api/password-reset`, throws on a non-ok response.

## Structure

- `contact-submission.adapter.ts` + `.interfaces.ts`.
- `network-status.adapter.ts` — dual native + browser connectivity check.
- `password-reset-request.adapter.ts`.

## Dependencies

`@/packages/capacitor-network` (`Network`). No `@/shared/*` or other
`@/platform/*` imports.

## Testing

`tests/api/password-reset.test.ts` exercises the `/api/password-reset`
server endpoint this adapter calls (server-side, not this adapter file
directly).
