---
id: DOMAIN-ENTITIES
title: Domain Entities
type: guide
authority: canonical
status: active
owner: domain-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Domain Entities for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/types/domain.ts
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Entities

`UserProfile` owns locale, theme, and default currency. `Bucket` owns ordered `BucketItem` values and timestamps. `Order` owns line snapshots, notes, totals, lifecycle timestamps, and source bucket references.

Identifiers are client-generated UUID-based strings. Timestamps are ISO 8601 UTC strings. Money values are numeric two-decimal application values; a future financial integration should migrate to integer minor units through an ADR and data migration.
