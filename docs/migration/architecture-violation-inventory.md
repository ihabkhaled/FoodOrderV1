# Architecture Violation Inventory (pre-migration baseline)

Findings measured on the v1.6.0 branch before restructuring (83 TS/TSX files,
~13,000 lines under `src/`). This is the migration backlog; each item is
resolved by moving code into its owning layer, never by weakening a rule.

## 1. Built-in React hooks outside hook files — 196 occurrences in 22 files

Pages (all violate hook isolation): BucketCollaboratePage (17),
SocialPage (16), BucketSharePage (15), BucketEditorPage (13),
CreateOrderPage (10), BucketSocialSharePage (8), BucketsPage (6),
RegisterPage (6), OrderDetailsPage (5), LoginPage (5), JoinBucketPage (5),
ForgotPasswordPage (5), DashboardPage (5), OrdersPage (4), SettingsPage (4).

Components: RefreshableViewport (9), BucketSocialSharePanel (8),
AppLayout (5), NotificationCenter (4), ConfirmDialog (3), CustomItemPanel (3),
GroupReceiptSection (2).

Compliant locations already existing: `src/hooks/useCursorPage.ts`,
`src/hooks/useBucketMutations.ts`, and the two context providers
(`src/state/AppContext.tsx`, `src/state/RefreshContext.tsx` — providers must
still delegate their built-in hook usage to extracted hooks).

The remaining 18 page/component files are already hook-free (presentational
or `useApp`-only).

## 2. Raw third-party imports

- `react-router-dom`: 23 files (App, main, AppLayout, AuthLayout,
  BucketCollaborateContent, OrderRow, BucketCards, NotificationCenter, and 15
  pages). Owner to create: `src/packages/router`.
- `lucide-react`: 32 files (20 components, 12 pages). Owner to create:
  `src/packages/icons`.
- `firebase/*`: 8 service files (firebaseServices, firebaseAuthEmailService,
  paginationServices, groupOrderServices, firestoreGroupOrderFunctions,
  socialServices, orderLifecycleServices, notificationServices). Owner to
  create: `src/packages/firebase`.
- `@capacitor/{core,haptics,network,preferences,status-bar}`: only
  `src/services/platform.ts`. Owners to create: `src/packages/capacitor-*`.
- `react-virtuoso`: already correctly isolated behind `src/packages/virtuoso`.

## 3. Browser globals outside a platform layer

- `src/state/AppContext.tsx` — `matchMedia`, `document` (theme/lang/dir),
  `navigator.onLine`, `window` listeners/timers.
- `src/services/localServices.ts`, `localSocialService.ts`,
  `localSocialManagementService.ts`, `orderLifecycleServices.ts`,
  `groupOrderServices.ts`, `notificationServices.ts` — `localStorage`
  persistence and `window` event dispatch/listen.
- `src/services/platform.ts` — `navigator` (serviceWorker/clipboard/share),
  `document.createElement` (this file becomes the platform layer).
- `src/services/firebaseAuthEmailService.ts` — `document.documentElement.lang`.
- `src/components/NotificationCenter.tsx` — `document` pointerdown listeners.
- `src/components/RefreshableViewport.tsx` — `document.scrollingElement`,
  `window.scrollY`.
- `src/pages/BucketCollaboratePage.tsx` — `window.setTimeout/clearTimeout`.
- `src/main.tsx` — `document.getElementById` (stays: bootstrap file).

## 4. Environment access outside one owner

- `src/config/env.ts` is the intended single gateway (becomes
  `src/platform/environment`).
- Violation: `import.meta.env.PROD` read directly in `src/services/platform.ts`.

## 5. Inline route-path literals — ~16 files

AppLayout (4), BucketsPage (3), BucketEditorPage (3), DashboardPage (3), and
1 each in BucketCollaboratePage, BucketSocialSharePage, OrdersPage,
JoinBucketPage, OrderDetailsPage, CreateOrderPage, ForgotPasswordPage,
NotFoundPage, BucketCollaborateContent, LoginPage, RegisterPage — plus the
central route table in App.tsx. No route-constants module exists.

## 6. Oversized / multi-responsibility files

| File | Lines | Issue |
| --- | --- | --- |
| src/services/firebaseServices.ts | 827 | 2 gateway classes + helpers in one file |
| src/services/localServices.ts | 791 | 2 gateway classes + storage engine |
| src/services/groupOrderServices.ts | 724 | local group-order gateway + shared logic |
| src/pages/SocialPage.tsx | 674 | screen + business logic + hooks |
| src/services/localSocialService.ts | 482 | gateway + storage helpers |
| src/lib/firebaseError.ts | 481 | vendor error mapping + locale state |
| src/services/localSocialManagementService.ts | 459 | gateway |
| src/pages/BucketSharePage.tsx | 431 | screen + orchestration |
| src/pages/BucketEditorPage.tsx | 309 | screen + form logic |

Dual-implementation files that must split one-gateway-per-file:
notificationServices, orderLifecycleServices, paginationServices,
socialServices, localServices. `src/components/BucketCards.tsx` exports two
components.

## 7. Internationalization

Mechanism: three flat `en`/`ar` catalogs (`messages.ts`, `socialMessages.ts`,
`groupOrderMessages.ts`) with `translate*(locale, key)` lookups; 227 message
lookups across 24 files; RTL handled centrally. Hardcoded user-visible copy
exists in exactly two files (violations):

- `src/components/ErrorState.tsx` — literal `Try again` (key exists).
- `src/pages/NotFoundPage.tsx` — `404`, `Page not found`, `The requested page
  does not exist.`, `Return home` (keys missing from catalogs).

## 8. Other findings

- `console.*` in src: none. TypeScript `enum`: none. Both stay banned
  mechanically.
- `src/lib/groupOrder.ts` reaches outside `src/` into
  `packages/group-order-engine/src` via a relative escape.
- No service locator/DI: pages import service singletons from `@/services`
  directly; only auth/profile state flows through context.
- `crypto` usage in `lib/sharing.ts`, `lib/id.ts`,
  `services/notificationServices.ts` (runtime-neutral Web Crypto — allowed).

## 9. Test posture (pre-migration)

79 unit/integration tests in 16 files (+4 Firestore rules suites, 7 Playwright
specs). Well-covered: `src/lib/*` domain helpers, local service adapters,
group-order components, Firestore rules, all critical e2e journeys.
Untested: all pages (e2e-only), 21 of 25 components, both contexts,
both hooks, env/platform seams, and every Firestore/cloud gateway variant
(cloud behavior is covered by rules tests + deployed-callable smoke tests in
CI instead).
