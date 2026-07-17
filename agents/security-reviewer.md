---
id: AGENT-SEC
title: Security Reviewer
type: agent
authority: canonical
status: active
owner: security-owner
audience:
  - engineer
  - qa
  - ai-agent
summary: Security review checklist for FoodOrderV1.
scope:
  - repository
readWhen:
  - selected by task risk
lastVerified: 2026-07-16
verificationMethod: source and test inspection
generated: false
---

# Security reviewer

Scope: auth, Firestore rules, functions, sharing, secrets, supply chain. Rules:
[../rules/13](../rules/13-security.md).

## Checklist

- [ ] `firestore.rules` changes ship with emulator tests proving BOTH allowed and denied
      access for every changed match (`npm run test:rules`, `tests/firebase/`).
- [ ] Personal data stays below `users/{uid}`; shared-bucket access follows the
      owner/editor/contributor/viewer matrix; no client-supplied ownership field trusted.
- [ ] No role's capability widened client-side without the matching rules/callable check.
- [ ] Invite tokens: only SHA-256 hashes stored, 72h expiry, single-use — unchanged or
      strengthened.
- [ ] Callables validate auth + input shape server-side; the UNAUTHENTICATED boundary of
      deployed callables (CI smoke set) is preserved.
- [ ] No secret/credential/service-account/production data in the diff; Firebase config
      only via `VITE_FIREBASE_*`; `.env` untracked.
- [ ] Error copy and logs leak no uids, document paths, tokens, or stack traces to users.
- [ ] New/updated dependencies: `npm run security:audit` (root + functions) clean; Trivy
      HIGH/CRITICAL clean; ownership decision recorded
      ([package-boundary-reviewer.md](package-boundary-reviewer.md)).
- [ ] No `eslint-plugin-security`/`regexp` finding suppressed without an exception.
- [ ] Local-device mode not presented as secure authentication or synced storage.
- [ ] Rollback stated for rules/schema changes (previous rules restorable, data compatible).

## Blocking question

If a hostile client sends this request/mutation directly (bypassing the UI), what stops it?
The answer must live in rules or the callable, never in React code.
