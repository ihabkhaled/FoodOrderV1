# 12 — Error handling

## Rule

Errors are normalized at the boundary where they enter the app: vendor errors inside the
owning package facade, gateway errors inside `data-access`. UI receives localized,
user-actionable messages (`en`/`ar`) plus a retry path; raw vendor errors never reach
components.

## Motivation

Firebase throws coded errors (`auth/invalid-credential`, `permission-denied`, ...) that are
meaningless to users and unstable across SDK versions. One mapping table keeps copy
consistent, bilingual, and testable (`tests/domain/firebaseError.test.ts`).

## Required

- Firebase error mapping lives in `src/packages/firebase` (migrated from
  `src/lib/firebaseError.ts`): code → localized `en`/`ar` copy in one table. This is EXC-4
  — vendor error copy inside the package facade is the accepted, tested design
  (ADR: [../architecture/adrs/0006-error-normalization.md](../architecture/adrs/0006-error-normalization.md)).
- Gateways translate storage/transport failures into contract-level errors declared in
  `*.errors.ts` files; replayed contribution mutations return the recorded result instead
  of throwing.
- Containers render failure states through the shared `ErrorState` UI with a retry
  callback; toasts (session module) carry transient failures.
- Every `catch` either handles, translates, or rethrows — with intent visible. Intentional
  no-op fallbacks use the configured arrow-function form (`.catch(() => {})`) and only for
  genuinely ignorable outcomes (e.g. haptics unavailable).
- All promises are awaited or explicitly handled (`@typescript-eslint/no-floating-promises`).

## Forbidden

- Empty `catch {}` blocks (`no-empty`, sonarjs).
- Showing raw error codes/messages or stack traces to users; leaking Firestore paths or
  uids in error copy.
- `console.*` in `src/` (the tree is currently console-free; keep it that way — errors go
  to UI state, not the console).
- Swallowing errors in gateways so cloud and local modes diverge silently.

## Enforcement

- `@typescript-eslint/no-floating-promises`, `promise` plugin, `no-empty`, sonarjs;
  layer rules keep vendor errors inside facades.
- Unit tests for the mapping table; e2e failure paths where journeys cover them.

## Definition of done

New failure modes have mapped bilingual copy, a rendered failure state with retry, direct
tests for the mapping, and no floating promises or silent catches introduced.
