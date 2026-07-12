---
id: CTX-RISKS
title: Current Known Risks
type: guide
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Current Known Risks for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# Known risks

Production Firebase values are not committed or provisioned. Local-device credentials are plain local development data and must not be treated as production authentication. Firestore rule tests require emulator setup beyond current unit tests. Account-wide export/deletion and retention periods are not implemented. Native project signing and store release ownership are unresolved. Package versions require installation and CI confirmation in a networked environment.
