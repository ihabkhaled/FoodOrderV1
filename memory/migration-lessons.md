# Migration lessons (v1.6.0 module-first)

Durable lessons from restructuring ~83 files / ~13,000 lines under `src/`. Live status:
[../docs/migration/](../docs/migration/README.md).

## What worked

- **Enforcement before migration.** Landing the ESLint architecture plugin (with its 54
  RuleTester cases) BEFORE moving files means code enters the new layout only in a
  compliant state — no cleanup backlog accumulates in the new tree.
- **Inventory first.** Measuring the violations up front
  ([../docs/migration/architecture-violation-inventory.md](../docs/migration/architecture-violation-inventory.md):
  196 hook calls in 22 files, 23 files with raw router imports, 32 with raw icon imports,
  ~16 files with inline routes) turned "refactor everything" into a checklist with an end.
- **Move, don't rewrite.** Behavior-preserving moves keep the 7 Playwright journeys as the
  safety net; every "small improvement" during a move is where regressions came from.
- **Exceptions as first-class documents.** EXC-1..EXC-5 let the migration proceed honestly
  instead of stalling on purity (data-access cohesion, reserved plugin entries, coverage
  scope, error-copy placement, iOS honesty).
- **Bottom-up order.** Packages → platform → shared → data-access/session → feature modules
  → app: each layer's landlord exists before its tenants move in.

## What to watch

- **Hook extraction changes render timing.** Moving `useEffect` chains from pages into
  view-model hooks can reorder effect execution; the guarded mount-loader pattern (see the
  `react-hooks/set-state-in-effect` note in `eslint.config.js`) must be preserved as-is.
- **Route-constant extraction touches everything at once.** Inline-path removal fans out
  across ~16 files; do it as its own commit so the diff stays reviewable.
- **Dual-implementation files must split one-gateway-per-file** (notificationServices,
  orderLifecycleServices, paginationServices, socialServices, localServices) — splitting
  and moving in one step is how imports get tangled; split in place first, then move.
- **Legacy↔new back-references** are the failure mode of partial migrations: a legacy file
  importing `@/modules/*` compiles but inverts the deletion order. Migrate dependency-first.
- **knip after every batch.** Emptied legacy files leave orphan exports that fail the
  dead-code gate at the worst moment (release).
- **Coverage include-list follows the code.** `vitest.config.ts` instruments explicit paths
  (`src/lib/**`, local adapter); moving covered files without updating the include list
  silently drops coverage.

## Standing constraint

`src/lib/groupOrder.ts` reaches into `packages/group-order-engine/src` via a relative
escape — resolve it during the data-access migration (facade or module absorption), never
replicate the pattern.
