# Delivery plan, test matrix, and release strategy (Phase 05)

## Implementation sequence (Phases 06–16)
| Phase | Scope | Key files | Gate |
|---|---|---|---|
| 06 | Dependency truth (TS 7.0.2 verification), env owner cleanup, `.env.example` finalization, lockfile | package.json, .env.example, src/config/env.ts | npm view evidence + typecheck |
| 07 | firestore.rules + indexes rewrite (sharing model §4), migration script → schema v2 | firestore.rules, firestore.indexes.json, scripts/migrate-legacy-data.mjs | static rules review vs matrix; dry-run |
| 08 | Core product completion: Dashboard shared stat, Orders/OrderDetails i18n + participants, AuthLayout guest language toggle, bucket duplication | src/pages/*, src/components/* | typecheck + tests |
| 09 | Sharing integration verification (adapters ↔ engine ↔ UI), conflict UX pass | src/lib/sharing.ts, services, pages | sharing unit+integration tests |
| 10 | Styles for new UI, a11y (labels/roles/reduced-motion), data export, account deletion, diagnostics | src/styles.css, SettingsPage, platform.ts | lint + manual RTL/dark sweep |
| 11 | npm audit, trivy fs (vuln/secret/misconfig), history scan, hardening notes incl. legacy key finding | audit/security-review.md | scans exit 0 or reviewed |
| 12 | Test suites: sharing engine (set/increment/replay/bounds/drift), local sharing integration (invite→join→contribute→concurrent→order→revoke), e2e locale-mode | tests/** | `npm run validate` green |
| 13 | `cap add android` + `cap add ios` (committed), icons/splash via @capacitor/assets, manifest/permissions review, local `gradlew assembleDebug`, checksum | android/, ios/, resources/ | APK + SHA-256 |
| 14 | Canonical doc updates (domain/contracts/product/architecture), knowledge incremental rebuild + validate + benchmark | domain/, contracts/, .ai/ | knowledge:validate |
| 15 | CI: android workflow extended (main push + tags → release upload); keep quality workflow | .github/workflows/* | workflow lint (actionlint-style review) |
| 16 | Final validate, commit series, push main, tag v1.0.0, gh release with APK+sha256, final report | — | all gates + release URL |

## Test matrix
| Layer | Tool | Suites | Blocking |
|---|---|---|---|
| Domain unit | Vitest | bucket, order, sharing (mutation engine: set/increment/replay/bounds/aggregate/drift/tokens/join-codes/roles/invite-expiry) | ✅ |
| Service integration | Vitest+jsdom | localServices CRUD; sharingLocal end-to-end multi-user incl. simultaneous update interleaving + duplicate replay + revoked-member denial | ✅ |
| Component | Vitest+testing-library | smoke via pages under e2e (component layer covered indirectly; targeted additions as regressions appear) | ⚠ best-effort |
| E2E | Playwright (chromium+mobile) | register→bucket→order happy path in forced local mode | ✅ |
| Rules | static matrix review (emulator unavailable locally — RISK-002) | rules ↔ permission matrix cross-check documented | ⚠ documented gap |
| Security | npm audit, trivy fs | vuln+secret+misconfig | ✅ (reviewed exceptions allowed) |
| Native | local Gradle assembleDebug + CI workflow | APK builds, installs (manual smoke doc) | ✅ build; manual install best-effort |

## Release strategy
- Versioning: `v1.0.0` tag on main; android versionCode 1 / versionName 1.0.0.
- Artifact: `FoodOrderV1-v1.0.0-debug.apk` + `.sha256`, built locally from the tagged commit AND reproducible via `android-apk.yml` (workflow_dispatch/push) — debug-signed (documented limitation; release signing runbook in this file, keystore never committed).
- GitHub Release: notes generated from verified changes; APK + checksum attached; known limitations section mandatory.
- Rollback: tag `backup/pre-phased-v2`; previous commit deployable; Firestore schema additive (legacy paths preserved read-only); RTDB untouched.
- Release signing (future): create upload keystore locally, store in GitHub secrets (KEYSTORE_B64, KEYSTORE_PASS, KEY_ALIAS, KEY_PASS), add signed `assembleRelease` lane; never in repo.

## Documentation inventory (owners to update in Phase 14)
domain/entities.md (+sharing entities), domain/invariants.md (+concurrency/idempotency), domain/state-machines.md (+invite/member), contracts/catalog.yaml (+SharingService), contracts/routes.md (+/join, collaborate, share), product/feature-catalog.yaml (+FEAT C/D), architecture/{target-state,security-architecture,data-flow}.md pointers → sharing-design.md, operations/release-plan → this file, README.md (android/ios/apk instructions), .ai rebuild.
