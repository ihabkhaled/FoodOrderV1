# social

Friends, friend groups, group invitations, and social bucket sharing.

## Responsibility

- The `/social` hub and its subpages: `/social/friends` (search and the
  friends list), `/social/requests` (friend, group, and bucket invitations),
  and `/social/groups` (group creation/editing/membership).
- The `/buckets/:bucketId/social-share` screen: owner-only sharing of a bucket
  with friends or groups (role-based access grants).
- The social message catalog (`SocialMessageKey` + `translateSocial`), also
  consumed by the notifications module.

## Public exports (`@/modules/social`)

- `socialRoutes` — route descriptors mounted by the app shell.
- `SOCIAL_PATH`, `buildBucketSocialShareRoute(bucketId)` — absolute navigation
  targets owned by this module.
- `translateSocial`, `SocialMessageKey` — social i18n catalog.

## Structure

- `containers/` — thin screens: one view-model hook call + prepared JSX.
- `hooks/` — `use-social.hook.ts` (full social screen view-model),
  `use-bucket-social-share.hook.ts` (bucket load + toast plumbing).
- `components/` — presentational sections (hero, friend search, incoming
  requests, friends list, groups section, group invitations) plus the
  `bucket-social-share-panel` container/hook/component split.
- `i18n/`, `helpers/`, `routes/`.

## Dependencies

`@/modules/data-access` (socialService, dataService), `@/modules/session`
(useApp), `@/packages/{router,icons}`, `@/shared/{ui,i18n,types}`.

## Testing

Covered end-to-end by `tests/e2e/social-sharing.spec.ts` and
`tests/e2e/social-management.spec.ts` (chromium).
