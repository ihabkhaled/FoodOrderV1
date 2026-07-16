# ADR-0006: Error normalization

- Status: Accepted
- Date: 2026-07-16

## Context

Firebase surfaces coded errors (`auth/invalid-credential`, `permission-denied`,
callable failures) that must reach users as actionable copy in `en` AND `ar`. The shipped,
tested design (`src/lib/firebaseError.ts`, 481 lines, covered by
`tests/domain/firebaseError.test.ts`) maps Firebase error codes directly to localized
copy in one table. Architectural purity would instead map errors to message-catalog keys
at the presentation boundary.

## Decision

Keep the direct code→bilingual-copy table and move it into the vendor's owner module,
`src/packages/firebase` — the error shape is Firebase-specific, so the mapping belongs
with the vendor boundary. This is recorded as **EXC-4**: re-keying every error through the
message catalogs is a behavior-affecting rewrite with no user benefit in a two-locale app.

The full pipeline: vendor error → firebase package table (localized copy) → gateway
contract errors (`*.errors.ts`, replay-safe mutation semantics) → hook `{ error, retry }`
state → shared `ErrorState`/toast. Raw vendor errors never cross the `data-access`
surface; no uid/path/token/stack reaches copy; no `console.*` in `src/`.

## Consequences

- One tested table stays authoritative for Firebase copy; adding a mapped error is a
  one-file change plus test.
- The i18n catalogs do not see vendor errors — acceptable while locales = {en, ar}.
- **Removal condition (binding)**: if a third locale is added, convert the table to
  message keys in the catalogs.
- Local-mode gateways normalize their own failures symmetrically so both backends present
  identical error surfaces to hooks.

## Enforcement

Layer rules keep the table inside `src/packages/firebase`; `tests/domain/firebaseError.test.ts`
(migrating with the code) guards the mapping; EXC-4 documents the deviation;
`rules/12-error-handling.md` binds new failure modes to the pipeline.
