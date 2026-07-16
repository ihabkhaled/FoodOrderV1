# Capacitor reviewer

Scope: platform boundary, native shells, plugin surface. Rules:
[../rules/09](../rules/09-capacitor-platform-boundaries.md); audit:
[../docs/migration/native-security-audit.md](../docs/migration/native-security-audit.md).

## Checklist

- [ ] No browser global (`window`, `document`, `navigator`, `localStorage`, ...) outside
      `src/platform`; no `import.meta.env`/`process.env` outside `src/platform/environment`.
- [ ] No raw `@capacitor/*` import outside its `src/packages/capacitor-*` owner; modules
      consume platform abstractions, not plugin facades.
- [ ] Web fallback exists for every native capability (e2e runs pure web and must pass).
- [ ] New plugin? Registry entry + facade + platform adapter + security-audit update +
      Android manifest diff reviewed for new permissions
      ([../skills/add-capacitor-plugin.md](../skills/add-capacitor-plugin.md)).
- [ ] `capacitor.config.ts` unchanged with respect to safety: no `server.url` override, no
      cleartext allowance; production bundle still ships without sourcemaps.
- [ ] `npm run cap:sync` run when shipped web assets changed; synced `android/`/`ios/`
      diffs committed and reviewed (gradle `versionName`/`versionCode` only via the
      release tool).
- [ ] Android smoke executed for device-facing behavior (`npm run cap:run:android`) and
      the result reported honestly.
- [ ] iOS: no validation claimed (EXC-5); iOS-affecting changes recorded as pending macOS
      verification in the native audit.
- [ ] Local-device mode statements stay honest: single-device, unencrypted by design, not
      secure auth.

## Blocking question

If this ran inside the Android WebView with no network, does it degrade exactly as the
platform adapter promises?
