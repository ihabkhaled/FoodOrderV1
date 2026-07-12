---
id: ARCH-MIGRATION
title: React Native to Capacitor Migration Guide
type: guide
authority: canonical
status: active
owner: architecture-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: React Native to Capacitor Migration Guide for FoodOrderV1.
scope:
  - repository
relatedCode:
  - scripts/migrate-legacy-data.mjs
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Migration guide

The original application stored user profiles in Firestore and buckets in Realtime Database at `usersData/{uid}/buckets/{uuid}` with `title` and `inputValues`. FoodOrderV1 uses Firebase Authentication plus normalized Firestore profile/bucket/order documents. Export legacy Realtime Database JSON, run the admin migration script in a controlled environment, inspect counts and sample records, then deploy the new client and rules.

Legacy item names become active items with zero price, empty metadata, and stable generated IDs. The original “My Orders” screen contained no order records and cannot be migrated as history. Keep the export until verification and rollback window close; never commit it.
