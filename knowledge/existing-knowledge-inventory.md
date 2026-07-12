---
id: KNOW-EXISTING-INVENTORY
title: Existing Knowledge Inventory
type: audit
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Audit of knowledge inherited from the React Native repository and authority established in FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source, manifest, and repository inspection
contextTier: 2
generated: false
---

# Existing knowledge inventory

The source repository contained a default React Native README and no authoritative product, architecture, security, testing, operations, or support documentation. Business intent was recoverable only from navigation, screen names, Firebase paths, and the bucket UI implementation.

Inherited durable evidence:

- A user authenticates with Firebase email/password.
- A user owns reusable named buckets.
- A bucket contains food item names.
- A user selects a non-negative quantity for each item.
- “My Orders” existed in navigation but duplicated the bucket listing and did not persist orders.

FoodOrderV1 establishes canonical ownership through `knowledge/authority-map.yaml`. Product promises live in `product/`, domain behavior in `domain/`, storage/configuration contracts in `contracts/`, implemented topology in `architecture/` and `structure/`, permanent obligations in `rules/`, and generated routing artifacts in `.ai/`.
