---
id: MEM-README
title: Engineering Memory
type: guide
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Durable engineering memory for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-16
verificationMethod: source and test inspection
generated: false
---

# Memory

Durable lessons that are not already encoded in rules, contracts, or source. Current
behavior belongs in source and tests; decisions belong in
[../architecture/adrs/](../architecture/adrs/README.md); enforceable policy belongs in
[../rules/](../rules/README.md). Promote a repeated lesson into a rule and leave a
historical pointer here.

| Document                                                   | Holds                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| [architectural-decisions.md](architectural-decisions.md)   | Decision log index (points into the ADRs)                          |
| [known-pitfalls.md](known-pitfalls.md)                     | Traps that repeatedly bite in this repo                            |
| [migration-lessons.md](migration-lessons.md)               | Lessons from the v1.6.0 module-first migration                     |
| [native-platform-pitfalls.md](native-platform-pitfalls.md) | Capacitor/Android/iOS/Windows specifics                            |
| [recent-context.md](recent-context.md)                     | Pre-1.6.0 hot context (historical)                                 |
| [standing-decisions.md](standing-decisions.md)             | Pre-1.6.0 decision notes (historical; superseded where ADRs exist) |
