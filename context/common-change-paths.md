---
id: CTX-CHANGES
title: Common Change Paths
type: guide
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Common Change Paths for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Common change paths

Adding a domain field normally touches the domain type, creation/update function, both storage adapters, Firestore rules, UI form/detail rendering, unit/integration/E2E tests, data contract, and migration compatibility. A pure copy change normally touches one message entry and localization review. A new native plugin touches package dependencies, platform adapter, Capacitor sync, privacy/security review, mobile architecture, and device smoke tests.
