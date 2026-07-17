# Package boundary reviewer

Scope: dependencies, ownership registry, facades. Rules:
[../rules/08](../rules/08-package-ownership.md);
registry: `eslint/package-ownership.config.mjs`.

## Checklist

- [ ] Every new `package.json` dependency that application source imports has a registry
      entry AND an owner facade under `src/packages/` before its first import.
- [ ] No raw vendor import outside the owner directory — including subpaths
      (`firebase/firestore`, `@capacitor/haptics`).
- [ ] `foundationalImports` untouched (`react`, `react/jsx-runtime`, `react-dom/client`);
      `react-dom/client` still only in `src/main.tsx`.
- [ ] Facades export a curated surface (no `export *`); knip reports no unused facade
      exports.
- [ ] Package owners import no project code from app/modules/shared/platform.
- [ ] One owner per dependency; no owner wraps unrelated packages.
- [ ] Reserved entries (`@capacitor/app`, `@capacitor/keyboard`, EXC-2) still have zero
      web import sites — first use must create the owner module.
- [ ] Banned categories not introduced: state stores, server-state query libs, i18n libs
      ([../rules/11](../rules/11-state-management.md),
      [../rules/15](../rules/15-internationalization.md)).
- [ ] Supply chain: `npm run security:audit` clean at HIGH (root + functions); lockfiles
      updated coherently; `docs/migration/package-wrapper-status.md` and
      [../context/package-ownership.md](../context/package-ownership.md) updated.
- [ ] Version majors stay coherent (Capacitor plugins on 8.x with core).

## Blocking question

If this dependency had to be replaced next quarter, is the blast radius exactly one
directory under `src/packages/`? If not, the boundary leaked.
