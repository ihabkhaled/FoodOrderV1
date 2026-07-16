# Collaborative sharing — canonical design (Phase 04)

Owner: architecture. Implements USR-016/017, FEAT-041..058. Source of truth for the Firestore sharing model, concurrency contract, authorization, offline behavior, and legacy migration.

## 1. Data model (Firestore, schema v2)

```text
users/{uid}                            profile (unchanged)
users/{uid}/orders/{orderId}           personal + group order snapshots (immutable lines)
users/{uid}/bucketMemberships/{bucketId}   mirror: {bucketId, role, bucketTitle, ownerName, joinedAt}
buckets/{bucketId}                     {id, ownerId, ownerName, title, description, currency,
                                        visibility: private|shared, status: active,
                                        schemaVersion: 2, revision, items[≤50], aggregate{itemId→qty},
                                        createdAt, updatedAt}
buckets/{bucketId}/members/{uid}       {userId, displayName, email, role, status, invitedBy,
                                        joinedAt, updatedAt, inviteId?}
buckets/{bucketId}/invites/{tokenHash} {id=tokenHash, bucketId, bucketTitle, ownerName, role,
                                        status, createdBy, createdAt, expiresAt(72h),
                                        acceptedBy?, acceptedAt?, revokedAt?}
buckets/{bucketId}/contributions/{uid} {bucketId, userId, displayName, quantities{itemId→int},
                                        revision, lastMutationId, updatedAt}
buckets/{bucketId}/mutations/{mutationId}  applied-mutation record (idempotency ledger)
buckets/{bucketId}/activity/{eventId}  append-only {type, actorId, actorName, targetType,
                                        targetId, metadata(safe), createdAt}
```

Design invariants

- Items live embedded in the bucket doc (bounded ≤50) with **stable ids**; contributions/aggregate key by item id, never array index.
- Each member writes **only their own** contribution doc (`doc id == auth.uid`) → cross-user overwrite impossible by construction.
- `aggregate` is a materialized read-model; **source of truth is the contribution set**; repairable at any time.
- Timestamps are client ISO strings (repo-wide convention); ordering authority is `revision`, which only moves inside transactions.
- Bounded fan-out: ≤20 active members, ≤50 items, activity display capped at 50, mutation ledger pruned (local: 500).

## 2. Concurrency + idempotency contract (USR-017, FEAT-051/052)

Single pure engine `applyContributionMutation` (src/lib/sharing.ts) used by every adapter:

- ops: `set` (absolute) and `increment` (delta); integer bounds 0..99 enforced pre-write.
- delta = target − current; new contribution revision; bucket revision +1; mutation record captures {appliedDelta, resultQuantity, resultRevision}.
- **Replay**: if the mutation id already has a record, the recorded result is returned unchanged (no re-apply).

Firestore execution (`FirestoreSharingService.setContribution`) — one `runTransaction`:

1. read `mutations/{mutationId}` → exists ⇒ return recorded result (idempotent retry);
2. read bucket (item active check) + membership (contribute permission) + own contribution;
3. run engine; write contribution, bucket {aggregate, revision}, mutation record, activity event atomically.
   Two concurrent writers serialize on the bucket doc; the loser retries automatically → **both contributions survive** (FEAT-051). UI failure path keeps the target value and retries with the **same mutation id** (FEAT-056) so an offline/duplicated replay cannot double-apply.

Repair (`repairAggregate`, owner-only): re-reads all contribution docs inside a transaction, recomputes Σ, writes corrected aggregate + revision + `aggregate_repaired` activity. Drift detection runs client-side on every collaborate view load.

Local-device adapter implements the same contract against the localStorage database (single-writer, still engine-driven) so tests prove the algorithm independently of Firestore.

## 3. Invitation protocol (FEAT-041..044)

- Token: 18 random bytes (crypto.getRandomValues) hex → join code `bucketId.token`, shown once.
- Stored: only `sha256(token)` as the invite doc id (capability-URL pattern). Preview/accept resolve the doc by recomputing the hash; no queries, no enumeration.
- Accept = transaction: invite pending + unexpired → create member (role from invite, `inviteId` recorded), mark invite accepted (acceptedBy), write membership mirror + `member_joined` activity. Second acceptor fails the pending check (single-use).
- Revocation flips status; rules block accepted/revoked/expired reuse.
- No Cloud Functions: project runs on the no-cost plan. Server authority is provided by Security Rules (below). Deviation from "callable functions for invites" is recorded (RISK-008) — rules validate every field the client could forge.

## 4. Authorization matrix → firestore.rules

| Capability                                 | owner | editor | contributor | viewer |
| ------------------------------------------ | ----- | ------ | ----------- | ------ |
| view bucket/members/contributions/activity | ✅    | ✅     | ✅          | ✅     |
| contribute quantities                      | ✅    | ✅     | ✅          | ❌     |
| edit bucket structure                      | ✅    | ✅     | ❌          | ❌     |
| manage members/invites                     | ✅    | ❌     | ❌          | ❌     |
| place group order                          | ✅    | ✅     | ❌          | ❌     |
| delete bucket                              | ✅    | ❌     | ❌          | ❌     |

Rules enforcement highlights (mirrors src/lib/sharing.ts PERMISSIONS):

- bucket read/list: owner or active member (membership doc lookup); list only via `ownerId == auth.uid` query.
- bucket update by contributors restricted to `{aggregate, revision, updatedAt}` via `diff().affectedKeys().hasOnly(...)`; structural updates require owner/editor and `revision == resource.revision + 1`.
- member create: self-join with valid pending invite (`getAfter` invite status accepted, role match, expiry) or owner bootstrap; role changes owner-only; owner member immutable except by owner.
- contribution write: `uid == doc id`, active member with contribute permission, integer bounds.
- mutation records: create-once (no update/delete) by the acting member.
- invites: owner CRUD; `get` allowed to any signed-in user (capability = knowing the hash); accept transition validated field-by-field.
- activity: member create with `actorId == auth.uid`; no update/delete.
- Legacy `users/{uid}/buckets` kept read/delete-only for lazy migration.

## 5. Offline model

- Reads: Firestore persistent local cache (multi-tab) serves cached buckets/orders offline.
- Contribution writes require connectivity (transactions); UI shows saving state, on failure keeps the target + Retry (same mutation id). No hidden queue → no silent divergence; documented UX choice.
- Local-device mode is fully offline by design.

## 6. Legacy migration (USR-003/014)

1. RTDB export (`usersData/{uid}/buckets/{uuid}` → title + inputValues[]) imported by `scripts/migrate-legacy-data.mjs` (admin SDK, dry-run + idempotent) directly into schema-v2 top-level buckets (+ owner member + mirror). No orders fabricated.
2. Firestore-era per-user buckets (`users/{uid}/buckets`) migrate lazily on first `listBuckets` (batch: copy→member→mirror→delete legacy doc); idempotent, bounded, owner-scoped.
3. Rollback: RTDB stays untouched; backup tag `backup/pre-phased-v2`; migration re-runnable.

## 7. Group orders (FEAT-057)

`placeGroupOrder` (owner/editor): lines = active items × aggregate qty at current prices; order stores `sourceBucketRevision` + `participants[{userId, displayName, quantities}]` under the placer's history; `order_placed` activity announces total to members. Later bucket/contribution changes never mutate placed orders.
