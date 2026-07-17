# Data boundary map

Rules: [../rules/06-services-and-gateways.md](../rules/06-services-and-gateways.md),
[../rules/13-security.md](../rules/13-security.md); design:
[../architecture/adrs/0005-data-access-module.md](../architecture/adrs/0005-data-access-module.md).

## Dual persistence

```text
                        module view-model hooks
                                 │
                    data-access service contracts (interfaces)
                       │                        │
        cloud gateways (Firestore/callables)   local gateways
        via @/packages/firebase                via src/platform/storage
                       │                        │
        Firestore + Functions (europe-west1)   device storage (unencrypted by design)
```

Mode selection happens once at startup (`data-access` storage-mode selection reading
`src/platform/environment`): local when `VITE_FORCE_LOCAL_MODE=true` or `VITE_FIREBASE_*`
is empty. E2E always runs local. Both gateways implement identical contracts — one storage
schema and helper set per pair (EXC-1: they live together in `data-access`).

## Firestore layout and trust

| Data                                                                | Path                                          | Access                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| Personal documents (profile, personal buckets/orders/notifications) | `users/{uid}/...`                             | owner-only by rules                                                     |
| Shared buckets + contributions                                      | `buckets/{bucketId}/...`                      | member-based rules mirroring the owner/editor/contributor/viewer matrix |
| Group-order mutations (finalize, custom items, transitions, repeat) | callables `*V132`/`*V133` (see CI smoke list) | server-side auth + input validation                                     |

Trust boundary is the server: `firestore.rules` + callable checks decide authorization;
client fields are never trusted. Rules changes require emulator allow/deny tests
(`npm run test:rules`, suites in `tests/firebase/`).

## Domain invariants at the boundary (from `.ai/BOOTSTRAP.md`)

- Bucket schema v2: one owner, 1–50 named items, stable item ids, monotonic revision,
  repairable materialized aggregate from per-member contribution documents.
- Orders: immutable line/participant snapshots, two-decimal totals, transitions
  draft→placed/cancelled, placed→completed/cancelled; terminal states final.
- Contribution mutations carry unique mutation ids; replays return the recorded result.
- Invite tokens: SHA-256 hash only, 72h expiry, single-use.

## Local mode honesty

Single-device, no-account evaluation/development mode; data stays on the device,
unencrypted by design (user's own food-bucket data; no PHI/payment/third-party PII).
Never describe it as synced or securely authenticated.

Legacy sources migrating into `data-access`: `src/services/*` (contracts, firebase/local
service pairs, group-order/social/notification/pagination/lifecycle services) and
`src/lib/*` domain helpers (bucket, bucketLifecycle, order, sharing, memberPermissions,
groupOrder).
