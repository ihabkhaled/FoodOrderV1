---
id: ADR-001
title: Migrate React Native Prototype to Capacitor
type: decision
authority: canonical
status: active
owner: architecture-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Migrate React Native Prototype to Capacitor for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Decision

Replace the React Native application with a React web application wrapped by Capacitor instead of translating each native component.

## Rationale

The product is form/list oriented and gains one reusable responsive UI for browser, PWA, Android, and iOS. Capacitor provides native packaging and selective device APIs without coupling domain behavior to native widgets. The migration also removes the original alpha React Navigation dependencies and incomplete screen duplication.

## Consequences

The web bundle is the primary artifact. Platform folders are generated and synchronized. Native-only behavior must be adapter-wrapped and device-tested. React Native code is not retained in the destination repository; business data migration is handled separately.
