# Reference-repo parity & coverage roadmap

Honest status of replicating the engineering stack of `NextRanger`, `IronNest`, and `TwinzyAI` into
FoodOrderV1, and the path to 99%-per-file coverage. Done items are shipped; deferred items are real
multi-session work, not hidden.

## Done (shipped)

| Area | Reference stack | FoodOrderV1 |
|---|---|---|
| Package manager gates | husky + lint-staged + commitlint | ✅ `.husky/{pre-commit,commit-msg,pre-push}`, Conventional Commits |
| ESLint plugins | import-sort, unused-imports, jsx-a11y, promise, regexp, sonarjs, unicorn, security, prettier-config, vitest, testing-library, playwright | ✅ all 12 in `eslint.config.js`, applied to every file |
| Dead code / circular | knip, madge | ✅ `quality:dead-code`, `quality:circular` (madge: 0 circular) |
| Security scans | npm audit, trivy | ✅ `security:audit`, `security:scan` + CI security job |
| TypeScript | strict, dual/native compiler | ✅ TS 7.0.2 primary + 5.9.3 lint compiler, strictTypeChecked |
| CI gates | independent, least-privilege jobs | ✅ quality / e2e / security jobs on Node 26 |
| Versioning/release | semver + release automation | ✅ prompt-density skill/rule/tool + tag→APK→release |
| Dependencies | latest | ✅ Vite 8, Vitest 4, Firebase 12.16, react-router 7.18, lucide 1.x, all latest-compatible |

## Deferred (roadmap — not yet done, no false claims)

1. **99% per-file coverage.** Current coverage is strong on `src/lib` and `src/services/localServices`
   (domain + local adapter) but pages/components/Firestore adapter are exercised mainly by e2e, not
   per-file unit/component tests. Reaching 99%/file needs: component tests (Testing Library) for every
   page/component, a Firestore-adapter test suite against the emulator, and a coverage threshold gate in
   `vitest.config.ts`. Estimated: a dedicated testing pass per module.
2. **Module-first architecture** (`src/modules/<feature>/{domain,application,infrastructure,ui,...}`).
   Today the app uses a flat small-app layout (`lib`/`services`/`state`/`pages`/`components`). Migrating
   to the reference module structure is a large refactor; it should be done feature-by-feature with the
   ESLint architecture-boundary plugin, not in one sweep.
3. **Firestore emulator + rules tests** (`test:rules`) — needs the Firebase emulator in CI.
4. **Additional gates** the reference repos run (a11y e2e via axe, visual regression, mutation testing) —
   valuable follow-ups once component/e2e coverage is broader.
5. **v4 Huge Implementation Pack** (28 phases: react-virtuoso virtualization, cursor pagination,
   pull-to-refresh, dashboard tiles, localized app names, icon pipeline, exhaustive pentest). Each phase
   is its own increment; see `D:\Freelance\foodprojects Prompts\FoodOrderV1_v1.1.0_Huge_Implementation_Prompt_Pack_v4`.

## Principle

Every shipped item above is backed by green gates and a commit. Deferred items are listed so no one
mistakes "parity started" for "parity complete." They are the prioritized backlog for the next sessions.
