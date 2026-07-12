---
id: PRIV-RIGHTS
title: User Data Rights
type: guide
authority: canonical
status: proposed
owner: privacy-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: User Data Rights for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# User rights readiness

The data model is user-scoped and exportable by UID, but no in-app full export or account deletion exists. A future implementation must authenticate recently, enumerate profile/buckets/orders, provide a portable export, delete active and backup data according to approved policy, log only non-sensitive completion evidence, and handle failures/retries without partial false success.
