# data-access

The central domain layer: every domain type, every business-rule helper, and
every persistence adapter (Firebase and local-device) behind one set of
service contracts. Every other feature module reads and writes through this
module instead of talking to Firestore or `localStorage` directly.

## Responsibility

- Owns every domain type: `Bucket`, `Order`, `OrderSession`, `SessionInvite`,
  settlement, social, and notification shapes.
- Owns every business-rule helper as pure, framework-free functions with no
  I/O: bucket construction/lifecycle, order construction/lifecycle, order
  -session and participant-response state machines, the idempotent
  bucket/session contribution mutation engines, invite-link and join-code
  token logic, settlement reconciliation, and the bucket-role permission
  matrix. This is where "the rules" live — gateways call into these helpers
  rather than re-implementing logic.
- Owns two parallel gateway implementations per contract — Firestore/
  Firebase and a `localStorage`-backed "local-device" mode — and picks one
  per contract at module-load time based on `env.firebaseEnabled`.
- Exports ready-to-use singleton services so the rest of the app never
  chooses an implementation itself.

## Public exports (`@/modules/data-access`)

- Singleton services: `authService`, `dataService`, `sharingService`,
  `orderLifecycleService`, `orderSessionService`, `sessionInviteService`,
  `paginationService`, `socialService`, `inviteLinkService`,
  `notificationService`, and `storageMode: 'firebase' | 'local-device'`.
- Named gateway classes for direct construction/testing (e.g.
  `LocalDataService`, `LocalSharingService`, `LocalGroupOrderService`,
  `LocalOrderSessionService`, ...).
- Every domain type (`Bucket`, `Order`, `OrderSession`, `SessionInvite`,
  invite-link, notification, settlement, and social types), enums
  (`ORDER_SESSION_STATUS`, `PARTICIPANT_RESPONSE`, `PAYMENT_STATUS`, ...),
  and re-exported `CurrencyCode`/`Locale`/`Theme`.
- Business-rule helpers grouped by concern: bucket construction/lifecycle
  (`createBucket`, `freezeBucket`, ...), order construction/lifecycle
  (`createOrder`, `transitionOrder`, ...), order-session lifecycle and menu
  snapshotting, the contribution mutation engines
  (`applyContributionMutation`, `applySessionContributionMutation`), invite
  -link tokens (`generateInviteLinkToken`, `isInviteLinkUsable`, ...), bucket
  join codes (`buildJoinCode`, `parseJoinCode`), session guest invites
  (`createSessionInvite`, `createGuestCapability`, ...), settlement
  reconciliation, and role permissions (`roleAllows`, `memberCan`).
- `useCursorPage` — generic cursor-pagination React hook used by any screen
  backed by a pagination-shaped service.

## Structure

- `contracts/` — one `*.interfaces.ts` per service boundary.
- `enums/` — string-const enums for session status, participant response/
  role, payment status, settlement allocation strategy.
- `types/` — the domain type files (`domain.types.ts` is the core Bucket/
  Order/User set) plus a barrel.
- `helpers/` — pure business logic; see Responsibility above.
- `gateways/` — one implementation class per contract, in Firestore/Firebase
  and local-device pairs, plus shared cross-cutting helpers
  (`local-database.helper.ts` owns the local JSON schema and legacy-bucket
  upgrade-on-read; `group-order-gateway.helper.ts` is shared by both
  group-order gateways).
- `hooks/use-cursor-page.hook.ts` — the only React-facing file.
- `index.ts` — the barrel; the only file the rest of the app should import
  from (deep imports into `gateways/`/`contracts/` bypass the Firebase/local
  selection).

## Dependencies

`@/packages/firebase` (SDK wrappers, `withFirebaseErrorTranslation`),
`@/packages/group-order-engine` (receipt/allocation math, re-exported through
`helpers/group-order.helper.ts`), `@/platform/{environment,browser,storage,
crypto,network}`, `@/shared/{helpers,i18n,types}`. No dependency on any other
`@/modules/*` — this module sits at the bottom of the module graph.

## Testing

- `tests/domain/*` — unit tests for every `helpers/` pure function (bucket,
  bucketLifecycle, groupOrder, invite-links, memberPermissions, order,
  order-session, session-contribution, session-invite, settlement, sharing,
  notification-mirror, telemetry-recorder).
- `tests/services/*` — unit tests for the `gateways/` implementations
  (mostly local-device; Firestore behavior mirrored via mocks).
- `tests/bucket-item-suggestions.test.ts`, `tests/bucket-pricing.test.ts`,
  `tests/order-repeat.test.ts` — feature-level tests built on the helpers/
  gateways.
- No e2e spec imports this module directly (e2e seeds/reads the same
  `localStorage` shape via `page.evaluate`), but the whole `tests/e2e/*`
  suite exercises the local gateways end-to-end through the running app.
