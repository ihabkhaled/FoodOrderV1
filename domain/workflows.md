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
  - functions/src/social.ts
lastVerified: 2026-07-16
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Workflows

Bucket creation normalizes item IDs, text, prices, active state, and sort order before persistence. Bucket editing preserves bucket identity and timestamps a new revision.

Order creation filters zero-quantity choices, snapshots selected lines, calculates totals, assigns initial status, and sets lifecycle timestamps. Status update validates the transition and writes only the corresponding timestamp. Repeat order copies historical line inputs into a new draft with a new ID and timestamps.

Targeted bucket sharing verifies that the caller owns the bucket and that the recipient is an
accepted friend, then writes a pending invitation and recipient notification without granting
access. The intended recipient accepts or declines from Social. Acceptance atomically creates the
direct grant/member/membership records and notifies the owner; decline preserves access isolation
and notifies the owner. Same-response retries do not duplicate grants or notifications.
