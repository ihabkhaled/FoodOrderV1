---
id: ops-invite-links
title: Invite links
---

# Invite links

One collection serves three kinds of invitation: a bucket share, a friendship, and a
group join. Introduced in v1.10.0.

## Shape

`inviteLinks/{token}` — the document id **is** the token, so redemption is a single
point read and no resource id can be enumerated from a link.

| Field | Meaning |
|---|---|
| `kind` | `bucket` \| `friend` \| `group` |
| `createdBy`, `createdByName` | who shared it |
| `expiresAt` | bucket 7 days, friend and group 24 hours |
| `revoked` | the creator's kill switch; beats a valid clock |
| `bucketId`, `bucketTitle`, `role` | bucket links only; `owner` is never assignable |
| `groupId`, `groupName` | group links only |

## Callables

`createInviteLinkV1100` proves ownership at creation (the token is the only credential
presented later), caps live links per person per kind, and returns `{token, expiresAt}`.
`previewInviteLinkV1100` says what a link grants before anything is written.
`redeemInviteLinkV1100` performs the grant idempotently. `revokeInviteLinkV1100` and
`listInviteLinksV1100` serve the creator's own links.

## Why redemption is server-side

Security Rules deny clients every write to `inviteLinks` and allow a read only to the
creator. A client that could read the collection could enumerate live invitations; one
that could write could mint itself access to any bucket or group. Redemption therefore
runs with admin rights inside a callable.

## The locale basename

The web build mounts its router under `/{locale}`. Links are built with
`getApplicationBaseUrl()`, which reads that segment from the live URL, so a link shared
from `/ar-latn` comes back to `/ar-latn/join/…`. Building from `location.origin` alone
produces a URL that lands outside the router — a real bug found by opening a generated
link, not by any unit test.

## Signed-out visitors

`ProtectedRouteContainer` redirects through `buildAuthPathWithReturnTo`, so the invite
is resumed after login **or** registration. `resolvePostAuthRedirect` rejects absolute
and protocol-relative values, so the parameter cannot become an open redirect.

## Native deep links

`/join/*` is already covered by the `vercel.json` rewrite and `noindex` header lists.
Android App Links and iOS Universal Links are configured for the same path; iOS cannot
be verified on this toolchain (EXC-5, no macOS).

## Related

[../../rules/25-shareable-links-and-deep-linking.md](../../rules/25-shareable-links-and-deep-linking.md),
[../../skills/add-invite-link-kind.md](../../skills/add-invite-link-kind.md).
