---
id: PRIV-RETENTION
title: Retention and Deletion
type: guide
authority: canonical
status: proposed
owner: privacy-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Retention and Deletion for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Retention and deletion

Current product allows individual bucket and order deletion. Account-wide export/deletion and an approved server retention duration are not implemented. Before production launch, the owner must define retention, backup expiry, account deletion semantics, legal exceptions, user communication, operational runbook, and verification tests. Do not claim regulatory compliance without evidence.
