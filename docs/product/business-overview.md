# Business overview

What FoodOrderV1 actually does, in terms of the domain rules that hold
regardless of which screen or module implements them. The root
[README.md](../../README.md) has the elevator pitch and runtime modes; each
module's own `README.md` has its implementation detail. This page is the
layer between them — the business logic that spans more than one module, for
someone who needs the rules, not the code.

## Domain objects and their lifecycle

- **Bucket (shown to users as a "menu")** — a reusable list of items with a
  currency and pricing policy. `visibility` is `private` or `shared`.
  `orderState` moves `open → frozen → ordering → ordered`: frozen stops new
  contributions without deleting them, `ordering` marks an order placed from
  the bucket in progress, `ordered` is terminal for that round. Every write
  carries a `schemaVersion` and a `revision` used for optimistic concurrency.
  Owned by [`@/modules/buckets`](../../src/modules/buckets/README.md) (the
  editor and collection screens) and
  [`@/modules/group-orders`](../../src/modules/group-orders/README.md) (the
  collaborative and sharing screens); the type itself lives in
  [`@/modules/data-access`](../../src/modules/data-access/README.md).
- **Order** — a personal snapshot created from a bucket: `draft → placed →
  completed/cancelled`. Owned by
  [`@/modules/orders`](../../src/modules/orders/README.md).
- **Order session (shown to users as a "round")** — an independent, live
  ordering event created from an immutable menu/pricing snapshot, so editing
  the source bucket afterward never changes a round already in progress.
  Session lifecycle transitions are organizer-only; a participant may only
  mutate their own response and contribution, and every collaborative
  mutation carries an expected revision (contributions also carry an
  idempotency ID) so concurrent edits cannot silently clobber each other.
  Owned by
  [`@/modules/order-sessions`](../../src/modules/order-sessions/README.md).
- **Group order** — real-time collaborative contribution to a shared bucket:
  debounced quantity updates with drift detection/repair, custom items that
  can require approval (`customItemMode`: `disabled` / `proposal` /
  `direct`), and a snapshot of everyone's contribution when the order is
  placed. Owned by
  [`@/modules/group-orders`](../../src/modules/group-orders/README.md).
- **Invite / share** — join-by-code and shareable invite links for buckets,
  friendships, and groups. Invite links are multi-use, revocable, idempotent,
  and redeemed only by callables holding admin rights (never a direct
  Firestore write). `InviteStatus` is `pending → accepted / revoked /
  expired`.
- **Friend / group** — the social graph a bucket or invite link can target.
  Owned by [`@/modules/social`](../../src/modules/social/README.md).
- **Notification** — in-app, mirrored to the OS tray with permission prompts
  and tap-to-open routing. Owned by
  [`@/modules/notifications`](../../src/modules/notifications/README.md).

## Who can do what: bucket roles

A bucket member's `BucketRole` is one of `owner`, `editor`, `contributor`,
`viewer`. As of v1.11.0 these are put to the person as what they can
actually do, not the role noun, in every one of the thirteen supported
languages:

| Role | Shown to the person as |
| --- | --- |
| `owner` | (implicit — the person who created the bucket) |
| `editor` | "Can change the menu" |
| `contributor` | "Can order" |
| `viewer` | "Can only look" |

Removing someone's access is offered as "Remove access", not "Revoke".

## Pricing policy

Every bucket that can be ordered from carries a `BucketPricingPolicy`:

- `vatBasisPoints`, `serviceBasisPoints` — VAT and service charge rates, in
  basis points (1/100 of a percent) so charges are computed in integer minor
  units, never floating point.
- `deliveryMinor` — a flat delivery charge, in the currency's minor unit.
- `vatAllocation`, `serviceAllocation`, `deliveryAllocation` — each is
  `equal` (split evenly across participants) or `proportional` (split by
  each participant's share of the subtotal). VAT, service, and delivery can
  each use a different allocation strategy on the same bucket.

Pricing policy is set at bucket creation/edit time and is preserved when a
bucket is duplicated. An order session snapshots the bucket's pricing policy
at creation time, so changing a bucket's prices later never reaches back
into a round already running.

## Monetization: plans and entitlements

Owned entirely by [`@/modules/billing`](../../src/modules/billing/README.md),
which defines three product plans — **Free**, **Organizer Pro**, and
**Business Workspace** — and resolves a trusted subscription record into an
immutable entitlement snapshot that both server and client evaluate the same
way. The module is pure policy: it does not itself talk to a payment
provider, and it explicitly does not touch group-order participant payments
or order settlement, which are a separate domain. A UI-side entitlement
check is explanatory only; the server (Functions/webhook handlers) is the
only thing that can authorize a paid capability, and provider
customer/subscription references belong in owner-only documents.

## Consent and telemetry

[`@/modules/telemetry`](../../src/modules/telemetry/README.md) gates every
recorded event on the person's analytics consent level (`denied`,
`operational_only`, `product_analytics`, `product_and_marketing`) before the
event is even constructed, and rejects PII-shaped values (emails, URLs, free
-form nested payloads) at the type level. Nothing is uploaded to a vendor
today: consented events go into a rolling, device-local window the person
can see the count of and erase from Settings → Privacy. An analytics
adapter failure is designed to never break an ordering action.

## Runtime modes and locale

The whole product runs in two data modes — Firebase (cloud identity,
Firestore persistence and realtime collaboration, enforced by
`firestore.rules`) or local-device (browser/local storage, used for
evaluation, development, and every Playwright e2e test via
`VITE_FORCE_LOCAL_MODE=true`) — behind the same module code; see the root
README for how that's selected. Language, currency, and theme are runtime
profile settings available in thirteen locales (English, Arabic, Arabic
Franco, Italian, Persian, French, German, Spanish, Portuguese, Hindi, Thai,
Simplified Chinese, Japanese), six of them RTL-aware.

## Module map

One line each; follow the link for what a module actually exports and how
it's tested.

| Module | Owns |
| --- | --- |
| [auth](../../src/modules/auth/README.md) | Login, register, forgot/reset password |
| [buckets](../../src/modules/buckets/README.md) | Bucket (menu) collection and editor |
| [group-orders](../../src/modules/group-orders/README.md) | Collaboration, sharing, invites/permissions, join-by-code |
| [order-sessions](../../src/modules/order-sessions/README.md) | Rounds: live sessions from a menu snapshot |
| [orders](../../src/modules/orders/README.md) | Personal order lifecycle |
| [social](../../src/modules/social/README.md) | Friends, groups, group invitations |
| [notifications](../../src/modules/notifications/README.md) | In-app + OS notification center |
| [dashboard](../../src/modules/dashboard/README.md) | Home screen |
| [settings](../../src/modules/settings/README.md) | Preferences, privacy, security, data & account |
| [billing](../../src/modules/billing/README.md) | Plans, entitlements, usage limits |
| [telemetry](../../src/modules/telemetry/README.md) | Consent-gated analytics and reliability events |
| [public-content](../../src/modules/public-content/README.md) | Marketing site, SEO, contact form |
| [data-access](../../src/modules/data-access/README.md) | Domain types and the cloud/local persistence gateways every other module reads and writes through |
| [session](../../src/modules/session/README.md) | Signed-in app-wide state: profile, resolved locale/theme/currency, toasts |
| [invite-links](../../src/modules/invite-links/README.md) | Shareable links for a bucket, friend, or group; create, preview, redeem |
| [session-invites](../../src/modules/session-invites/README.md) | The public, no-account "join a round" page and its own guest-capability system |
