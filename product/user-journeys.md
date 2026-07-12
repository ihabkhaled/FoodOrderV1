---
id: PROD-JOURNEYS
title: User Journeys
type: guide
authority: canonical
status: active
owner: product-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: User Journeys for FoodOrderV1.
scope:
  - repository
relatedTests:
  - tests/e2e/smoke.spec.ts
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Core journeys

1. Register or sign in; the app loads the user's profile and storage mode.
2. Create a bucket with title, optional description, currency, and one or more items.
3. Open the bucket, increase quantities, add notes, then save a draft or place the order.
4. Review order details, complete or cancel an eligible order, or repeat it into a new draft.
5. Search/filter buckets and orders; edit or delete owned records.
6. Change language, direction, theme, and default currency.

Failure behavior keeps the current screen, shows a clear error, and never claims persistence succeeded when it did not.
