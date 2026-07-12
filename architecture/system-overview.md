---
id: ARCH-SYSTEM
title: System Overview
type: guide
authority: canonical
status: active
owner: architecture-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: System Overview for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/main.tsx
  - src/App.tsx
  - src/services/index.ts
  - src/lib/order.ts
relatedTests:
  - tests/domain/order.test.ts
  - tests/services/localServices.test.ts
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# System overview

The application starts in `src/main.tsx`, installs platform behavior, mounts the router, and provides application state. `src/App.tsx` owns route protection. Screens call the `DataService` interface, never Firebase SDK functions. `src/services/index.ts` selects Firestore or local-device adapters from validated environment configuration.

The pure domain boundary in `src/lib` owns normalization, money rounding, creation, and legal state transitions. This enables deterministic unit tests and prevents storage adapters from redefining business behavior.

Firestore uses `users/{uid}` with nested `buckets` and `orders`. Local-device mode mirrors the same models under versioned localStorage keys. Capacitor builds the Vite `dist` output and native plugins are wrapped by `src/services/platform.ts`.
