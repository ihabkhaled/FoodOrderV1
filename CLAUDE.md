# Agent Entry Point

Governance-Version: 1

1. Read `AGENTS.md`, then `.ai/BOOTSTRAP.md`.
2. Run `npm run knowledge:context -- --task="<exact task>"` and optionally add `--files`, `--symbols`, or `--diff`.
3. Read the exact owner source, direct tests, selected canonical rules/contracts, and matching `skills/` playbook.
4. Plan from verified implementation, not documentation alone.
5. Implement the smallest coherent safe change; run targeted validation, then risk-appropriate gates.
6. Update affected canonical architecture, rules, skills, context, memory, migration, module, product, and operations documentation.
7. Run `npm run knowledge:build:incremental`; never edit generated `.ai/` files manually.
8. Never weaken authentication, ownership isolation, Firestore/Storage rules, privacy, type safety, accessibility, localization, tests, rollback readiness, or release evidence.
9. For an external prompt pack or execution prompt, follow `skills/execute-prompt-pack.md` before editing.

## Version branches

When creating or checking out a branch such as `1.7.0`, `release/1.7.0`, or `1.7.0/<feature>`, follow `skills/start-version-branch.md`. The stable source version must match the branch before implementation commits. Every green push receives an immutable prerelease APK version; CI never writes recursive version commits.

## Code organization

- `AGENTS.md` is authoritative.
- Feature behavior belongs in exactly one module.
- Domain constants, types, interfaces, state machines, validators, helpers, adapters, and integration contracts live in truthful responsibility files; do not hide them inline in screens or giant hooks.
- Components are hook-free UI; containers and view-model hooks orchestrate behavior.
- New libraries require an owned `src/packages/<name>` facade and registry entry before application use.
- Code must be readable by junior and senior engineers without relying on undocumented cleverness.

When a rule fails, the code is in the wrong layer. Move or redesign it. Do not disable the rule, skip the test, or bypass Husky.

## Merge safety

Never merge from an older green SHA. `All Gates Green` and `Cross-Browser All Green`
must both succeed on the current PR head or merge-queue candidate; pending, skipped,
cancelled, and stale checks are failures. Follow `docs/operations/required-merge-gates.md`.

## Post-merge releases

After a PR merges, monitor the green `main` workflow through GitHub release creation.
Release notes must include the canonical version notes plus the merged PR title, body,
number, and link; generated one-line notes alone are insufficient.
