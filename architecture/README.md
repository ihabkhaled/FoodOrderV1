---
id: ARCH-README
title: Architecture Index
type: guide
authority: canonical
status: active
owner: architecture-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Architecture Index for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# Architecture

FoodOrderV1 is a single client application with explicit boundaries rather than a distributed backend. React routes and components form presentation; `AppContext` orchestrates identity/preferences; pure domain functions create and transition buckets/orders; `DataService` and `AuthService` ports isolate local and Firebase adapters; Capacitor adapters isolate native APIs.

Current, target, and proposed states are labeled separately. The current implementation is authoritative only when confirmed by source and tests.
