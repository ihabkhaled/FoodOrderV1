---
id: OPS-DEPLOY
title: Deployment Model
type: guide
authority: canonical
status: active
owner: platform-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Deployment Model for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Deployment model

Web: install locked dependencies, validate, build `dist`, deploy hosting and compatible Firestore Rules, verify deep links/security headers/auth/data flows, then observe. Mobile: produce the same validated web build, run `cap sync`, build signed platform artifacts, execute device smoke tests, distribute through controlled tracks, and retain previous store artifact/config for rollback.
