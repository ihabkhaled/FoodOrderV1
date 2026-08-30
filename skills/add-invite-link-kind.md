# Skill: add an invite link kind

## Required reading

[../rules/25-shareable-links-and-deep-linking.md](../rules/25-shareable-links-and-deep-linking.md),
[../rules/13-security.md](../rules/13-security.md),
[../docs/operations/invite-links.md](../docs/operations/invite-links.md).

## Preconditions

The thing being granted already has a server-side write path that establishes access
(a membership document, a grant, a friendship). An invite link only *triggers* that
path; it never invents a new one.

## Steps

1. **Domain.** Add the kind to `InviteLinkKind` in
   `functions/src/inviteLinkDomain.ts` and `src/modules/data-access/types/invite-link.types.ts`,
   and give it an expiry in `INVITE_LINK_EXPIRY_HOURS` on **both** sides. The two tables
   must agree; a test asserts the values.
2. **Creation guard.** In `functions/src/inviteLinks.ts`, extend
   `createInviteLinkV1100` with the ownership check for the new resource. Ownership is
   proven at creation because the token is the only credential presented later.
3. **Redemption.** Add a `redeem<Kind>` function that performs the grant and returns
   `{ kind, ..., alreadyGranted }`. It MUST be idempotent: an existing grant returns
   `alreadyGranted: true`, not an error.
4. **Local gateway.** Mirror the shape in
   `src/modules/data-access/gateways/local-invite-link.gateway.ts` so the flow stays
   exercisable without Firebase (the end-to-end suite runs in local mode).
5. **Copy.** Add heading, action, description, and toast keys to **all 13** locale files
   under `src/shared/i18n/locales/`. `npm run i18n:check` fails on a gap.
   The description must say plainly what opening the link does and for how long.
6. **Entry point.** Add a container under `src/modules/invite-links/containers/` that
   calls `useInviteLinkSharing`. Read `locale` from `useApp()`; do not thread it as a
   prop. If the host is a hook-free component, pass a render prop.
7. **Redemption UI.** Extend `invite-link-preview.component.tsx` heading/action maps.
8. **Tests.** Extend `functions/test/invite-link-domain.test.mjs` and
   `tests/domain/invite-links.test.ts`. Add a rules case if a new collection is touched.
9. **Routing.** `/join/:token` already serves every kind — no new route. Confirm the
   destination in `destinationFor` inside `use-invite-link-redemption.hook.ts`.
10. **Validate.** `npm run lint`, `npm run typecheck`, `npm run test:ai`,
    `npm run i18n:check`, then `npm run knowledge:build:incremental` **last**.

## Verification

Run the app in local mode (`VITE_FORCE_LOCAL_MODE=true`), create a link from the new
entry point, and confirm the generated URL contains the locale segment
(`/en/join/…`, not `/join/…`). Open it and redeem it. A unit test will not catch a
missing basename — only opening the link will.

## Prohibited

- A new route per kind. One redemption route serves all of them.
- Client-side writes to `inviteLinks`.
- Shipping a kind in English only.
