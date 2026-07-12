---
id: ARCH-TARGET
title: Target Architecture State
type: guide
authority: canonical
status: proposed
owner: architecture-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Target Architecture State for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Approved target state

The immediate target is production readiness without changing the client-centric product: provision a Firebase project, deploy reviewed Firestore rules, generate and sign Android/iOS shells, establish retention/deletion operations, add observability approved for privacy, and run release smoke tests.

Potential future collaboration, restaurant integration, or payments require separate architecture decisions because they change trust boundaries, authorization, consistency, and operational ownership. They are proposals, not current capabilities.
