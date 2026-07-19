# FoodOrderV1 — Copilot instructions

Governance-Version: 1

Canonical source of truth: `AGENTS.md`. Read it before writing code. Then read `.ai/BOOTSTRAP.md`, resolve task context with `npm run knowledge:context`, and follow the matching `skills/` playbook and canonical `rules/` documents.

## Hard rules

- One-way architecture: `src/app` → `src/modules/*` → `src/shared`/`src/platform` → `src/packages` → vendor.
- Feature behavior lives in exactly one module and is consumed only through public module surfaces.
- Vendor packages are imported only by their registered `src/packages/<name>` owner facade.
- React hooks live only in hook files; UI components call zero hooks; containers call project hooks only.
- Browser globals live only in `src/platform`; environment reads live only in `src/platform/environment`.
- Absolute paths live in route ownership files; filenames are kebab-case with truthful responsibility suffixes.
- TypeScript `enum` is banned; use typed `as const` objects and derived unions.
- Domain constants, interfaces, types, helpers, state machines, validators, adapters, and contracts must not be hidden inline in screens or giant hooks. Give each artifact a truthful owned file.
- No new state/query library. Session context, service contracts, and owning hooks remain the state model.
- Every user-visible string has complete English and Arabic entries; RTL, accessibility, privacy, and dark mode remain first-class behavior.
- Never weaken Firestore/Storage rules, auth, ownership, tests, coverage, migration safety, or rollback readiness.
- `.ai/` is generated. Never hand-edit it.

## Version branches

For branches named `X.Y.Z`, `release/X.Y.Z`, or `X.Y.Z/<feature>`, follow `skills/start-version-branch.md`. The committed source version must match the target before commit/push. Every green branch push creates a unique checksum-verified prerelease APK without CI committing back to the branch.

## Validation

```bash
npm run release:branch-check
npm run lint:fix && git diff --exit-code && npm run lint
npm run typecheck && npm run typecheck:tsc
npm run test && npm run test:coverage
npm run build
npm run quality:circular && npm run quality:dead-code && npm run quality:release
npm run test:e2e && npm run test:e2e:critical && npm run test:e2e:cross-browser
npm run knowledge:build:incremental && npm run knowledge:validate
```

Use conditional Functions, rules, security, native, accessibility, visual, migration, performance, telemetry, and billing gates whenever the change touches them. Never bypass Husky or report an unexecuted gate as green.
