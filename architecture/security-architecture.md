---
id: ARCH-SECURITY
title: Security Architecture
type: guide
authority: canonical
status: active
owner: security-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Security Architecture for FoodOrderV1.
scope:
  - repository
relatedCode:
  - firestore.rules
  - src/services/firebaseServices.ts
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Security architecture

The cloud trust boundary is Firebase Authentication plus Firestore Security Rules. The client is untrusted. Path ownership and document ownership must both match the authenticated UID. Environment configuration is public client configuration, but service-account keys and admin credentials are never client inputs.

Local-device mode intentionally has weaker guarantees: credentials and records remain in browser storage. It is a development/evaluation mode and must not be marketed as secure cloud identity.
