# Phase 02 — Legacy FoodOrder behavior map

Source: `ihabkhaled/FoodOrder@main` (React Native 0.74.1, firebase JS SDK ^10.12.1). Audited 2026-07-13 from shallow clone.

## Screens and navigation
| Legacy screen | File | Behavior (verified) | FoodOrderV1 equivalent |
|---|---|---|---|
| Auth (login) | `src/screens/Auth/AuthScreen.tsx` | Firebase email/password sign-in, RN persistence via AsyncStorage | `/auth/login` |
| Sign up | `src/screens/Auth/SignUpScreen.tsx` | createUserWithEmailAndPassword | `/auth/register` |
| Home | `src/screens/HomeScreen.tsx` | entry hub, drawer/bottom tabs | `/` dashboard |
| Create bucket | `src/screens/CreateBucketScreen.tsx` | title + free-text item strings (`inputValues`), writes RTDB | `/buckets/new` (structured items) |
| My buckets | `src/screens/MyBucketsScreen.tsx` | paginated RTDB list (PAGE_SIZE 10, orderByKey/startAt) | `/buckets` |
| Show bucket | `src/screens/ShowBucket.tsx` | renders bucket items | `/buckets/:id/order` + `/buckets/:id/collaborate` |
| My orders | `src/screens/MyOrdersScreen.tsx` | **reads buckets, not orders** — no order entity ever persisted | `/orders` (real persisted orders) |

## Firebase usage (verified paths)
- Realtime Database path: `usersData/{uid}/buckets/` — one node per bucket keyed by uuid.
- Bucket shape: `{ uuid: string; title: string; inputValues: string[] }` (`src/types/buckets.interface.ts`).
- Modules: `src/modules/Firebase/{init,ReadValueinDB,SetValueInDB,refreshAuth}.ts` — RTDB `get/set`, Firestore initialized but effectively unused for product data.
- Auth: `initializeAuth` + `getReactNativePersistence(AsyncStorage)`.

## Security findings (legacy repo)
- **`.env` is committed publicly** in the legacy repo containing `API_KEY=AIzaSyCbvB…`, `DATABASE_URL`, `PROJECT_ID`, `AUTH_DOMAIN` for the same Firebase project `foodorder-c997c`. Firebase web keys are public client identifiers, but the leaked *legacy* key should still be restricted (HTTP referrer / app restrictions) or rotated in Google Cloud Console; RTDB rules for `usersData/**` must be verified/locked since the legacy app depended on them. Recorded as SEC-LEG-001 in `audit/security-review.md`. (Console action — cannot be executed from this environment.)

## Migration implications (drives `scripts/migrate-legacy-data.mjs`)
- Legacy export shape: `{ usersData: { [uid]: { buckets: { [uuid]: { title, inputValues[] } } } } }`.
- Item strings map to structured items: name=string, price=0, category='', active=true; empty strings dropped.
- **Do not fabricate order history** — legacy "My Orders" never persisted orders.
- Preserve legacy bucket uuid as the bucket id; owner = export uid.
- Target: schema-v2 top-level `buckets/{bucketId}` + owner member + membership mirror (see `architecture/sharing-design.md`).

## Contradictions with destination
- Legacy items are strings; V1 items are structured entities with stable ids — resolved: migration synthesizes `legacy_{bucketId}_{index}` ids (deterministic, idempotent).
- Legacy uses RTDB; V1 uses Firestore — resolved: one-time export/import migration, RTDB left read-only for rollback.
