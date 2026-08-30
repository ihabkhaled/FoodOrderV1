# 25 — Shareable links and deep linking

## Rule

Any URL the product asks a person to send to another person — an invite link, a share
link, a deep link into a resource — MUST:

1. **Carry the locale segment the app is mounted under.** Build it with
   `getApplicationBaseUrl()` (`src/platform/browser`), never from `location.origin`
   alone and never from a compiled-in constant.
2. **Resolve behind authentication with the destination preserved.** Protected routes
   redirect through `buildAuthPathWithReturnTo`, and the destination must survive both
   login and registration.
3. **Be redeemed by a callable, never by a client write.** Security Rules deny clients
   every write to the link collection, and allow a read only to the link's creator.
4. **Carry the whole secret in an unguessable token** of at least 128 bits, used as the
   document id — never a resource id plus a guessable suffix.
5. **Expire, be revocable, and redeem idempotently.** A link pasted into a group chat is
   opened many times; the second redemption reports the access the person already has
   and MUST NOT read as an error.
6. **Be covered by a rules test** asserting it is unreadable by a non-creator and
   unwritable by every client.
7. **Appear in the `vercel.json` rewrite and header lists** for its path segment, so a
   cold visit reaches the application shell with `noindex` applied.

## Motivation

The web build gives its router a `/{locale}` basename. A link built from the bare origin
lands outside the router and silently fails to reach the route it names — this was found
only by opening a generated link in a browser, and no unit test would have caught it.

The token is the only credential a redeemer presents. If a client could read the link
collection it could enumerate every live invitation; if it could write, it could mint
itself access to any bucket or group. Redemption therefore runs with admin rights inside
a callable that verifies ownership and expiry, and the rules deny the rest.

## Enforcement

`tests/domain/invite-links.test.ts` covers token shape, expiry, revocation, and the
locale segment. `tests/firebase/invite-links.rules.test.ts` covers the rules boundary and
runs in the CI Firebase Emulator job (no JDK locally — see EXC-5).

## Prohibited

- Building a shareable URL from `location.origin` or `getCurrentOrigin()`.
- A client-side write path to a link collection.
- A single-use-only shareable link where the product promises group sharing.
- Treating "already joined" as a failure.

## Related

[13-security.md](13-security.md), [10-routing.md](10-routing.md),
[../skills/add-invite-link-kind.md](../skills/add-invite-link-kind.md),
[../docs/operations/invite-links.md](../docs/operations/invite-links.md).
