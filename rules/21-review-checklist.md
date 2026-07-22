# 21 — Review checklist

Mechanical pass over every diff before hand-off or merge. Answer each item yes/no; any
"no" blocks until fixed or covered by a written exception
([19-exceptions-policy.md](19-exceptions-policy.md)). Reviewer personas with deeper
checklists: [../agents/README.md](../agents/README.md).

## Placement

- [ ] Every new/moved file sits in its owning layer (`app`/`modules/<name>`/`shared`/
      `platform`/`packages/<name>`) — no feature logic outside its module.
- [ ] Filenames are kebab-case with a truthful responsibility suffix.
- [ ] Interfaces, type aliases, enum-like sets, and module constants are imported from
      matching `*.interfaces.ts`, `*.types.ts`, `*.enums.ts`, and `*.constants.ts`
      owners; no old or new behavior file declares them inline.
- [ ] No import points upward in the layer matrix; no cross-module deep imports; only
      `@/modules/<name>` / `@/packages/<name>` surfaces used.

## React

- [ ] No hook call in any `*.component.tsx`; containers/providers call project hooks only.
- [ ] New hooks live in `*.hook.ts` / `hooks/`; effects have correct deps and cleanup.
- [ ] One component per file; components receive data via props only.

## Boundaries

- [ ] No raw vendor import outside `src/packages/*` owners; new deps registered in
      `eslint/package-ownership.config.mjs` with a facade.
- [ ] No browser global outside `src/platform`; no env read outside `src/platform/environment`.
- [ ] No inline absolute route string; route constants/builders used and exported from `routes/`.
- [ ] No `enum`; `as const` + derived union instead.

## Behavior and safety

- [ ] UI reaches persistence only through `data-access` contracts.
- [ ] Errors normalized; complete supported-locale copy for new failure modes; no floating promises, no
      empty catch, no `console.*` in `src/`.
- [ ] `firestore.rules` untouched — or changed WITH emulator allow/deny tests and a
      security review.
- [ ] No secret, credential, or production data in the diff.
- [ ] New user-visible strings exist in all 12 supported locales; clone/placeholder checks
      pass; Arabic and Persian RTL layouts are verified.
- [ ] Interactive elements labeled and keyboard-operable; no `jsx-a11y` suppression.

## Evidence

- [ ] Direct tests exist at the right level (unit for pure logic, e2e for screens, emulator
      for rules) and were executed, not assumed.
- [ ] No `.only`/`.skip`; no assertion weakened or deleted to pass.
- [ ] Touched pure-layer files hold 100% coverage (EXC-3 governs the rest).

## Gates and hygiene

- [ ] `npm run lint:fix` diff committed; `npm run lint` clean; both typechecks pass.
- [ ] `npm run format:check`, `build`, `quality:circular`, `quality:dead-code` pass.
- [ ] `npm run quality:release` passes if any version changed.
- [ ] Zero new `eslint-disable`; any existing one in the diff carries a reason + exception.
- [ ] Conventional commit message; no `--no-verify`.

## Documentation

- [ ] Affected canonical docs updated (`rules/`, `context/` maps, `docs/migration/` status
      tables); `npm run knowledge:build:incremental` + `knowledge:validate` run.
- [ ] Any deviation has its exception document, linked from the code site.
- [ ] `node scripts/check-agent-docs.mjs` passes if governance docs were touched.
