# Module Migration Status

Definition of done per module: files live under the module in their
responsibility layers (kebab-case + suffix), hooks isolated in `hooks/`,
components UI-only, route paths owned by `routes/` constants, public API via
`index.ts` only, imports through owned facades, existing tests updated and
green, module README written.

| Target | Sources (legacy) | Status |
| --- | --- | --- |
| `src/packages/firebase` | firebase/* imports + lib/firebaseError.ts | pending |
| `src/packages/router` | react-router-dom imports | pending |
| `src/packages/icons` | lucide-react imports | pending |
| `src/packages/capacitor-{core,haptics,network,preferences,status-bar}` | services/platform.ts imports | pending |
| `src/packages/virtuoso` | (pre-existing) | done |
| `src/platform/environment` | config/env.ts | pending |
| `src/platform/{browser,device,network,storage}` | services/platform.ts, state/deviceConfig.ts, scattered browser globals | pending |
| `src/shared/ui` | Loading, EmptyState, ErrorState, ConfirmDialog, VirtualListFooter, RefreshableViewport + RefreshContext | pending |
| `src/shared/helpers` | lib/{date,money,id,validation,pagination}.ts | pending |
| `src/shared/i18n` | i18n/messages.ts | pending |
| `src/modules/data-access` | services/{contracts,index,firebaseServices,localServices,firebaseAuthEmailService,paginationServices,groupOrderServices,firestoreGroupOrderFunctions,socialServices,localSocialService,localSocialManagementService,orderLifecycleServices,notificationServices}.ts, types/*, lib/{bucket,bucketLifecycle,order,sharing,memberPermissions,groupOrder}.ts | pending |
| `src/modules/session` | state/AppContext.tsx | pending |
| `src/modules/auth` | LoginPage, RegisterPage, ForgotPasswordPage | pending |
| `src/modules/buckets` | BucketsPage, BucketEditorPage, BucketCards, BucketCollectionSection, BucketFilters, hooks/useBucketMutations, hooks/useCursorPage (shared with orders → shared/hooks candidate) | pending |
| `src/modules/group-orders` | BucketCollaboratePage, BucketSharePage, JoinBucketPage, BucketCollaborateContent, BucketInvitePanel, BucketMemberPermissionsPanel, CollaborativeItemList, ActivityTimeline, CustomItemPanel, BucketPricingPanel, GroupReceiptSection, i18n/groupOrderMessages.ts | pending |
| `src/modules/orders` | OrdersPage, OrderDetailsPage, CreateOrderPage, OrderRow, OrderActionBar, OrderParticipantsSection, StatusBadge | pending |
| `src/modules/social` | SocialPage, BucketSocialSharePage, BucketSocialSharePanel, i18n/socialMessages.ts | pending |
| `src/modules/notifications` | NotificationCenter | pending |
| `src/modules/dashboard` | DashboardPage | pending |
| `src/modules/settings` | SettingsPage | pending |
| `src/app` | main.tsx (stays thin), App.tsx → router, AppLayout/AuthLayout → shell | pending |
| Legacy directory removal | components/, pages/, services/, state/, hooks/, lib/, config/, i18n/, types/ | pending |
