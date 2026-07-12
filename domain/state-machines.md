---
id: DOMAIN-STATES
title: Order State Machine
type: guide
authority: canonical
status: active
owner: domain-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Order State Machine for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/lib/order.ts
relatedTests:
  - tests/domain/order.test.ts
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Order state machine

`draft → placed`, `draft → cancelled`, `placed → completed`, and `placed → cancelled` are allowed. Same-state requests are idempotent in the pure transition function. Every other transition is rejected. Terminal timestamps are set only when their state is first reached.

Storage adapters must call `transitionOrder`; they must not reimplement the state machine.
