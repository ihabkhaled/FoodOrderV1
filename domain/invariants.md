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
relatedTests:
  - tests/domain/bucket.test.ts
  - tests/domain/order.test.ts
lastVerified: 2026-07-12
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
- Historical order lines do not depend on current bucket values.
- Only documented order status transitions are legal.
- Completed and cancelled orders are terminal.

Unit tests must map directly to each calculation and lifecycle invariant.
