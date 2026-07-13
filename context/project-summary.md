---
id: CTX-PROJECT
title: Project Summary
type: guide
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Project Summary for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-13
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# Project summary

FoodOrderV1 is a completed migration of a React Native food-list prototype into a React/TypeScript/Vite application packaged by Capacitor. Its business is reusable personal food buckets, collaborative (shared) buckets, and repeatable order preparation, not marketplace delivery. Firebase is the production-capable integration and local-device mode makes development immediately functional.

The source is deliberately small and modular. Pure domain logic, adapters, UI, tests, documentation, and generated AI routing are separated to keep routine task context narrow.

The UI uses a responsive shell (desktop sidebar, mobile top bar + bottom nav) with bottom-anchored toasts; layout is guarded by a Playwright UI gate. Releases follow prompt-density SemVer (`rules/versioning.md`, `skills/versioning`). Platform floors: Node 26, Android 10 (API 29), iOS 14 (`docs/operations/platform-support.md`).
