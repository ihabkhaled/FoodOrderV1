---
id: DOMAIN-LANGUAGE
title: Ubiquitous Language
type: guide
authority: canonical
status: active
owner: domain-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Ubiquitous Language for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Ubiquitous language

**Bucket:** reusable saved menu/list owned by one user. **Bucket item:** selectable entry with name, category, price, availability, and ordering position. **Order:** one saved or placed selection generated from a bucket. **Order line:** immutable snapshot of selected item values. **Draft:** editable-intent order not yet placed. **Placed:** active order awaiting completion/cancellation. **Completed/Cancelled:** terminal outcomes.

Do not call a bucket an order, cart, restaurant, or inventory. Those concepts have different lifecycles.
