# Phase 02 — FoodOrderV1 current-state audit

Base commit: `52a984e` (main). Worktree additionally carries audited WIP from this session (see `audit/phase-00-workspace.md`). Audited 2026-07-13.

## What exists and works at `52a984e` (verified by reading source)
- Capacitor 8 + Vite 7 + React 19 + TS 6.0.2 app, strict tsconfig, ESLint 9 flat config (`--max-warnings 0`).
- Dual persistence adapters behind contracts (`src/services/contracts.ts`): Firebase (Auth + Firestore w/ persistent cache) and fully functional local-device mode; selected once in `src/services/index.ts` by validated env (`src/config/env.ts`).
- Private product: auth (login/register/reset), profile (locale/theme/currency), bucket CRUD (≤50 structured items), order lifecycle (draft→placed→completed/cancelled, immutable line snapshots, 2-dp rounding), history, repeat, dashboard, search/filter, settings, en+ar RTL, light/dark/system theme, online/offline indicator, sw.js PWA shell.
- Tests: domain (bucket, order), local services, Playwright smoke. CI: knowledge+format+lint+typecheck+coverage+build. Android APK workflow (PR #9) generates android/ on the runner (not committed).
- Knowledge OS: `.ai/` generated plane + `scripts/knowledge/cli.mjs` (build/validate/context/benchmark), canonical dirs (`architecture/ product/ domain/ contracts/ operations/ privacy/ incidents/ agents/ knowledge/ memory/ context/`).

## Verified gaps at `52a984e` (vs USR/FEAT requirements)
1. **No collaborative sharing** (USR-016/017, FEAT-041..058): no members, invites, roles, contributions, aggregation, idempotency, activity, conflict UX.
2. **Locale/currency were build-time env values** (FEAT-006/007 require runtime switching; user directive: dynamic in code).
3. **No committed android/ or ios/ platforms** (USR-009; user directive: folders must exist and work).
4. Buckets stored per-user (`users/{uid}/buckets`) — cannot be shared across users; `userId` ownership field.
5. `dataService`/`authService` signatures take bare ids; profile seeding hardcoded env defaults.
6. Some raw user-facing strings in pages (search placeholders, toasts) violating NR-012.
7. Legacy RTDB migration script targets old per-user layout.
8. No release/tag; APK never published (0 releases).
9. Icons/splash: Capacitor defaults only.
10. FEAT-012 bucket duplication, FEAT-059 data export, FEAT-060 account deletion absent.

## Session WIP adopted as candidate implementation (audited file-by-file)
- `src/lib/sharing.ts` (new): role matrix, 144-bit invite tokens + SHA-256 hashing, join codes, expiry, pure idempotent contribution engine (`applyContributionMutation`: set/increment, bounds, delta, revision, replay-safe), aggregate compute/drift/repair, group-order builders. **Concurrency contract implementation.**
- `src/types/domain.ts`: schema-v2 Bucket (ownerId/ownerName/visibility/status/schemaVersion/revision/aggregate), BucketMember/Invite/Contribution/MutationRecord/ActivityEvent/MembershipRef, Order participants+sourceBucketRevision, ProfileDefaults.
- `src/services/contracts.ts`: + `SharingService` (17 ops) and user-scoped DataService signatures.
- `src/services/localServices.ts`: sharing tables (members/invites/contributions/mutations/activity), schema migration on read, full SharingService.
- `src/services/firebaseServices.ts`: top-level `buckets/{id}` layout + members/invites/contributions/mutations/activity subcollections + `users/{uid}/bucketMemberships` mirrors; **transactional** contribution writes with idempotency records; transactional invite acceptance; lazy legacy migration; group orders w/ participant snapshots.
- `src/state/deviceConfig.ts` (new): runtime locale/currency/theme via Capacitor Preferences, env-seeded defaults, user-changeable anytime.
- `src/state/AppContext.tsx`: device-config boot, profile defaults, `setDeviceLocale` (guest language switch), currency exposure.
- Pages: BucketCollaboratePage (debounced optimistic contributions, retry-same-mutation-id conflict UX, drift banner+repair, group order), BucketSharePage (enable sharing, invites lifecycle, member roles/revoke, activity), JoinBucketPage (preview+accept), BucketsPage (owned+shared sections, join entry), i18n cleanup in Dashboard/CreateOrder/Settings/BucketEditor.
- `src/i18n/messages.ts`: ~70 new keys en+ar (sharing, conflict, activity labels, previously-raw strings).
- `src/components/ActivityTimeline.tsx` (new).
- `src/services/platform.ts`: + clipboard/share wrappers.

## WIP completion debts (to close in Phases 07–12)
- firestore.rules/indexes still old model (MUST rewrite before commit).
- DashboardPage stat card for sharedBucketCount partially applied; Orders/OrderDetails i18n + participants display pending; AuthLayout guest language toggle pending; styles for new components pending.
- Typecheck not yet run against strict flags (`noUncheckedIndexedAccess` fixes expected).
- Tests for sharing engine + local sharing integration pending.
- `.env.example` cleanup pending (user edited manually mid-session).
- Migration script still targets legacy layout.
- FEAT-012/059/060 not yet implemented.
