---
id: ARCH-TESTING
title: Testing Architecture
type: guide
authority: canonical
status: active
owner: qa-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Testing Architecture for FoodOrderV1.
scope:
  - repository
relatedTests:
  - tests/domain/bucket.test.ts
  - tests/domain/order.test.ts
  - tests/services/localServices.test.ts
  - tests/e2e/smoke.spec.ts
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Testing architecture

Pure domain tests prove normalization, monetary calculations, and state transitions. Local adapter integration tests prove a complete user/bucket/order lifecycle and user isolation. React behavior uses Testing Library when component-level regressions require it. Playwright proves the highest-value registration-to-order journey on desktop and mobile viewport profiles.

Firestore rules require emulator tests before production rule changes. Native plugin or shell changes require real Android/iOS smoke tests because browser tests cannot validate WebView and native lifecycle behavior.
