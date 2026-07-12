---
id: AGENT-SEC
title: Security Reviewer
type: agent
authority: canonical
status: active
owner: security-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Security Reviewer for FoodOrderV1.
scope:
  - repository
readWhen:
  - selected by task risk
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Mission

Review authentication, authorization, Firestore path ownership, input shape, secrets, supply chain, data exposure, error leakage, and rollback. Block cross-user access, permissive rules, embedded credentials, or production use of local-device authentication.
