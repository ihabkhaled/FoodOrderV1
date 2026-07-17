# 08 — Package ownership

## Rule

Every npm dependency imported by application source has exactly one owning integration
module under `src/packages/`, registered in `eslint/package-ownership.config.mjs`. All
other application code imports the owner's public facade `@/packages/<name>`, never the
raw package.

## Motivation

One owner per vendor package means one place to adapt, mock, upgrade, or replace a
dependency, and one reviewable surface for what the app actually uses from it. Unregistered
imports are rejected, so a dependency cannot creep into the codebase without an ownership
decision.

## Required

- Registry entries (current): `firebase` → `src/packages/firebase`; `react-router-dom` →
  `src/packages/router`; `lucide-react` → `src/packages/icons`; `react-virtuoso` →
  `src/packages/virtuoso`; `@capacitor/core|haptics|network|preferences|status-bar` →
  `src/packages/capacitor-*`; reserved no-owner entries for `@capacitor/app` and
  `@capacitor/keyboard` (EXC-2).
- Foundational exceptions (importable without a facade): `react`, `react/jsx-runtime`;
  `react-dom/client` restricted to `src/main.tsx`.
- New dependency workflow: [../skills/create-package-owner.md](../skills/create-package-owner.md)
  — registry entry + owner module + facade before the first application import, plus a row
  in [../docs/migration/package-wrapper-status.md](../docs/migration/package-wrapper-status.md).
- Facades re-export a curated, typed surface — only what the app uses.

## Forbidden

- Raw vendor imports outside the owner directory (including subpaths:
  `firebase/firestore` matches the `firebase` owner).
- Adding entries to `foundationalImports` — that list is closed.
- Facades that blanket `export *` an entire vendor package.
- A package owner importing project code from `app`, `modules`, `shared`, or `platform`.
- Two owners for one dependency, or one owner wrapping unrelated dependencies.

## Enforcement

- `architecture/no-raw-package-imports` (error) driven by the registry;
  `architecture/no-restricted-layer-imports` keeps owners at the bottom layer.
- Tests and build/tooling configuration are outside the registry's scope by design.

## Definition of done

The dependency has a registry entry, an owner module with `index.ts` facade, zero raw
imports elsewhere (`npm run lint` proves it), and the wrapper-status table is updated.
