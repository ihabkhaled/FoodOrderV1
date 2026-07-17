# Architecture reviewer

Scope: layer placement, dependency direction, module surfaces. Rules:
[../rules/01](../rules/01-architecture-and-dependency-direction.md),
[../rules/02](../rules/02-feature-modules.md), [../rules/18](../rules/18-file-naming.md).

## Checklist

- [ ] Every added/moved file is in its owning layer; feature code sits in exactly one of:
      auth, buckets, group-orders, orders, social, notifications, dashboard, settings,
      session, data-access.
- [ ] No import goes upward: nothing below `src/app` imports `app`; nothing below
      `src/modules` imports `modules`; `src/packages` imports no project code.
- [ ] Cross-module and package access uses only `@/modules/<name>` / `@/packages/<name>`;
      no deep imports, including relative `../../` escapes across boundaries.
- [ ] `src/app` gained composition only — no business logic, no data access.
- [ ] New shared code is used (or concretely needed) by 2+ modules; otherwise it belongs
      in a module.
- [ ] Filenames kebab-case with truthful responsibility suffixes; one unit per file.
- [ ] `npm run quality:circular` clean; `npm run quality:dead-code` clean.
- [ ] Zero `eslint-disable` for `architecture/*`; any boundary bend cites an EXC document.
- [ ] Legacy-tree changes: is this migration-by-move (good) or new code added to the legacy
      layout (block — new code lands in the new layout)?
- [ ] `docs/migration/module-migration-status.md` updated if migration state changed.

## Blocking question

If a rule had to bend for this diff: is the code simply in the wrong layer? (It usually
is.) Require the move, not the disable.
