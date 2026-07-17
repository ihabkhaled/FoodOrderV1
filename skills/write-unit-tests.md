# Skill: write unit tests

## Required reading

[../rules/16-testing-and-coverage.md](../rules/16-testing-and-coverage.md),
[../context/test-strategy-map.md](../context/test-strategy-map.md), a neighboring suite as
style reference (`tests/domain/order.test.ts` for domain, `tests/services/localServices.test.ts`
for gateways, `tests/components/ConfirmDialog.test.tsx` for UI).

## Preconditions

- The subject is unit-testable: pure helper/domain logic, a local gateway, a shared
  component, or an extracted hook helper. Screens/containers are e2e territory (EXC-3).
- You know the invariants the code must keep (`.ai/BOOTSTRAP.md` lists the universal ones:
  totals round to two decimals, terminal statuses, replay-safe mutations, ...).

## Steps

1. Place the file mirroring the subject: `tests/domain/`, `tests/services/`,
   `tests/components/` with `.test.ts(x)` suffix (Vitest picks up `tests/**/*.test.*`;
   jsdom environment, setup in `tests/setup.ts`).
2. Test behavior through the public API: given-input → expected-output, boundary values,
   error paths, and the domain invariants (e.g. draft→placed allowed, completed→anything
   rejected).
3. Components: render with props, query by role/label (Testing Library lint enforces it),
   assert callbacks via `user-event`.
4. Gateways: drive through the contract interface; assert persistence effects and replay
   behavior; keep them deterministic (control time/ids where the code allows injection).
5. Run focused first: `npx vitest run tests/domain/<file>.test.ts`.

## Forbidden shortcuts

- `.only`/`.skip` committed; assertions on implementation details (private functions, CSS
  classes, call counts without behavioral meaning).
- Mocking the module under test; over-mocking until the test proves nothing.
- Sleeps/timeouts for synchronization.
- Copying expected values from the implementation's output without verifying them by hand.

## Required tests

For touched pure files: 100% line/branch coverage (`npm run test:coverage`, scope per
EXC-3). Every fixed bug gets a regression test that fails on the old code.

## Validation

```bash
npx vitest run tests/<area>/<file>.test.ts
npm run test
npm run test:coverage
npm run lint   # vitest + testing-library plugins check the test code itself
```

## Definition of done

Suite green and deterministic (run it twice), coverage target met on touched pure files,
test names describe behavior, and the suite fails when the behavior it guards is broken.
