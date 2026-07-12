---
id: CONTRACT-ROUTES
title: Browser Route Contract
type: guide
authority: canonical
status: active
owner: frontend-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Browser Route Contract for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/App.tsx
  - firebase.json
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Routes

Guest routes: `/auth/login`, `/auth/register`, `/auth/forgot`. Protected routes: `/`, `/buckets`, `/buckets/new`, `/buckets/:bucketId/edit`, `/buckets/:bucketId/order`, `/orders`, `/orders/:orderId`, and `/settings`. Unknown routes render a local 404 page.

Protected routes redirect unauthenticated users to login. Guest routes redirect authenticated users to home. Deep links require static-host rewrites to `index.html`, configured in `firebase.json`.
