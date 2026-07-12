---
id: OPS-README
title: Operations
type: guide
authority: canonical
status: active
owner: platform-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Operations for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# Operations

The web artifact is static and can be hosted on Firebase Hosting or equivalent SPA hosting. Firebase Authentication, Firestore, and Security Rules are managed services. Android/iOS artifacts embed the web build through Capacitor. Production SLOs, dashboards, alerting, backup policy, and cost budgets are not yet approved and must not be invented.
