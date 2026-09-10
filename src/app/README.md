# app

The composition root. Per [architecture/README.md](../../architecture/README.md)'s
`app → modules → shared/platform → packages` layering, this is the
outermost layer: it contains no business logic of its own, only imports and
arranges every feature module. Mounted once by `src/main.tsx`, which
dynamically imports `AppBootstrap` from here.

## Responsibility

- Wires `AppProvider` (session), `BrowserRouter`, the full route table
  (importing every feature module's route descriptors), the two page shells
  (authenticated app shell vs. signed-out auth shell), the auth/guest route
  guards, the 404 page, and conditionally-mounted Vercel Analytics/Speed
  Insights.
- Owns the fixed 5-item primary navigation (`NAV_ITEMS`: Home, Menus,
  Rounds, Members, Settings) rendered as both the desktop sidebar and the
  mobile bottom bar.
- Owns notification wiring: subscription, OS-tray mirroring (suppressed
  while foregrounded), push-token registration on login/logout, and tap
  -to-open routing.

## Public exports (`@/app`)

- `AppBootstrap` — the root component: global CSS, `BrowserRouter` →
  `AppProvider` → (`AppRoutes` + `VercelInsights`). Accepts optional
  `basename` and `initialLocale` for locale-prefixed routing.
- `AppRoutes` — the composed route tree, also usable standalone (e.g. in
  tests).

## Structure

- `app-bootstrap.component.tsx` (+ `.interfaces.ts`) — the root component;
  imports the app's global stylesheets.
- `providers/vercel-insights.container.tsx` — mounts Analytics/Speed
  Insights, gated by the person's analytics consent level.
- `router/` — `app.routes.tsx` (`AppRoutes`: composes every feature module's
  routes — `session-invites` unauthenticated at the top, `auth` wrapped in
  the guest guard, everything else wrapped in the protected guard),
  `guest-route.container.tsx`, `protected-route.container.tsx`,
  `not-found.container.tsx`, `app-route-paths.constants.ts` (`HOME_PATH`).
- `shell/` — `app-layout.container.tsx` (authenticated shell: sidebar,
  topbar, routed content, bottom nav, toasts, confirm dialogs),
  `auth-layout.container.tsx` (signed-out shell), `app-layout.constants.ts`
  (`NAV_ITEMS`), `hooks/use-app-layout.hook.ts` (sidebar-collapse,
  notifications, push registration, logout flow),
  `components/{bottom-nav,sidebar-nav,toast-viewport}/`,
  `helpers/notification-mirror.helper.ts`.

## Dependencies

Every feature module's route descriptors and path constants (`auth`,
`dashboard`, `buckets`, `order-sessions`, `orders`, `group-orders`,
`invite-links`, `session-invites`, `social`, `settings`, `notifications`,
`public-content`), `@/modules/session` (`AppProvider`, `useApp`),
`@/modules/telemetry` (consent gating), `@/modules/data-access` (types,
`notificationService`), `@/packages/{router,icons,vercel-analytics,
vercel-speed-insights}`, `@/platform/{browser,device}`, `@/shared/{ui,
types}`.

## Testing

`tests/components/VercelInsights.test.tsx`,
`tests/domain/notification-mirror.test.ts` test pieces of this layer
directly. No test imports `AppBootstrap`, `AppRoutes`, the shells, or the
guards directly — every spec under `tests/e2e/*.spec.ts` drives the real app
through this layer via a real browser, so it is exercised end-to-end by the
entire e2e suite even though no spec targets it by name.
