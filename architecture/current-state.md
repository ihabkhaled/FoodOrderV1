---
id: ARCH-CURRENT
title: Current Architecture State
type: guide
authority: canonical
status: active
owner: architecture-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Current Architecture State for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# Implemented current state

- React 19 route-based application with responsive and RTL-aware CSS.
- Vite production bundle and manual service worker for app-shell availability.
- Capacitor configuration and native plugin adapter; Android/iOS projects are generated after dependency installation.
- Firebase Authentication and Firestore with persistent browser cache when configured.
- Complete local-device adapter for zero-configuration development.
- Pure bucket/order domain rules with unit and integration tests.
- GitHub Actions quality pipeline and deterministic knowledge compiler.

No server-side ordering, restaurant marketplace, payment processing, delivery dispatch, or multi-user shared bucket exists. Those are non-goals until explicitly approved.
