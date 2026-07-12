---
id: CONTRACT-FIREBASE
title: Firebase Integration
type: guide
authority: canonical
status: active
owner: data-integration-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Firebase Integration for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/services/firebaseServices.ts
  - firestore.rules
  - scripts/migrate-legacy-data.mjs
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Firebase integration

Firebase Authentication owns registration, login, logout, and password-reset delivery. Cloud Firestore owns profiles, buckets, and orders. Persistent local cache is enabled for browser offline continuity. Security Rules are the authorization authority and must be deployed with the same release as incompatible client contract changes.

Client adapter errors propagate to screens as user-visible messages. No automatic destructive retry exists. Migration uses `firebase-admin` only in the local CLI and requires Application Default Credentials; admin APIs are never bundled into the client.
