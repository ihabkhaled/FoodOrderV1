---
id: ADR-0012
title: Scoped server-issued guest identity for invitation conversion
type: adr
authority: canonical
status: accepted
owner: architecture-owner
audience: [engineer, qa, ai-agent, product, security]
lastVerified: 2026-07-18
generated: false
---

# ADR-0012: Scoped server-issued guest identity for invitation conversion

## Context

Requiring registration before an invited participant can understand or contribute to a group order creates the largest activation barrier in the product. A name-only client flag is not an identity and cannot protect contributions or private amounts.

Firebase anonymous authentication is a possible implementation, but it creates a project-wide anonymous account rather than a session-scoped capability and still requires careful account-linking and invitation authorization.

## Decision

Use a server-issued guest capability scoped to one invitation and one order session.

The organizer creates a session invitation through a trusted callable. The callable:

- generates a cryptographically random raw token;
- stores only its SHA-256 hash;
- applies expiry, revocation, usage, and participant-limit policy;
- returns the raw token exactly once for sharing.

Public preview accepts session ID plus raw token and returns only a minimal safe projection:

- session title;
- organizer display name;
- deadline;
- currency;
- active item count;
- collection/open state.

Guest join accepts the invitation token and a bounded display name. The server creates:

- an opaque guest identity ID;
- a cryptographically random guest secret returned once;
- only the secret hash at rest;
- a session participant with `identityKind: guest`;
- a scoped expiry/revocation record.

Subsequent guest operations present guest ID plus raw guest secret to trusted callables. The secret is never placed in URLs, analytics, logs, public documents, or user-visible copy.

## Scope

A guest may:

- preview the invited session;
- join once within limits;
- read the safe session projection and their own private state;
- change their own contribution while collection is open;
- mark done or skipped;
- read their own finalized amount and settlement state.

A guest may not:

- list members or other private participant state;
- manage lifecycle, invitations, settlement verification, or plans;
- access another session;
- continue after expiry/revocation;
- self-upgrade role.

## Account linking

After authentication, a trusted callable may link the guest participant to the authenticated account. The operation is idempotent and transfers contribution/settlement ownership without duplication. The guest capability is revoked after successful link.

## Storage

The client stores a guest capability through the platform storage boundary. Local mode simulates the same scope but remains explicitly non-secure, single-device evaluation storage.

## Security controls

- token/secret hashes only at rest;
- constant-scope lookups by session/invite/guest identifiers;
- bounded expiry;
- rate limits and join limits;
- no account-enumeration messages;
- no raw secrets in telemetry/error context;
- exact expected revisions and idempotency IDs for contribution writes;
- callable-only Firestore records;
- account-link audit event.

## Consequences

### Positive

- invitation preview and first contribution do not require full registration;
- capability scope is narrower than a general anonymous account;
- account conversion can happen after value is delivered;
- secret handling is explicit and testable.

### Costs

- guest capability persistence and account linking are new security-sensitive paths;
- operational rate limiting and revocation are required;
- native/web deep-link return behavior must protect the secret fragment or stored capability.

## Rejected alternatives

### Publicly readable session documents

Rejected because sessions contain participants, financial summaries, and private collaboration state.

### Display name stored only in browser state

Rejected because it provides no authorization boundary.

### Invitation token reused as permanent guest credential

Rejected because sharing and participant mutation have different lifetimes and revocation needs.

## Validation

- token/hash and expiry unit tests;
- callable unauthenticated/invalid/expired/revoked/rate/member-limit tests;
- cross-session guest denial;
- account-link idempotency tests;
- local guest contract tests;
- public-preview network inspection;
- complete mobile invitation E2E.
