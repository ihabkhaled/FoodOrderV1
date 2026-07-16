---
id: DOMAIN-INVARIANTS
title: Domain Invariants
type: guide
authority: canonical
status: active
owner: domain-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Domain Invariants for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/lib/bucket.ts
  - src/lib/order.ts
  - src/lib/sharing.ts
  - functions/src/socialDomain.ts
  - functions/src/social.ts
relatedTests:
  - tests/domain/bucket.test.ts
  - tests/domain/order.test.ts
  - tests/domain/sharing.test.ts
  - tests/services/sharingLocal.test.ts
  - tests/services/socialInvitations.test.ts
  - functions/test/social-domain.test.mjs
lastVerified: 2026-07-16
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Invariants

- Bucket title is non-empty after trimming.
- Bucket contains 1–50 items; every item has a non-empty name and non-negative unit price.
- Order contains at least one line with quantity greater than zero.
- Line total equals rounded quantity × unit price; order subtotal/total equal rounded line totals.
- Order ownership and bucket ownership use the authenticated user ID.
- Historical order lines and group-order participant snapshots never change when the bucket,
  its prices, or later contributions change.
- Only documented order status transitions are legal; completed and cancelled are terminal.

## Collaboration invariants (schema v2)

- A member's contribution document is written only by that member (doc id = uid).
- Contribution quantities are integers in [0, 99]; zero removes the key.
- The bucket `aggregate` is derived state: Σ of all contribution quantities per item;
  `repairAggregate` can always recompute it from contributions (drift-detectable).
- Bucket `revision` increases by exactly 1 per successful mutation/structural edit and only
  inside a transaction (Firestore) or the single-writer store (local).
- Every contribution write carries a unique mutation id; replaying an applied mutation id
  returns the recorded result and never re-applies (no double increments after retries).
- Two concurrent writers on the same item both survive: transactions serialize on the bucket
  document and each rerun recomputes from current state.
- Invite tokens are 144-bit random; only their SHA-256 hash is stored; invites are single-use
  (atomic pending→accepted), expire after 72h, and are revocable.
- The owner cannot leave or be removed; deletion is the owner's exit path and cascades all
  subcollections.
- Revoked/left members immediately lose access (Security Rules) while their past contributions
  remain in totals (product rule).

## Social and targeted sharing invariants

- Only a bucket owner may invite one of their accepted friends to that bucket.
- A targeted invitation grants no bucket access while pending or after decline. Only the
  authenticated intended recipient may accept or decline it.
- Acceptance atomically changes the invitation to accepted and materializes its direct grant,
  active member, and recipient membership mirror. Retrying the same response is idempotent;
  changing an accepted invitation to declined, or vice versa, is rejected.
- Reactivating a revoked or left member uses the new invitation role and role-derived permission
  defaults. Stale stronger roles or custom-item capabilities are never restored.
- The recipient receives one actionable invitation notification. The owner receives one
  deterministic accepted or declined notification; access-only writes do not also emit a generic
  bucket-updated notification.
- If the bucket is deleted before response, acceptance fails closed, while the intended recipient
  can still dismiss/decline the orphaned invitation mirror.

Unit tests must map directly to each calculation, lifecycle, and concurrency invariant.
