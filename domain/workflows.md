---
id: DOMAIN-WORKFLOWS
title: Domain Workflows
type: guide
authority: canonical
status: active
owner: domain-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Domain Workflows for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/lib/bucket.ts
  - src/lib/order.ts
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Workflows

Bucket creation normalizes item IDs, text, prices, active state, and sort order before persistence. Bucket editing preserves bucket identity and timestamps a new revision.

Order creation filters zero-quantity choices, snapshots selected lines, calculates totals, assigns initial status, and sets lifecycle timestamps. Status update validates the transition and writes only the corresponding timestamp. Repeat order copies historical line inputs into a new draft with a new ID and timestamps.
