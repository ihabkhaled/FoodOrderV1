---
id: KNOW-MAINTENANCE-GUIDE
title: Knowledge Maintenance Guide
type: guide
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: How to keep canonical and generated knowledge synchronized with implementation changes.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: compiler and command inspection
contextTier: 1
generated: false
---

# Knowledge maintenance

1. Change the canonical owner of a fact, not a generated `.ai/` file.
2. Update source and tests first, then update only affected product, domain, contract, operation, support, or decision records.
3. Run `npm run knowledge:build:incremental` for routine changes and `npm run knowledge:build` after structural changes.
4. Run `npm run knowledge:validate` and `npm run knowledge:benchmark` before merging.
5. Use `npm run knowledge:context -- --task="<exact task>"` to verify that the changed area resolves to the correct source, tests, rules, and documentation.
6. Never commit `.ai/local/current-context.*`; it is task-local state.
7. Do not edit committed generated artifacts manually. Rebuild them from source and canonical documents.
8. Resolve contradictions by authority, current code, current tests, and an explicit decision record when behavior changes.

A source change that alters public behavior must trigger review of its product/domain/contract owner and tests. Configuration, persistence, security, privacy, deployment, and migration changes also require their respective operational and rollback documentation.
