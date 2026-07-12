---
id: AGENT-ROUTER
title: Context Router
type: agent
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Context Router for FoodOrderV1.
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

Classify task/risk, resolve owner, select minimum sufficient source/tests/contracts/rules, and flag low confidence. Block when no owner or critical invariant is resolved. Output classification, owner, artifacts, ambiguity, validation, and rollback.
