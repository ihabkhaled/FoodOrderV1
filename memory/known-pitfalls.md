---
id: MEM-PITFALLS
title: Known Pitfalls
type: guide
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Known Pitfalls for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Known pitfalls

Do not delete orders when a bucket is deleted. Do not calculate historical lines from current bucket prices. Do not import Firebase directly in pages. Do not initialize Firebase with partial configuration. Do not claim local-device mode syncs or securely authenticates users. Do not permit terminal order transitions. Do not edit `.ai` by hand because the next build overwrites it.
