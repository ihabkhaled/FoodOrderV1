---
id: PROD-RULES
title: Product Rules
type: guide
authority: canonical
status: active
owner: product-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Product Rules for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Product rules

Every user sees only their own buckets and orders. Deleting a bucket does not delete historical orders. Deleting an order is permanent in the current UI. A draft can be placed or cancelled; a placed order can be completed or cancelled; terminal orders cannot change status. Repeating any historical order creates a new draft rather than mutating the original.

Local-device mode must always be visibly identified. Cloud synchronization must never be implied when Firebase is not configured.
