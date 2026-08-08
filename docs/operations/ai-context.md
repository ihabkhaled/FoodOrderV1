---
id: ops-ai-context
title: AI task context
---

# AI task context

Three commands cover normal agent work:

```bash
npm run ai:context -- --task="add password reset"   # compile the bundle
npm run ai:doctor                                   # check repository intelligence
npm run test:ai                                     # failure-only validation
```

## What `ai:context` produces

It writes `.ai/context/current.md` and prints a short receipt. The bundle
carries the compiled answer, not a reading list:

- the rule **obligations** that apply (imperative bullets, not the prose),
- the owning module's files with their **exported symbols**,
- the **tests** that cover those modules,
- the **validation lane** for the task's risk,
- a **cost line** comparing the bundle against reading the same sources.

Reading it is one tool call. The previous command emitted a list of fifteen
paths, which cost a read each and, because its path table predated the v1.6.0
module migration, usually listed the wrong ones.

Flags: `--files=a,b` pins known paths, `--json` emits the structured result,
`--print` writes the bundle to stdout, `--no-cache` forces recompilation.

## Risk lanes

The lane comes from the domains a task touches, and the **riskiest** one wins —
a Firestore-rules change stays critical even when a feature module scores higher.

| Lane | Trigger | Validation |
|---|---|---|
| FAST | no risk signal | `lint:ai`, `typecheck:ai` |
| NORMAL | a feature domain | `lint:ai`, `typecheck:ai`, `test:ai` |
| DEEP | security, rules, functions, auth, privacy | full lint, typecheck, tests, `test:rules`, build |

## Domains are derived, never listed

`scripts/knowledge/routing.mjs` builds the domain table from `src/modules/*`
plus a small set of cross-cutting areas that are checked against the tree. A new
module is routable as soon as it exists, and a deleted one disappears.

This is enforced rather than trusted: `tests/tooling/knowledge-routing.test.mjs`
asserts every domain resolves and every module is routable, and `ai:doctor` runs
in the CI Knowledge job.

## Caching

Bundles are cached in `.ai/local/context-cache.json`, keyed by the task plus the
tree state (HEAD and `git status`, ignoring generated `.ai/` output). Any edit
invalidates it; an unchanged tree replays instantly.

## The `:ai` wrappers

`test:ai`, `lint:ai`, `typecheck:ai`, and `build:ai` print one line on success
and only the failing lines on failure, with the full log path. Use them while
iterating; run the unwrapped commands for release evidence, since those are what
the gates record.
