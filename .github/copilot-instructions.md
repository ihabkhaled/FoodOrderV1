# FoodOrderV1 — Copilot instructions

Governance-Version: 1

Canonical source of truth: `AGENTS.md` at the repo root. Read it first; this file is a digest.
Task playbooks live in `skills/`, hard rules in `rules/00-non-negotiable-rules.md`,
architecture in `architecture/README.md`.

## Hard rules

- Layers are one-way: `src/app` → `src/modules/*` → `src/shared`/`src/platform` → `src/packages` → vendor.
- Feature code lives in exactly one module (auth, buckets, group-orders, orders, social,
  notifications, dashboard, settings, session, data-access).
- Import other modules and vendor facades only via `@/modules/<name>` / `@/packages/<name>`;
  no deep imports.
- Vendor packages (firebase, react-router-dom, lucide-react, react-virtuoso, @capacitor/*)
  are imported only inside their owner under `src/packages/*`
  (registry: `eslint/package-ownership.config.mjs`).
- React hooks only in `*.hook.ts` files or `hooks/` dirs; `*.component.tsx` calls zero hooks;
  containers call project hooks only.
- Browser globals only in `src/platform`; `import.meta.env`/`process.env` only in
  `src/platform/environment`.
- Absolute route strings only in `routes/` files; kebab-case filenames with responsibility
  suffixes (`.component.tsx`, `.container.tsx`, `.hook.ts`, `.service.ts`, `.gateway.ts`, ...).
- `enum` is banned — use `as const` objects in `*.enums.ts`.
- Every user-visible string has `en` and `ar` catalog entries; RTL must keep working.
- Never weaken `firestore.rules`, auth, ownership isolation, tests, or accessibility.
- `.ai/` is generated — never hand-edit.
- When a rule fails, the code is in the wrong layer. Move or redesign the code. Do not disable the rule.

## Validation

```bash
npm run lint:fix && npm run lint     # CI requires zero diff from lint:fix
npm run typecheck && npm run typecheck:tsc   # both TypeScript versions must pass
npm run test && npm run build
npm run test:e2e                     # Playwright, always local mode
npm run knowledge:build:incremental && npm run knowledge:validate
```

Commits follow conventional-commits (`commitlint`); never bypass husky hooks.
