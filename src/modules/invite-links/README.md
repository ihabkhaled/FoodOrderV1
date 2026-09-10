# invite-links

The UI for FoodOrder's generic shareable-link system: creating a link
(bucket/friend/group), previewing what it grants before redemption, and
redeeming it. Distinct from the bucket join-code system (`data-access`/
`sharing`) and from the order-session guest-invite system
(`session-invites`).

## Responsibility

- Creates and shares a link for a given subject: `BucketInviteLinkContainer`
  (bucket), `FriendInviteLinkContainer` (adds the sharer as a friend on
  redemption), `GroupInviteLinkContainer` (a group).
- The `/join/:token` screen (`InviteLinkContainer`, not exported from the
  barrel): shows what accepting the link grants — subject, sharer, role —
  before any write, then redeems it.
- All token/expiry/validation logic lives in
  [`@/modules/data-access`](../data-access/README.md)'s `inviteLinkService`;
  this module is a thin UI layer over it.

## Public exports (`@/modules/invite-links`)

- `BucketInviteLinkContainer`, `FriendInviteLinkContainer`,
  `GroupInviteLinkContainer` — the three share panels.
- `inviteLinkRoutes` — route descriptors mounting `join/:token`.

`InviteLinkContainer`, the hooks, and the components are not exported from
the barrel — reachable only via the route element or a deep import.

## Structure

- `containers/` — `invite-link.container.tsx` (redemption screen) plus one
  thin wrapper per link kind (bucket/friend/group).
- `hooks/` — `use-invite-link-redemption.hook.ts` (loads a preview by token,
  redeems on accept, navigates to the granted resource),
  `use-invite-link-sharing.hook.ts` (creates a link, hands the URL to the
  native share sheet, falls back to clipboard copy).
- `components/invite-link-panel/` — `InviteLinkPreviewCard`,
  `InviteLinkShareCard`.
- `routes/` — path constant + route descriptors.

## Dependencies

`@/modules/data-access` (`inviteLinkService`, invite-link types),
`@/modules/session` (`useApp`), `@/packages/{router,icons}`,
`@/platform/browser` (`copyToClipboard`, `shareText`), `@/shared/{helpers,
i18n,ui,types}`. Mounted inside the protected route group by
`src/app/router/app.routes.tsx` — the create/share screens require sign-in,
unlike `session-invites`' equivalent route.

## Testing

None found — no colocated test, no test imports this module's exports, and
no e2e spec navigates to `/join/`. The underlying `data-access` token/expiry
logic is covered separately by `tests/domain/invite-links.test.ts` and
`tests/firebase/invite-links.rules.test.ts`, but that exercises `data-access`
directly, not this module's UI.
