---
id: KNOW-BOOTSTRAP-SOURCE
title: Bootstrap Source
type: guide
authority: canonical
status: active
owner: knowledge-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Bootstrap Source for FoodOrderV1.
scope:
  - repository
lastVerified: 2026-07-13
verificationMethod: source and test inspection
contextTier: 0
generated: false
---

# FoodOrderV1 AI bootstrap

**Purpose.** FoodOrderV1 is a mobile-first React/TypeScript application wrapped by Capacitor. Users create reusable food buckets, select item quantities, save drafts or place orders, track status, repeat orders, manage runtime preferences (language/currency/theme, changeable anytime), and collaborate: share buckets by role-scoped join codes, contribute per-member quantities with concurrency-safe aggregation, follow an activity timeline, and place group orders that snapshot every participant.

**Universal invariants.** A bucket (schema v2) has one owner, a non-empty title, 1–50 named items, non-negative prices, stable item IDs, a monotonic revision, and a repairable materialized aggregate derived from per-member contribution documents. An order belongs to one user, references its source bucket (and revision for group orders), contains at least one positive-quantity line, stores immutable line/participant snapshots, and calculates totals with two-decimal rounding. Allowed status transitions are draft→placed/cancelled and placed→completed/cancelled; completed and cancelled are terminal. Contribution mutations carry unique mutation ids; replays return the recorded result and never double-apply. Invite tokens store only SHA-256 hashes, expire in 72h, and are single-use.

**Security and privacy.** Never trust client ownership fields without Firestore rules. Personal documents live below `users/{uid}` (owner-only); shared buckets live at `buckets/{bucketId}` with member-based rules mirroring the role matrix in `src/lib/sharing.ts` (owner/editor/contributor/viewer). Never commit Firebase credentials, service-account keys, user exports, passwords, or production order data. Local-device mode is evaluation/development only and data remains on that device.

**Architecture.** Keep business behavior pure in `src/lib` (bucket, order, sharing engine), contracts in `src/types` and `src/services/contracts.ts`, persistence/auth behind adapters in `src/services` (Firestore transactions own contribution writes), session/runtime preferences in `src/state` (`deviceConfig.ts` owns device-level locale/currency/theme), and routes in `src/pages`. UI must not call Firebase directly. Native/browser platform APIs go through `src/services/platform.ts`. The `android/` and `ios/` projects are committed; refresh them with `npx cap sync` after web builds.

**Authority.** Security/privacy policy and active ADRs outrank rules; rules outrank contracts; contracts outrank module guides; source and tests verify current implementation. `.ai/` is generated and never canonical.

**Quality gates.** For routine changes run knowledge validation, typecheck, targeted tests, and build. Run lint, full tests, E2E, Firestore rules review, native sync, and release checks when the affected risk requires them.

**Fast task mode.** Classify first, resolve context, read exact source/tests in parallel, verify behavior, plan, implement, validate, update the documentation delta, and incrementally rebuild `.ai/`. Expand context only when ownership, contracts, failures, or risk expand.

Run: `npm run knowledge:context -- --task="<exact task>"`. Add `--files="a,b"`, `--symbols="A,B"`, or `--diff="base...head"` when available.

**Open critical facts.** Production Firebase configuration, approved retention/deletion duration, and mobile store signing ownership are not decided. Do not invent them.

## Task execution details

Classify the request before broad reading. A routine UI bug usually stays in the owning page/component plus direct tests. A bucket/order behavior change starts in the pure domain owner and expands to adapters, consumers, contracts, and tests only when the behavior crosses those boundaries. Firebase schema, rules, authentication, personal-data deletion, secrets, destructive migration, and native release/signing work use the critical lane. Dependency, new feature, persistence, and native plugin changes normally use the standard lane.

The resolved context is a routing aid, not proof. Read the exact implementation and tests selected by the resolver, inspect direct dependencies and consumers when behavior changes, and compare with one nearby established pattern when useful. Do not plan from summaries alone. When documentation and source disagree, identify authority, inspect tests and active decisions, record the contradiction, and update or supersede the stale source instead of blending statements.

Plans state the requested outcome, current owner and symbols, verified current behavior, target behavior, affected source/contracts/data/configuration/tests/docs/operations, implementation sequence, compatibility and security/privacy/performance/reliability risks, exact validation, and rollback. Begin routine implementation once ownership and invariants are confirmed; do not delay it for unrelated repository documentation.

After implementation, run targeted tests first and then expand by risk. Domain changes require direct invariant tests. Adapter changes require integration evidence. Route/journey changes require component or E2E evidence. Firestore Rules changes require emulator denial/success cases. Capacitor/plugin changes require web build, `cap sync`, and device smoke tests. Release claims require networked dependency installation, a generated lockfile, green CI, approved environment configuration, and any open production blockers resolved.

Update only the canonical owners affected by durable behavior. Rebuild `.ai` incrementally, validate metadata and links, and report incomplete or unexecuted evidence honestly. Never store task prompts containing sensitive user data, production records, secrets, or exports in committed optimization artifacts.
