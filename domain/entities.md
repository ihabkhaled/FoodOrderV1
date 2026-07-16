---
id: DOMAIN-ENTITIES
title: Domain Entities
type: guide
authority: canonical
status: active
owner: domain-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Domain Entities for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/types/domain.ts
  - src/types/social.ts
  - src/lib/sharing.ts
  - functions/src/socialDomain.ts
lastVerified: 2026-07-16
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Entities

`UserProfile` owns locale, theme, and default currency (all runtime-changeable; device-level
defaults live in `src/state/deviceConfig.ts`). `Bucket` (schema v2) owns ordered `BucketItem`
values, ownership (`ownerId`/`ownerName`), `visibility` (private|shared), a monotonic
`revision`, and the materialized `aggregate` map (itemId → total quantity). `Order` owns line
snapshots, notes, totals, lifecycle timestamps, `sourceBucketRevision`, and an optional
`participants` breakdown for group orders.

Sharing entities: `BucketMember` (role owner|editor|contributor|viewer, status
active|revoked|left), `BucketInvite` (id = SHA-256 of the join token; pending|accepted|revoked|
expired; `expiresAtMillis` mirrors `expiresAt` for Security Rules), `BucketContribution`
(one document per member; quantities map; only that member writes it),
`ContributionMutationRecord` (append-only idempotency ledger), `BucketActivityEvent`
(append-only audit/activity timeline with safe metadata), and `BucketMembershipRef`
(client-maintained mirror under `users/{uid}/bucketMemberships`).

`BucketInvitation` is the targeted, friend-to-bucket consent record and is distinct from a
token-based `BucketInvite`. It has a deterministic bucket/recipient identity, an owner and
intended recipient, a requested non-owner role, and status pending|accepted|declined. A pending
or declined invitation is not an access grant. Acceptance atomically materializes the direct
`BucketAccessGrant`, member record, and recipient membership mirror; the grant records the
invitation identity for notification deduplication.

Identifiers are client-generated UUID-based strings. Timestamps are ISO 8601 UTC strings.
Money values are numeric two-decimal application values; a future financial integration should
migrate to integer minor units through an ADR and data migration.
