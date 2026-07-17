# 19 — Exceptions policy

## Rule

Any deviation from the architecture rules exists only as a written exception document with
rule, reason, mitigation, owner, and removal condition. No document, no deviation. An
exception never silently expands its scope.

## Motivation

A rule set survives only if deviations are visible and bounded. The migration itself runs
on five such exceptions (EXC-1..EXC-5) — each one is a deliberate, reviewable trade-off,
not an eroded rule.

## Required

- Process and template: [../docs/exceptions/README.md](../docs/exceptions/README.md).
- Active migration exceptions live in
  [../docs/migration/unresolved-exceptions.md](../docs/migration/unresolved-exceptions.md):
  - **EXC-1** — cross-feature persistence gateways live in `src/modules/data-access`.
  - **EXC-2** — `@capacitor/app` / `@capacitor/keyboard` registry entries without owner
    modules (no web import sites).
  - **EXC-3** — coverage instrumentation scoped to pure layers; screens covered by e2e.
  - **EXC-4** — bilingual vendor error copy inside `src/packages/firebase`.
  - **EXC-5** — iOS validation not executed (no macOS environment).
- Post-migration exceptions go to `docs/exceptions/` as `EXC-<n>-<slug>.md` with the next
  free number, and are linked from the code site they cover (comment referencing the ID).
- Every exception names a single accountable owner and a concrete, testable removal
  condition; reviews check exceptions for scope creep.
- Follow [../skills/document-exception.md](../skills/document-exception.md) to author one.

## Forbidden

- `eslint-disable` (any `architecture/*` rule) as a substitute for an exception — the code
  moves instead. When a rule fails, the code is in the wrong layer. Move or redesign the
  code. Do not disable the rule.
- Reusing an existing exception to justify a new, different deviation.
- Exceptions without removal conditions ("permanent exceptions" are rule changes and
  require an ADR instead).
- Retroactive exceptions written to make a red review pass without discussion.

## Enforcement

- Review checklist ([21-review-checklist.md](21-review-checklist.md)) requires an exception
  reference for every suppression or boundary bend in a diff.
- `docs/migration/unresolved-exceptions.md` is checked during release readiness
  ([../agents/release-readiness-reviewer.md](../agents/release-readiness-reviewer.md)).

## Definition of done

The exception document exists with all five fields, is linked from the affected code/doc,
and the change otherwise passes every gate — an exception excuses exactly one named rule,
nothing else.
