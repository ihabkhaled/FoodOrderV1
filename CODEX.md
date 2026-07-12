# Agent Entry Point

1. Read `.ai/BOOTSTRAP.md` only.
2. Run `npm run knowledge:context -- --task="<exact task>"` and optionally add `--files`, `--symbols`, or `--diff`.
3. Read the exact owner source, direct tests, and the selected canonical rules/contracts.
4. Plan from verified implementation, not documentation alone.
5. Implement the smallest safe change; run targeted validation, then risk-appropriate gates.
6. Update only affected canonical knowledge and run `npm run knowledge:build:incremental`.
7. Never weaken authentication, ownership isolation, Firestore rules, privacy, type safety, accessibility, localization, tests, or rollback readiness.

Do not read the entire knowledge system for routine tasks and do not manually edit `.ai/`.
