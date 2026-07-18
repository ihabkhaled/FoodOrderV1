# order-sessions

Independent live ordering sessions created from reusable bucket/menu templates.

## Responsibility

- Lists active sessions for organizers and participants.
- Opens a session from an immutable menu/pricing snapshot.
- Presents participant response state, quantities, deadline, expected totals, and lifecycle status.
- Provides the organizer command center for response readiness and lifecycle transitions.
- Keeps reusable menus independent from live aggregates and status.

## Public surface (`@/modules/order-sessions`)

- `orderSessionsRoutes` for protected route composition.
- `ORDER_SESSIONS_PATH`, create/details route patterns, and route builders.
- The module does not expose internal hooks or components.

## Data and trust boundary

All persistence is consumed through `@/modules/data-access`'s `orderSessionService` contract.

- Local mode uses deterministic device tables for development and E2E.
- Firebase mode uses authenticated V170 callables only.
- Direct Firestore reads/writes to `orderSessions/**` are denied.
- Session lifecycle is organizer-only.
- Participants mutate only their own response and contribution.
- Every collaborative mutation carries expected revisions; contribution mutations also carry an idempotency ID.
- Session items, minor-unit prices, and pricing policy are immutable snapshots from the source menu revision.

## Structure

- `routes/`: route ownership and builders.
- `containers/`: screen composition over one project hook.
- `hooks/`: list, create, command-center, and confirmation behavior.
- `components/`: hook-free list, status, creation, menu, participant, summary, and action UI.
- `helpers/`: presentation-only derivations and formatting.
- `i18n/`: complete English/Arabic feature catalog.
- `types/`: feature-owned presentation contracts.

## Testing

- Pure lifecycle, contribution, snapshot, pricing, and settlement tests under `tests/domain/`.
- Local service contract journey under `tests/services/localOrderSessionService.test.ts`.
- Callable Functions tests and emulator-integrated journey are required before release.
- Direct Firestore denial coverage lives in `tests/firebase/order-session.rules.test.ts`.
- Screen behavior requires Playwright coverage across desktop, mobile, tablet, Firefox, WebKit, and mobile Safari web/PWA.
