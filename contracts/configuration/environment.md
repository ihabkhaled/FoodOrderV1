---
id: CONTRACT-ENV
title: Environment Configuration
type: guide
authority: canonical
status: active
owner: platform-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Environment Configuration for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/config/env.ts
  - .env.example
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Environment variables

All browser variables use the `VITE_` prefix. Firebase mode requires API key, auth domain, project ID, and app ID. Storage bucket, messaging sender ID, and measurement ID are optional for current behavior. `VITE_DEFAULT_LOCALE` accepts `en` or `ar`; `VITE_DEFAULT_CURRENCY` defaults to `EGP`; `VITE_ENABLE_DEMO_MODE` documents local fallback intent.

Firebase web configuration is not a server secret, but service-account JSON, admin credentials, private keys, and user exports are forbidden. Missing required Firebase values select local-device mode rather than partially initializing Firebase.
