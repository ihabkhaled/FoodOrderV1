---
id: CONTRACT-DATA
title: Data Schemas
type: guide
authority: canonical
status: active
owner: data-integration-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Data Schemas for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/types/domain.ts
  - src/services/firebaseServices.ts
  - firestore.rules
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Firestore schemas

`users/{uid}` stores `UserProfile`. `users/{uid}/buckets/{bucketId}` stores the complete `Bucket`, including embedded item array. `users/{uid}/orders/{orderId}` stores the complete `Order`, including embedded line array. Document IDs and embedded `id` values must match.

Embedding is deliberate for this small user-owned dataset and atomic editing. A bucket supports at most 50 items. Queries currently read the user's collections and sort client-side; introducing server-side pagination/indexing requires a contract update.
