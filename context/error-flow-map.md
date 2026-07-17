# Error flow map

Rule: [../rules/12-error-handling.md](../rules/12-error-handling.md); design decision:
[../architecture/adrs/0006-error-normalization.md](../architecture/adrs/0006-error-normalization.md).

## The pipeline

```text
vendor error (Firebase SDK / storage / network)
   │  normalized inside the boundary that owns the vendor
   ▼
src/packages/firebase — error table: code → localized en/ar copy   (EXC-4)
   │  (legacy home: src/lib/firebaseError.ts, tested by tests/domain/firebaseError.test.ts)
   ▼
data-access gateway — translates to contract-level errors (*.errors.ts);
   │  replayed contribution mutations RETURN the recorded result (never re-throw)
   ▼
module view-model hook — catches, exposes { error, retry } state
   ▼
container — branches to shared ErrorState (with retry callback) or session toast
   ▼
user sees localized, actionable copy in the active locale
```

## Per-source normalization points

| Error source                                          | Normalized where                                | User surface                        |
| ----------------------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| Firebase Auth (`auth/*` codes)                        | `src/packages/firebase` error table             | inline form errors (auth screens)   |
| Firestore (`permission-denied`, aborted transactions) | firebase package table → gateway                | ErrorState / toast                  |
| Callables (group-order functions)                     | firebase package table → gateway                | ErrorState / toast                  |
| Local-mode storage failures                           | local gateway                                   | ErrorState / toast                  |
| Network offline                                       | `src/platform/network` → session                | offline indicator; gateways degrade |
| Validation (domain invariants)                        | domain helpers in `data-access` (typed results) | inline field messages               |

## Hard rules along the path

- Raw vendor errors never cross the `data-access` public surface.
- No `console.*` in `src/` — errors become UI state, not logs.
- No empty catch; intentional ignores use `.catch(() => {})` only for genuinely ignorable
  outcomes (e.g. haptics).
- Copy is bilingual at the table, not translated ad hoc at the call site.
- No uid, document path, token, or stack trace in user-facing copy.
- Every ErrorState offers retry; every failed mutation leaves state consistent (replay-safe
  mutation ids).
