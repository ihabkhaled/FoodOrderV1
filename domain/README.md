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
  - src/lib/bucket.ts
  - src/lib/order.ts
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# Domain model

The domain contains User Profile, Bucket, Bucket Item, Order, and Order Line. Buckets are reusable mutable templates. Orders are historical records. Order lines copy name, quantity, and price from the selected bucket at creation so history is stable.

Pure functions in `src/lib/bucket.ts` and `src/lib/order.ts` are the implementation owners for validation, normalization, totals, creation, and status transitions.
