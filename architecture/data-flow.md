---
id: ARCH-DATA-FLOW
title: Data Flow
type: guide
authority: canonical
status: active
owner: architecture-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Data Flow for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/state/AppContext.tsx
  - src/services/contracts.ts
  - src/services/firebaseServices.ts
  - src/services/localServices.ts
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Data flow

Authentication emits a `SessionUser`. `AppContext` loads the profile through `DataService`. Screens provide drafts to the service; the service delegates to pure domain functions before persistence. Firestore writes normalized objects under the authenticated user's path. Firestore rules independently verify ownership and basic shape.

Order line values are copied from bucket items at order creation. Later bucket edits do not rewrite historical orders. Status transitions are validated in the domain layer before storage. Local-device mode follows the same sequence but has no server-side enforcement and is labeled accordingly.
