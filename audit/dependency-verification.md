# Phase 06 — Dependency verification report

Date: 2026-07-13. Registry evidence via `npm view` (exit 0).

## TypeScript 7.0.2 (USR-005)
- `npm view typescript@7.0.2 version` → `7.0.2` — **officially published**; dist-tags: `latest: 7.0.2`, `rc: 7.0.1-rc`, `next: 7.1.0-dev.20260712.1`.
- Adopted as the **primary compiler**: installed as alias `typescript7@npm:typescript@7.0.2` (exact);
  `npm run typecheck` and `npm run build` invoke `node node_modules/typescript7/bin/tsc -b`.
  Evidence: typecheck exit 0, build gate passes, all 10 unit tests green under the TS7-checked tree.
- **Compatibility limit found:** `typescript-eslint` (latest `8.63.0`, verified) fails to load TS 7
  (`ts.ModuleKind.Cjs` API change → "Cannot read properties of undefined (reading 'Cjs')").
  Per the version-truth policy, a **compatible fallback compiler is retained**: `typescript@6.0.2`
  (exact) remains the `typescript` package used by the lint toolchain and editors, exposed as
  `npm run typecheck:tsc`. Both compilers pass on the same sources (evidence: both commands exit 0).
- Revisit: when typescript-eslint publishes TS-7 support, collapse to a single compiler.

## typescript-eslint
- Attempted pin to 8.44.1 → ERESOLVE against the current tree; `8.63.0` (latest) installs cleanly
  with `typescript@6.0.2` and runs green after codebase fixes (146 → 0 problems; 110 autofixes +
  manual fixes; 3 documented config decisions: template numbers allowed, `_`-prefix unused pattern,
  `require-await` off for the synchronous local adapter only; `react-refresh/only-export-components`
  off for `src/state/**` provider+hook modules).

## Other groups (staged per policy)
- Runtime (React 19.2, react-router 7.9, firebase 12.4, lucide 0.545), Capacitor 8, Vite 7.1,
  Vitest 3.2, Playwright 1.55: unchanged this cycle — held at the audited baseline; 8 open
  grouped Dependabot PRs (#1–#8) remain for post-release review (RISK-010).
- Lockfile: `package-lock.json` generated and **committed for the first time** (was untracked —
  deterministic-install gap closed).
- `npm audit` executed in Phase 11 with results recorded in `audit/security-review.md`.
