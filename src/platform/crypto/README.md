# crypto

The one place that derives a verifiable, non-reversible credential hash for
the local-device (no-backend) authentication mode.

## Responsibility

Local-device auth stores a PBKDF2-SHA-256 hash, never a plaintext password
(see [rules](../../../rules/) — never reintroduce a plaintext `password`
field in a local user record).

## Public exports (`@/platform/crypto`)

- `createPasswordSalt()` — a random 16-byte hex salt via
  `crypto.getRandomValues`.
- `hashPassword(password, saltHex)` — a 256-bit PBKDF2-SHA-256 hash
  (100,000 iterations) via WebCrypto `crypto.subtle`, returned as hex.

## Structure

- `password-hash.adapter.ts` — the only file: constants, hex encode/decode
  helpers, and the two exported functions.

## Dependencies

None from the repo — uses only the global WebCrypto API.

## Testing

None found directly; exercised indirectly through local-device
authentication flows.
