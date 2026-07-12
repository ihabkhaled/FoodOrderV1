---
id: PRIV-INVENTORY
title: Data Inventory
type: guide
authority: canonical
status: active
owner: privacy-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Data Inventory for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Data inventory

Identity: Firebase UID, email, display name. Preferences: locale, theme, default currency. Bucket content: title, description, item names/descriptions/categories/prices/availability. Order content: source references, line snapshots, quantities/prices/totals, notes, status, timestamps. Technical local data: versioned localStorage records, session ID, Capacitor Preferences.

Order notes may contain user-entered personal information; UI and support must discourage unnecessary sensitive content.
