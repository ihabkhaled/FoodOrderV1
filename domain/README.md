---
id: DOMAIN-README
title: Domain Model
type: guide
authority: canonical
status: active
owner: domain-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Domain Model for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/types/domain.ts
  - src/types/social.ts
  - src/lib/bucket.ts
  - src/lib/order.ts
  - functions/src/socialDomain.ts
lastVerified: 2026-07-16
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# Domain model

The domain contains User Profile, Bucket, Bucket Item, Order, Order Line, social graph, and sharing entities. Buckets are reusable mutable templates. Orders are historical records. Order lines copy name, quantity, and price from the selected bucket at creation so history is stable. Targeted bucket invitations are consent records; they do not grant access until the intended friend accepts.

Pure functions in `src/lib/bucket.ts`, `src/lib/order.ts`, and `functions/src/socialDomain.ts` own validation, normalization, totals, creation, and state-transition rules. Callable services own authenticated social and sharing transactions.
