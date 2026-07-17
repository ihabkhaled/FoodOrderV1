# billing

Plan, subscription, usage-limit, and entitlement policy for FoodOrderV1 monetization.

## Responsibility

- Defines the Free, Organizer Pro, and Business Workspace product plans.
- Owns stable plan, entitlement, subscription-status, usage-meter, and decision identifiers.
- Resolves an effective plan from a trusted subscription record.
- Produces immutable entitlement snapshots that server and client boundaries can evaluate consistently.
- Evaluates usage limits without trusting client-supplied plan fields.
- Provides deterministic local/test fixtures for unconfigured billing environments.

This module does not process group-order participant payments. Subscription billing and order settlement are separate domains.

## Public surface (`@/modules/billing`)

- Plan catalog and entitlement-to-meter mapping.
- Billing identifiers and derived union types.
- Entitlement snapshot/evaluation helpers.
- Subscription, usage, snapshot, and decision contracts.

## Security boundary

The helpers are pure policy. Production subscription records and entitlement snapshots must be written or projected by trusted Functions/webhook handlers. UI checks are explanatory UX only and never authorize a paid server capability.

Provider customer/subscription references belong in owner-only documents. Webhooks must verify signatures and process provider event IDs idempotently.

## Dependencies

None outside this module. A future provider adapter must use an owned `src/packages/<provider>` facade and a data-access/server contract.

## Testing

`tests/domain/billing-entitlements.test.ts` covers every plan, subscription state, usage meter, unlimited limit, inactive fallback, invalid usage, and assertion outcome. Provider adapters require Functions/webhook tests and server-authoritative integration coverage.
