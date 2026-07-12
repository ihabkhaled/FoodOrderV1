---
id: MEM-DECISIONS
title: Standing Decisions
type: guide
authority: canonical
status: active
owner: architecture-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Standing Decisions for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Standing decisions

Capacitor is the mobile shell, Firestore is the cloud store, localStorage is the explicit fallback, order lines are snapshots, domain functions are storage-independent, and English/Arabic are first-class supported locales. Marketplace, payment, and delivery concepts require future decisions rather than implicit expansion.
