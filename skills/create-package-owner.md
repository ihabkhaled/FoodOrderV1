# Skill: create a package owner

Use for ANY new npm dependency that application source will import (Capacitor plugins have
their specialized variant: [add-capacitor-plugin.md](add-capacitor-plugin.md)).

## Required reading

[../rules/08-package-ownership.md](../rules/08-package-ownership.md),
`eslint/package-ownership.config.mjs` (the registry itself),
`src/packages/virtuoso/index.ts` (reference facade).

## Preconditions

- The dependency is genuinely needed (no existing facade or shared helper covers it) and
  passed a supply-chain look: maintenance status, license, `npm audit` clean at HIGH.
- It does not smuggle in a banned category (state/query libraries — see
  [../rules/11-state-management.md](../rules/11-state-management.md)).

## Steps

1. `npm install <package>` (dependencies vs devDependencies as appropriate — only
   app-imported packages need owners).
2. Add the registry entry in `eslint/package-ownership.config.mjs`:

   ```js
   '<package>': {
     owner: 'src/packages/<facade-name>',
     publicImport: '@/packages/<facade-name>',
   },
   ```

3. Create `src/packages/<facade-name>/index.ts` exporting a curated, typed surface —
   re-export what the app uses, adapt names where the vendor API is awkward.
4. Import `@/packages/<facade-name>` from the consuming layer (platform/shared/modules per
   the layer matrix). The raw package name now lints as an error everywhere else.
5. Add a row to
   [../docs/migration/package-wrapper-status.md](../docs/migration/package-wrapper-status.md)
   and update [../context/package-ownership.md](../context/package-ownership.md).

## Forbidden shortcuts

- Importing the raw package "until the facade lands".
- `export * from '<package>'` blanket facades.
- Touching `foundationalImports` — that list (`react`, `react/jsx-runtime`,
  `react-dom/client`) is closed.
- Wrapping two unrelated packages in one owner.

## Required tests

The facade itself is typically type-only re-export (compiler-verified). Any adapting logic
in the facade gets a unit test. Consumers' existing suites must stay green.

## Validation

```bash
npm run lint && npm run typecheck && npm run typecheck:tsc && npm run test
npm run quality:dead-code   # knip: no unused facade exports
npm run security:audit
npm run build
```

## Definition of done

Registry entry + owner facade + updated docs; `npm run lint` proves zero raw imports;
knip reports no dead exports on the facade; audits clean.
