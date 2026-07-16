# Architecture map

Target layout (enforced end state; migration status per directory in
[../docs/migration/module-migration-status.md](../docs/migration/module-migration-status.md)).
Authoritative narrative: [../architecture/README.md](../architecture/README.md).

```text
src/
├── main.tsx                 # bootstrap (react-dom/client — the only place)
├── app/                     # composition only
│   ├── providers/           # session provider mounting, top-level composition
│   ├── router/              # assembles module route fragments + guard layouts
│   └── shell/               # app layout, auth layout, navigation chrome
├── modules/
│   ├── auth/                # login, register, forgot-password screens
│   ├── buckets/             # bucket list, editor, filters, bucket cards
│   ├── group-orders/        # collaborate, share/join codes, contributions, receipts
│   ├── orders/              # order list, details, create-order, status handling
│   ├── social/              # social page, social share panels
│   ├── notifications/       # notification center
│   ├── dashboard/           # home dashboard
│   ├── settings/            # runtime preferences screen (locale/currency/theme)
│   ├── session/             # app-wide user/session/toast/locale state provider + hooks
│   └── data-access/         # persisted domain types, service contracts,
│                            # dual cloud/local gateways, storage-mode selection (EXC-1)
├── shared/
│   ├── ui/                  # Loading, EmptyState, ErrorState, ConfirmDialog,
│   │                        # VirtualListFooter, RefreshableViewport, ...
│   ├── helpers/             # date, money, id, validation, pagination (pure, 100% cov)
│   └── i18n/                # translate(locale, key) engine + core en/ar catalog
├── platform/
│   ├── environment/         # sole reader of import.meta.env → typed env
│   ├── browser/             # document/window: theme, lang/dir, listeners, clipboard
│   ├── device/              # haptics, status bar, keyboard (Capacitor + web fallback)
│   ├── network/             # online/offline status
│   └── storage/             # persistent KV storage backing local-device mode
└── packages/                # vendor facades (sole raw-import sites)
    ├── firebase/            # + bilingual error table (EXC-4)
    ├── router/  icons/  virtuoso/
    └── capacitor-core/ -haptics/ -network/ -preferences/ -status-bar/
```

Legacy directories (`src/components`, `src/pages`, `src/services`, `src/state`,
`src/hooks`, `src/lib`, `src/config`, `src/i18n`, `src/types`) empty out file-by-file and
are deleted. `src/packages/virtuoso` already exists (pre-1.6.0).

Outside `src/`: `functions/` (Firebase callables, own package.json — version must match
root), `android/` + `ios/` (committed Capacitor shells), `eslint/architecture-plugin/`
(the enforcement), `tests/` (unit/domain/services/components/eslint/firebase/e2e),
`scripts/` + `tools/` (build/release/knowledge tooling), `.ai/` (generated knowledge —
never hand-edited).
