---
id: KNOW-README
title: Knowledge System
type: guide
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Knowledge System for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-12
verificationMethod: source and test inspection
contextTier: 1
generated: false
---

# Knowledge system

Canonical truth is divided by responsibility: product promises in `product/`, domain rules in `domain/`, implementation topology in `architecture/` and `structure/`, public data/configuration behavior in `contracts/`, obligations in `rules/`, procedures in `skills/` and `runbooks/`, and generated acceleration artifacts in `.ai/`.

Authority precedence is governance and security/privacy, then architecture decisions and rules, contracts, module documentation, playbooks, generated summaries, and history. A contradiction is recorded and resolved against code, tests, and the highest active authority; incompatible statements are never silently merged.

Use `npm run knowledge:build` after structural changes and `npm run knowledge:build:incremental` after routine changes. `npm run knowledge:validate` checks canonical metadata, duplicate IDs, local links, required commands, and secret-like values in `.env.example`.
