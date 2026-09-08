# firebase

Owned facade for the `firebase` SDK's modular `firebase/app`, `firebase/auth`,
`firebase/firestore`, and `firebase/functions` entry points.

## Responsibility

Isolates the rest of the app from the Firebase client SDK, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md), and
owns the one piece of real adapting logic in this repo's package layer:
turning a raw Firebase error into a localized, user-facing message.

## Public exports (`@/packages/firebase`)

- App: `FirebaseApp` (type), `initializeApp`.
- Auth: `Auth` (type), `confirmPasswordReset`,
  `createUserWithEmailAndPassword`, `deleteUser`, `EmailAuthProvider`,
  `getAuth`, `onAuthStateChanged`, `reauthenticateWithCredential`,
  `signInWithEmailAndPassword`, `signOut`, `updatePassword`,
  `updateProfile`, `verifyPasswordResetCode`.
- Firestore: `collection`, `deleteDoc`, `doc`, `documentId`,
  `DocumentReference` (type), `FieldPath` (type), `Firestore` (type),
  `getDoc`, `getDocs`, `initializeFirestore`, `limit`, `orderBy`,
  `persistentLocalCache`, `persistentMultipleTabManager`, `query`,
  `QueryConstraint` (type), `runTransaction`, `setDoc`, `startAfter`,
  `where`, `writeBatch`.
- Functions: `getFunctions`, `httpsCallable`.
- Error translation (`firebase-error.adapter.ts`):
  - `setFirebaseErrorLocale(locale)` — sets the module-level active locale
    used by `firebaseErrorMessage` when no locale is passed.
  - `firebaseErrorMessage(error, locale?)` — extracts a Firebase error code
    from an unknown error (`.code`, a `(family/code)` pattern in `.message`,
    or a Firestore "permission denied" string) and maps it to a localized
    message via an exact-code lookup or a family-level generic fallback;
    returns `null` when no code is recognized.
  - `userFacingErrorMessage(error, locale, fallback)` — the translated
    message if available, else the raw `Error.message` if non-blank, else
    `fallback`.
  - `withFirebaseErrorTranslation(service)` — wraps an object in a `Proxy`
    that intercepts every method call (sync and async) and rethrows a new
    `Error` with the translated message, preserving the original as `cause`.

## Structure

- `index.ts` — barrel re-exporting the app/auth/firestore/functions adapters
  plus the error adapter.
- `app.adapter.ts`, `auth.adapter.ts`, `firestore.adapter.ts`,
  `functions.adapter.ts` — one file per Firebase SDK surface.
- `firebase-error.adapter.ts` — error-code extraction, locale-aware
  translation, and the `withFirebaseErrorTranslation` wrapper.
- `firebase-error.interfaces.ts` — `FirebaseErrorLike` structural type for
  duck-typing unknown errors.
- `firebase-error.types.ts` — locale/family/message-key type unions.
- `firebase-error-messages.constants.ts` — the code→key map, family→generic
  -key map, and the full per-locale message tables (all thirteen locales).
  Not re-exported from `index.ts`; imported by its full path only where a
  test needs the raw table.

## Dependencies

None from elsewhere in the repo — only intra-package imports between the
`firebase-error.*` files.

## Testing

- `tests/domain/firebaseError.test.ts` — imports `firebaseErrorMessage`,
  `setFirebaseErrorLocale`, `userFacingErrorMessage`,
  `withFirebaseErrorTranslation` directly; asserts translation-key parity
  across every supported locale.
- Not covered by this package (despite matching a broad grep): Firestore
  security-rules tests, Cloud Functions deployment tooling tests, and
  `firebase-admin` server-side mocks are a separate, out-of-registry-scope
  dependency and exercise different code.
