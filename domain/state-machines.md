---
id: DOMAIN-STATES
title: Domain State Machines
type: guide
authority: canonical
status: active
owner: domain-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Order and invitation state machines for FoodOrderV1.
scope:
  - repository
relatedCode:
  - src/lib/order.ts
  - functions/src/socialDomain.ts
relatedTests:
  - tests/domain/order.test.ts
  - functions/test/social-domain.test.mjs
lastVerified: 2026-07-16
verificationMethod: source and test inspection
contextTier: 2
generated: false
---

# Order state machine

`draft → placed`, `draft → cancelled`, `placed → completed`, and `placed → cancelled` are allowed. Same-state requests are idempotent in the pure transition function. Every other transition is rejected. Terminal timestamps are set only when their state is first reached.

Storage adapters must call `transitionOrder`; they must not reimplement the state machine.

## Targeted bucket invitation state machine

`pending → accepted` and `pending → declined` are allowed. Retrying the current terminal response
is idempotent. Switching between accepted and declined is rejected. Access is materialized only
inside the pending-to-accepted transaction; pending and declined states never grant access.
