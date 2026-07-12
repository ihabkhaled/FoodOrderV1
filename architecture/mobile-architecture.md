---
id: ARCH-MOBILE
title: Capacitor Mobile Architecture
type: guide
authority: canonical
status: active
owner: mobile-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Capacitor Mobile Architecture for FoodOrderV1.
scope:
  - repository
relatedCode:
  - capacitor.config.ts
  - src/services/platform.ts
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Capacitor architecture

Vite produces one web artifact in `dist`. Capacitor synchronizes that artifact into generated Android and iOS projects. Native capability is limited to status bar, keyboard behavior, network status, preferences, haptics, and app lifecycle. React pages must not import Capacitor plugins directly; the platform adapter provides safe no-op behavior in browsers.

Native folders are generated and may be committed after the first signed platform setup. Generated platform code is reviewed only for deliberate plugin/configuration changes. Every native release runs web validation before `cap sync`, then platform build and device smoke tests.
