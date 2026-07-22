# 00 — Non-negotiable rules

Governance-Version: 1

These 35 rules are absolute for FoodOrderV1. They are enforced by the custom ESLint plugin
(`eslint/architecture-plugin/`), the configured third-party plugins, CI
(`.github/workflows/ci.yml`), and review. A deviation exists only as a written exception
(see [19-exceptions-policy.md](19-exceptions-policy.md); active set:
[../docs/migration/unresolved-exceptions.md](../docs/migration/unresolved-exceptions.md)).

## Architecture and layering

1. Dependency direction is one-way: `src/app` → `src/modules/*` → `src/shared`/`src/platform`
   → `src/packages` → vendor. No layer imports upward
   (`architecture/no-restricted-layer-imports`).
2. Feature code lives in exactly one module under `src/modules/` (auth, buckets,
   group-orders, orders, social, notifications, dashboard, settings, session, data-access).
   No feature logic in `src/app`, `src/shared`, or `src/platform`.
3. Cross-module imports use only the module's public surface `@/modules/<name>`; deep
   imports are forbidden (`architecture/no-cross-module-deep-imports`).
4. Vendor packages are imported only inside their owner under `src/packages/`; everywhere
   else uses `@/packages/<name>` (`architecture/no-raw-package-imports`, registry in
   `eslint/package-ownership.config.mjs`).
5. A new npm dependency enters application source only with a registry entry and an owner
   facade first ([../skills/create-package-owner.md](../skills/create-package-owner.md)).
6. Browser globals (`window`, `document`, `navigator`, `localStorage`, `sessionStorage`,
   `matchMedia`, `history`, `location`) are touched only inside `src/platform`
   (`architecture/no-browser-globals-outside-platform`).
7. `import.meta.env` / `process.env` are read only in `src/platform/environment`, which
   validates once and exposes a typed `env` object (`architecture/no-env-outside-environment`).
8. `src/app` is composition only (providers, router, shell); it holds no business logic.

## React

9. React hooks are called only in `*.hook.ts` files or `hooks/` directories
   (`architecture/no-hooks-outside-hook-files`).
10. `*.component.tsx` files call zero hooks — components are pure UI (props in, callbacks out).
11. Containers, providers, `*.routes.tsx`, shell, and router files call project-owned hooks
    only; never built-in or vendor hooks directly.
12. One component per file (`react-refresh/only-export-components`); no
    `react-hooks/rules-of-hooks` or `exhaustive-deps` suppressions.

## Naming and types

13. Every file in the layered tree is kebab-case with a responsibility suffix
    (`.component.tsx`, `.container.tsx`, `.provider.tsx`, `.routes.tsx`, `.hook.ts`,
    `.service.ts`, `.gateway.ts`, `.helper.ts`, `.constants.ts`, `.types.ts`,
    `.interfaces.ts`, `.enums.ts`, `.adapter.ts`, ...) — `architecture/enforce-file-suffixes`
    + `unicorn/filename-case`. Interfaces, type aliases, enum-like sets, and module-scope
    constants live only in matching declaration owners (`*.interfaces.ts`, `*.types.ts`,
    `*.enums.ts`, `*.constants.ts`) — `architecture/enforce-declaration-placement`.
    Behavior files import them; old code is not exempt.
14. The `enum` keyword is banned; use `as const` objects with derived union types in
    `*.enums.ts` (`architecture/no-typescript-enum`).
15. Both typechecks pass: `npm run typecheck` (TS 7.0.2) and `npm run typecheck:tsc`
    (TS 5.9.3). No `any` escapes, no unchecked casts, strict type-checked lint rules stay on.

## Routing and state

16. Absolute route paths come only from typed constants/builders in `routes/` files; inline
    `'/...'` literals are forbidden (`architecture/no-inline-route-strings`).
17. App-wide state lives in `@/modules/session` (React context); no global store library and
    no server-state query library may be added.
18. UI never calls Firebase directly; all persistence goes through the `data-access` service
    contracts and their dual cloud/local gateways.

## Security and privacy

19. Never weaken `firestore.rules`; ownership and role checks are server-side, never
    client-trusted. Rules changes require emulator denial/success tests (`npm run test:rules`).
20. No secrets in source. Firebase configuration enters only via `VITE_FIREBASE_*` env at
    build time; never commit credentials, service-account keys, or production data.
21. Personal documents stay under `users/{uid}` (owner-only); shared buckets follow the
    owner/editor/contributor/viewer role matrix.
22. Invite tokens store only SHA-256 hashes, expire in 72h, and are single-use.
23. Local-device mode is never presented or used as secure authentication; its data stays
    on the device.

## Quality gates

24. `eslint . --max-warnings 0` passes, and `npm run lint:fix` produces zero diff (CI
    enforces committed autofixes).
25. `npm run format:check` passes (Prettier via `scripts/check-format.mjs`).
26. All tests pass; tests are never skipped, focused, weakened, or deleted to go green.
27. Pure layers (`src/shared/helpers`, module `helpers/`, domain logic) target 100%
    coverage; instrumented-scope limits are governed by EXC-3 only.
28. No circular imports (`npm run quality:circular`) and no dead code
    (`npm run quality:dead-code`).
29. `npm run security:audit` (root + functions) and Trivy HIGH/CRITICAL stay clean.
30. `package.json` and `functions/package.json` versions match (`npm run quality:release`).
31. Conventional commits (`commitlint`); husky pre-commit/pre-push hooks are never bypassed.

## Process

32. `.ai/` is generated — never hand-edit. After canonical doc changes run
    `npm run knowledge:build:incremental` and `npm run knowledge:validate`.
33. Behavior-preserving migration: never rewrite working business logic without
    characterization tests (this is why EXC-1 exists).
34. Every deviation is a documented exception with owner and removal condition; silent or
    expanding exceptions are forbidden.
35. Every user-visible string has complete, non-placeholder catalog entries for all
    supported locales (`en`, `ar`, `it`, `fa`, `fr`, `de`, `es`, `pt-BR`,
    `hi`, `th`, `zh-CN`, `ja`); `ar` and `fa` are RTL-safe, and accessibility
    (labels, focus, keyboard, `jsx-a11y`) is never regressed.

When a rule fails, the code is in the wrong layer. Move or redesign the code. Do not disable the rule.
