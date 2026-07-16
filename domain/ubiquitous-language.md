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
lastVerified: 2026-07-16
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Ubiquitous language

**Bucket:** reusable saved menu/list owned by one user. **Bucket item:** selectable entry with name, category, price, availability, and ordering position. **Order:** one saved or placed selection generated from a bucket. **Order line:** immutable snapshot of selected item values. **Draft:** editable-intent order not yet placed. **Placed:** active order awaiting completion/cancellation. **Completed/Cancelled:** terminal outcomes.

**Bucket invite:** revocable, expiring join-code record that anyone holding the secret token may
preview and accept once. **Bucket invitation:** targeted consent request from a bucket owner to one
accepted friend; only that friend may accept or decline it. **Access grant:** trusted record that
materializes sharing after consent or an existing legacy/group-sharing action.

Do not call a bucket an order, cart, restaurant, or inventory. Do not use bucket invite and bucket
invitation interchangeably. Those concepts have different identities, audiences, and lifecycles.
