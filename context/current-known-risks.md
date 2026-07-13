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
lastVerified: 2026-07-13
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# Known risks

Production Firebase values are provided through `.env` (untracked) and CI repository variables, never
committed. **Firestore Security Rules must be deployed to the project** (`firebase deploy --only
firestore:rules`) — an undeployed ruleset causes "Missing or insufficient permissions" on create/share.
Firestore rule tests still require emulator setup beyond current unit tests. Native project signing and
store release ownership are unresolved (debug APK only). **iOS floor is 14.0** (Capacitor 8 minimum);
iOS 13 is not supported without a Capacitor major downgrade. **Node 26** is the declared floor but is the
current release line, not yet LTS (Active LTS Oct 2027); local gates run on Node 24. The legacy
`ihabkhaled/FoodOrder` repository still exposes an older API key that the owner should restrict or rotate
in Google Cloud Console (SEC-LEG-001). Package majors continue to need networked CI confirmation.
