# Product feature backlog and acceptance criteria (Phase 03)

Personas: **Owner** (creates reusable buckets, orders for the household/team), **Member** (invited; contributes quantities), **Solo user** (private buckets only). Non-goals: restaurant marketplace, payments, delivery tracking, push notifications (v1.x backlog).

## A. Private core (existing at 52a984e — re-verified, kept)
| ID | Feature | Acceptance criteria (testable) |
|---|---|---|
| FEAT-001..003 | Auth + reset | register/login/logout/reset happy+error paths in both storage modes; session survives reload |
| FEAT-005 | Profile | full name, language, theme, currency editable; persisted; applied instantly |
| FEAT-009..017 | Buckets + items | CRUD, 1–50 named items, price ≥ 0, active flag, stable ids, 2-dp rounding |
| FEAT-018..020 | Search/filter/sort | bucket text search; order status filter + text search; newest-first sort |
| FEAT-021..029 | Orders | compose with qty 1..99; draft/place; transitions draft→placed→completed/cancelled (terminal); snapshots immutable when bucket later changes; repeat creates draft |
| FEAT-030 | Dashboard | counts (buckets, shared, active items, orders, open) + 5 recent orders |
| FEAT-031..035 | Offline/PWA | sw shell; Firestore persistent cache reads offline; clear online/offline pill; failed writes surface errors |
| FEAT-036..040 | Capacitor | preferences, network status, haptics, keyboard config, https scheme |

## B. Runtime configuration (this release — user directive)
| ID | Feature | Acceptance criteria |
|---|---|---|
| FEAT-006 | Runtime language switching | default en (env-seeded); changeable anytime in Settings **and pre-login on auth screen**; persists per device (Preferences) and in profile; ar applies RTL immediately |
| FEAT-007 | Runtime currency switching | default EGP (env-seeded); changeable anytime in Settings; seeds new buckets; persists per device + profile |
| FEAT-008 | Theme | system/light/dark, applied live, persisted both layers |

## C. Collaborative sharing (this release — USR-016/017)
| ID | Feature | Acceptance criteria |
|---|---|---|
| FEAT-041 | Invitations | owner enables sharing, creates role-scoped invite; join code shown exactly once; only SHA-256 hash stored |
| FEAT-042 | Acceptance | valid code previews bucket/owner/role before joining; accept is transactional single-use; joiner lands on collaborate view |
| FEAT-043 | Expiration | 72h expiry enforced at preview+accept |
| FEAT-044 | Revocation | owner revokes pending invites; revoked codes rejected |
| FEAT-045 | Roles | owner/editor/contributor/viewer per permission matrix (view/contribute/editBucket/manageMembers/placeGroupOrder/deleteBucket) |
| FEAT-046 | Ownership transfer | **explicitly out of v1**: owner cannot be removed/leave; deletion is the exit path (documented) |
| FEAT-047/048 | Remove/leave | owner revokes members (contributions retained in totals); members leave; revoked/left lose access via rules |
| FEAT-049..051 | Contributions + aggregation | each member's quantities stored per-user; aggregate = Σ contributions; two users updating the same item concurrently both survive (transaction-serialized) |
| FEAT-052 | Idempotency | replaying a mutation id returns recorded result; never double-applies (unit-proven + adapter-proven) |
| FEAT-053 | Repair | owner recomputes aggregate from contributions; drift banner when materialized ≠ derived |
| FEAT-054 | Activity | append-only timeline (share/invite/join/leave/revoke/role/contribution/order/repair), capped display 50 |
| FEAT-055 | Notifications | in-app toasts + activity feed (push out of scope, documented) |
| FEAT-056 | Conflict/retry UX | pending state while saving; failure keeps value visible with Retry reusing the SAME mutation id |
| FEAT-057 | Shared order finalization | owner/editor places group order snapshotting aggregate + per-member breakdown + bucket revision |
| FEAT-058 | Audit history | activity doubles as audit trail (actor, target, safe metadata, timestamp) |

## D. Additional improvements (USR-018 — selected)
| ID | Feature | Decision |
|---|---|---|
| FEAT-012 | Bucket duplication | SELECTED: duplicate action on bucket card → prefilled editor copy |
| FEAT-059 | Data export | SELECTED: Settings → export my data (buckets+orders JSON download) |
| FEAT-060 | Account deletion | SELECTED: Settings danger zone → deletes owned buckets(+subcollections), orders, memberships, profile, auth user; re-auth error surfaced honestly |
| FEAT-063/064/065/066 | A11y, RTL, error normalization, UX states | SELECTED (labels/roles/reduced-motion; ar RTL complete; safe error strings; loading/empty/error everywhere) |
| FEAT-067 | Support diagnostics | SELECTED: settings shows storage mode, connection, app version |
| FEAT-061 | Favorites/recents | NOT SELECTED — backlog (low value vs. surface area now) |
| FEAT-062 | Ordering presets | NOT SELECTED — backlog (repeat-order covers the core need) |
| FEAT-068 | In-app update | DOCUMENTED ONLY — manual APK update model this release |

Priorities: MVP=A+B; V1=C; V1.0 extras=D-selected. All C items block release; D-selected are best-effort but implemented this cycle.
