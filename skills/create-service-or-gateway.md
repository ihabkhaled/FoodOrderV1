# Skill: create a service or gateway

## Required reading

[../rules/06-services-and-gateways.md](../rules/06-services-and-gateways.md),
[../rules/13-security.md](../rules/13-security.md),
[../architecture/adrs/0005-data-access-module.md](../architecture/adrs/0005-data-access-module.md)
(EXC-1), and the invariants in `.ai/BOOTSTRAP.md`.

## Preconditions

- The behavior is persistence/integration, not view logic.
- You know whether it extends an existing `data-access` contract or needs a new one.
- BOTH backends are planned: cloud (Firestore/callable) and local-device. A cloud-only
  feature breaks local mode and e2e.

## Steps

1. Declare/extend the contract in `src/modules/data-access` (`*.interfaces.ts`), with
   domain types in `*.types.ts` and errors in `*.errors.ts`.
2. Implement the local gateway (`*-local.gateway.ts` naming pattern) over
   `src/platform/storage`; implement the cloud gateway over `@/packages/firebase`
   (transactions own contribution writes; mutation ids stay replay-safe).
3. Wire both into the storage-mode selection so `VITE_FORCE_LOCAL_MODE` / missing
   `VITE_FIREBASE_*` picks local.
4. Normalize errors before they leave the layer
   ([../rules/12-error-handling.md](../rules/12-error-handling.md)).
5. If Firestore document paths or access patterns changed: update `firestore.rules` WITH
   emulator allow/deny tests, and review `firestore.indexes.json`.
6. Expose the capability through `data-access`'s public surface; consume via a module hook.

## Forbidden shortcuts

- Rewriting or splitting the existing dual-backend gateway classes without
  characterization tests (EXC-1).
- `localStorage`/`window` inside a gateway; raw `firebase/*` imports outside
  `src/packages/firebase`.
- Behavior that differs between the two backends beyond documented mode limits.
- Client-side-only authorization checks.

## Required tests

Local gateway: unit tests in `tests/services/`. Cloud gateway: Firestore rules suites in
`tests/firebase/` for changed paths; callable changes covered by `functions/test/*` and CI
smoke tests. Contract-level behavior: the owning e2e journey (runs local mode).

## Validation

```bash
npm run test && npm run typecheck && npm run typecheck:tsc && npm run lint
npm run test:rules        # if firestore.rules or paths changed
npm run functions:validate # if functions/ changed
npm run test:e2e
```

## Definition of done

Both implementations satisfy the contract; rules tests prove allow AND deny; e2e green in
local mode; version parity intact if functions changed (`npm run quality:release`).
