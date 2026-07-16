# 13 — Security

## Rule

Authorization is decided server-side by `firestore.rules` and callable-function checks —
never by client code alone. Secrets never enter the repository. Personal data isolation and
the sharing role matrix are invariants, not features.

## Motivation

The client is untrusted by definition; local-device mode proves the whole UI runs without
any server. Every security property the app has is the one enforced in rules, callables,
and CI scanning.

## Required

- Personal documents live below `users/{uid}` (owner-only). Shared buckets live at
  `buckets/{bucketId}` with member-based rules mirroring the owner/editor/contributor/
  viewer role matrix (legacy `src/lib/sharing.ts`, migrating into `data-access`).
- Invite tokens: SHA-256 hash stored (never the token), 72h expiry, single-use.
- Firebase configuration only via `VITE_FIREBASE_*` env / repo variables; `.env` files stay
  untracked (`.env.example` is the template).
- Firestore rules changes ship with emulator denial AND success cases
  (`npm run test:rules`, suites in `tests/firebase/`).
- Functions callables validate auth and input shape server-side; deployed callables must
  keep returning the UNAUTHENTICATED boundary (CI smoke-tests
  `finalizeGroupOrderV132`, `addCustomBucketItemV132`, `approveCustomBucketItemV132`,
  `repeatGroupOrderV133`, `transitionGroupOrderV133`).
- Supply chain: `npm run security:audit` (root + functions) and Trivy HIGH/CRITICAL stay
  clean; new dependencies need an ownership decision first
  ([08-package-ownership.md](08-package-ownership.md)).

## Forbidden

- Weakening or broadening any `firestore.rules` match without emulator tests and a
  security-reviewer pass ([../agents/security-reviewer.md](../agents/security-reviewer.md)).
- Trusting client-supplied ownership fields; widening a role's capability client-side.
- Committing credentials, service-account keys, tokens, user exports, or production order
  data. Never store sensitive prompts in committed knowledge artifacts.
- Describing local-device mode as secure authentication or synced storage.
- Disabling `eslint-plugin-security` / `eslint-plugin-regexp` findings without an exception.

## Enforcement

- CI: `firestore-rules` emulator job, `npm-audit`, `trivy` (fail-closed on HIGH/CRITICAL),
  deploy-time callable smoke tests.
- ESLint security/regexp plugins; Trivy secret scanning.

## Definition of done

Rules tests prove both allowed and denied access for the changed paths; no new scanner
findings; no secret material in the diff; the security reviewer checklist passes for
auth/rules/privacy-touching changes.
