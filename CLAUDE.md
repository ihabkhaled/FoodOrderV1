# Agent Entry Point

Governance-Version: 1

1. Read `.ai/BOOTSTRAP.md` only.
2. Run `npm run knowledge:context -- --task="<exact task>"` and optionally add `--files`, `--symbols`, or `--diff`.
3. Read the exact owner source, direct tests, and the selected canonical rules/contracts.
4. Plan from verified implementation, not documentation alone.
5. Implement the smallest safe change; run targeted validation, then risk-appropriate gates.
6. Update only affected canonical knowledge and run `npm run knowledge:build:incremental`.
7. Never weaken authentication, ownership isolation, Firestore rules, privacy, type safety, accessibility, localization, tests, or rollback readiness.

Do not read the entire knowledge system for routine tasks and do not manually edit `.ai/`.

## Governance

`AGENTS.md` is the canonical agent source of truth for the v1.6.0 module-first
architecture: layer rules, task-to-skill routing (`skills/`), non-negotiable rules
(`rules/00-non-negotiable-rules.md`), reviewer checklists (`agents/`), and the exception
process (`docs/exceptions/`). Read it before writing code in `src/`.

When a rule fails, the code is in the wrong layer. Move or redesign the code. Do not disable the rule.
