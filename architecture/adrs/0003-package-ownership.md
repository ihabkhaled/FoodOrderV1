# ADR-0003: Package ownership

- Status: Accepted
- Date: 2026-07-16

## Context

Raw vendor imports were everywhere: `react-router-dom` in 23 files, `lucide-react` in 32,
`firebase/*` in 8 service files. Upgrading or replacing a dependency meant a repo-wide
sweep; nothing stopped a new dependency (or a banned category, like a state library) from
entering silently. One good precedent existed: `react-virtuoso` was already isolated
behind `src/packages/virtuoso`.

## Decision

A machine-readable ownership registry (`eslint/package-ownership.config.mjs`) maps every
app-imported dependency to exactly one owner directory under `src/packages/` and one
public facade `@/packages/<name>`. The custom rule `architecture/no-raw-package-imports`
rejects raw imports outside the owner AND any unregistered bare import — a new dependency
cannot enter application source without an explicit ownership decision.

Foundational exceptions (closed list): `react`, `react/jsx-runtime`, and `react-dom/client`
(restricted to `src/main.tsx`). Reserved no-owner entries exist for `@capacitor/app` and
`@capacitor/keyboard` (native runtime deps, zero web import sites — EXC-2; empty
placeholder modules are forbidden). Tests and tooling config are out of scope.

## Consequences

- Vendor blast radius = one directory; upgrades and mocks have a single seam.
- Facades add a hop; kept cheap by re-export-style facades with curated surfaces.
- Subpath detection is prefix-based (`firebase/firestore` → `firebase` owner) — documented
  limitation, acceptable for the current dependency set.
- The registry doubles as governance: adding an entry is a reviewable, named decision
  (`skills/create-package-owner.md`).

## Enforcement

`architecture/no-raw-package-imports` (error) driven by the registry; layer matrix keeps
owners at the bottom; knip flags unused facade surface; status tracked in
`docs/migration/package-wrapper-status.md`.
