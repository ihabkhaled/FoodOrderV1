# router

Owned facade for `react-router-dom`.

## Responsibility

Isolates the rest of the app from the routing library, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md). The
single most widely-consumed facade in the repo.

## Public exports (`@/packages/router`)

- `BrowserRouter`, `Link`, `Navigate`, `NavLink`, `Outlet`, `Route`, `Routes`
  — routing components.
- `useLocation`, `useNavigate`, `useParams`, `useSearchParams` — routing
  hooks.

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

Used throughout `src/app`, most `src/modules/*`, and `src/shared/ui` — every
screen, route table, and navigation control.

## Testing

`tests/components/BackLink.test.tsx`, `LinkRow.test.tsx`,
`NotificationCenter.test.tsx`, `PublicContent.test.tsx`,
`ResetPasswordRoute.test.tsx`, `SessionInvitePreview.test.tsx` import this
package directly; `tests/domain/invite-links.test.ts` also depends on it.
