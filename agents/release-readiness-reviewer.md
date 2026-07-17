# Release readiness reviewer

Scope: version bumps, release prep, CI workflow changes. Rules:
[../rules/20](../rules/20-release-gates.md), [../rules/versioning.md](../rules/versioning.md);
flow: [../skills/versioning/SKILL.md](../skills/versioning/SKILL.md).

## Checklist

- [ ] Every CI gate green on the exact candidate commit — `all-gates-green` passing, no
      job skipped or retried-into-green without diagnosis.
- [ ] Bump level matches prompt density (patch/minor/major per
      [../rules/versioning.md](../rules/versioning.md)); mixed changes take the highest.
- [ ] Version sync intact: `package.json` = `functions/package.json`
      (`npm run quality:release`); `android/app/build.gradle` versionName matches and
      versionCode increased — all via `npm run release:*`, never hand-edited.
- [ ] `CHANGELOG.md` entry + `release-notes/vX.Y.Z.md` written and truthful (including
      known gaps).
- [ ] Annotated tag `vX.Y.Z` on the exact release commit; APK built from that commit with
      SHA-256 attached; no `*.apk` committed to the repo.
- [ ] Firestore rules/functions deploy implications reviewed; rollback stated (previous
      rules/functions restorable, data compatible).
- [ ] Open exceptions reviewed: nothing in
      [../docs/migration/unresolved-exceptions.md](../docs/migration/unresolved-exceptions.md)
      or `docs/exceptions/` blocks this release; no exception silently expanded.
- [ ] iOS claims honest: Android is the shipped platform; iOS unvalidated (EXC-5).
- [ ] Open critical facts not invented (production Firebase config, retention duration,
      store signing — see `.ai/BOOTSTRAP.md`).
- [ ] CI workflow diffs (`.github/workflows/`) reviewed for weakened gates — removing or
      softening a job from `all-gates-green.needs` is a blocking finding.
- [ ] `node scripts/check-agent-docs.mjs` passes; knowledge build/validate green.

## Blocking question

If this release is bad, can you name the exact rollback command path today? If not, it is
not ready.
