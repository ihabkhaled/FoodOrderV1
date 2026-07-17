# Module anatomy

What one feature module looks like inside (target state; rule:
[../rules/02-feature-modules.md](../rules/02-feature-modules.md)). Using `orders` as the
example:

```text
src/modules/orders/
├── index.ts                              # ONLY public surface
├── README.md                             # responsibility + surface, one paragraph
├── routes/
│   └── orders.routes.tsx                 # path constants, builders, <Route> fragment
├── containers/
│   ├── orders-page.container.tsx         # list screen wiring
│   ├── order-details-page.container.tsx
│   └── create-order-page.container.tsx
├── components/                           # UI-only, zero hooks
│   ├── order-row.component.tsx
│   ├── order-action-bar.component.tsx
│   ├── order-participants-section.component.tsx
│   └── status-badge.component.tsx
├── hooks/                                # ALL hook calls live here
│   ├── use-orders-view-model.hook.ts
│   └── use-order-details-view-model.hook.ts
├── helpers/                              # pure logic, 100% coverage target
│   └── order-presentation.helper.ts
└── types/
    └── orders-view.types.ts              # module-private view types
```

Rules of thumb:

- Create only the layers the module needs — empty placeholder directories are forbidden.
- `index.ts` exports: the route fragment/constants `src/app` mounts, and types other
  modules legitimately consume. Internals stay private
  (`architecture/no-cross-module-deep-imports`).
- Persisted domain types and persistence live in `data-access`, NOT here; this module's
  `types/` is for view-level shapes only.
- Feature-owned i18n: `social` and `group-orders` carry their own `en`/`ar` catalogs
  (legacy `socialMessages.ts` / `groupOrderMessages.ts`); other modules use the core
  catalog in `src/shared/i18n`.
- The special modules differ: `session` is provider + hooks + helpers (no routes/
  components); `data-access` is contracts + gateways + domain helpers + storage-mode
  selection (no UI at all).

Migration sources per module: see the table in
[../docs/migration/module-migration-status.md](../docs/migration/module-migration-status.md).
