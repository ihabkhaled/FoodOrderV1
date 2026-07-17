# Skill: add a Capacitor plugin

## Required reading

[../rules/09-capacitor-platform-boundaries.md](../rules/09-capacitor-platform-boundaries.md),
[../rules/08-package-ownership.md](../rules/08-package-ownership.md),
[../docs/migration/native-security-audit.md](../docs/migration/native-security-audit.md).

## Preconditions

- A web-graceful design exists: the feature degrades (no-op or web API fallback) when not
  running natively — e2e runs pure web.
- Permission surface reviewed: the current plugin set is deliberately low-permission
  (app, core, haptics, keyboard, network, preferences, status-bar). Camera/geolocation/
  filesystem/biometrics require a security review first.

## Steps

1. `npm install @capacitor/<plugin>` (exact scope; keep major aligned with Capacitor 8).
2. **Package-ownership registry update** (mandatory, before any import): add the entry to
   `eslint/package-ownership.config.mjs`:

   ```js
   '@capacitor/<plugin>': {
     owner: 'src/packages/capacitor-<plugin>',
     publicImport: '@/packages/capacitor-<plugin>',
   },
   ```

3. Create the owner facade `src/packages/capacitor-<plugin>/index.ts` re-exporting the
   curated surface (only what the app uses).
4. Consume the facade from a `src/platform` adapter (device/network/storage as fits) that
   provides the web fallback; modules use the platform abstraction, never the facade.
5. `npm run cap:sync`; inspect `android/` diff (new permissions in the manifest are a
   review item). Commit the synced native project changes.
6. Update [../docs/migration/package-wrapper-status.md](../docs/migration/package-wrapper-status.md),
   the native security audit, and
   [../context/capacitor-capability-map.md](../context/capacitor-capability-map.md).

## Forbidden shortcuts

- Importing `@capacitor/<plugin>` anywhere outside its `src/packages/capacitor-*` owner.
- Skipping the registry entry (lint will reject the import as unregistered — do not
  "fix" that with a disable).
- Shipping without a web fallback; letting e2e depend on native behavior.
- Claiming iOS validation (EXC-5) — record iOS steps as pending instead.

## Required tests

Unit coverage for the platform adapter's fallback logic where pure; e2e must stay green
(proves web degradation); Android smoke test on device/emulator:
`npm run cap:run:android`.

## Validation

```bash
npm run lint && npm run typecheck && npm run typecheck:tsc && npm run test
npm run build && npm run cap:sync
npm run test:e2e
npm run security:audit
```

## Definition of done

Registry + facade + platform adapter in place; web fallback proven by green e2e; Android
smoke executed and reported honestly; audit and status docs updated.
