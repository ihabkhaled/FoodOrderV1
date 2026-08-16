# 06 — Non-negotiable rules router

This file repairs the architecture index without duplicating canonical policy.

Read in this order:

1. [`../rules/00-non-negotiable-rules.md`](../rules/00-non-negotiable-rules.md) — repository hard constraints.
2. [`../rules/22-executive-function-and-delivery.md`](../rules/22-executive-function-and-delivery.md) — objective, scope, retry, loop recovery, delivery, and stopping.
3. [`../rules/23-context-memory-and-evidence.md`](../rules/23-context-memory-and-evidence.md) — layered context, source evidence, generated knowledge, and durable memory.
4. [`../rules/24-communication-verification-and-completion.md`](../rules/24-communication-verification-and-completion.md) — concise status, sufficient proof, and completion.
5. The domain rules selected by `npm run knowledge:context -- --task="<task>"`.

Authority remains in `rules/`; this architecture file is a thin navigation entry point.
