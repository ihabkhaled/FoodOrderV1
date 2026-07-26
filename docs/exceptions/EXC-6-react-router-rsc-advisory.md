# EXC-6: React Router RSC advisory

- **Rule**: [Release gates](../../rules/20-release-gates.md) require npm audit and
  Trivy to fail on every unreviewed HIGH or CRITICAL production finding.
- **Reason**: `GHSA-qwww-vcr4-c8h2` affects React Router's React Server
  Components action handling. FoodOrderV1 is a client-rendered Vite SPA and
  neither enables RSC mode nor exposes server actions. As of 2026-07-26, the
  npm registry has no patched React Router v7 release; downgrading to 7.11.0
  introduces several other HIGH advisories.
- **Mitigation**: `scripts/check-npm-audit.mjs` permits only this exact advisory
  while failing closed for every other HIGH/CRITICAL production finding.
  `.trivyignore.yaml` scopes the same advisory to
  `pkg:npm/react-router@7.18.1` and expires on 2026-09-30. Existing route unit,
  build, and Playwright gates remain mandatory.
- **Owner**: repository owner / security reviewer.
- **Removal condition**: upgrade to the first compatible React Router v7 patch
  that fixes `GHSA-qwww-vcr4-c8h2`, or migrate deliberately to a fixed major;
  then remove this document, the audit allowlist entry, and Trivy ignore.
