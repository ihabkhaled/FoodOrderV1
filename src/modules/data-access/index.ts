import { withFirebaseErrorTranslation } from '@/packages/firebase';
import { env } from '@/platform/environment';

import { FirebaseEmailAuthService } from './gateways/firebase-auth-email.gateway';
import { FirestoreCallableGroupOrderService } from './gateways/firestore-callable-group-order.gateway';
import { FirestoreCallableOrderLifecycleService } from './gateways/firestore-callable-order-lifecycle.gateway';
import { FirestoreCallableSocialService } from './gateways/firestore-callable-social.gateway';
import { FirestoreDataService } from './gateways/firestore-data.gateway';
import { FirestoreNotificationService } from './gateways/firestore-notification.gateway';
import { FirestorePaginationService } from './gateways/firestore-pagination.gateway';
import { LocalAuthService } from './gateways/local-auth.gateway';
import { LocalDataService } from './gateways/local-data.gateway';
import { LocalGroupOrderService } from './gateways/local-group-order.gateway';
import { LocalNotificationService } from './gateways/local-notification.gateway';
import { LocalOrderLifecycleService } from './gateways/local-order-lifecycle.gateway';
import { LocalPaginationService } from './gateways/local-pagination.gateway';
import { LocalSocialManagementService } from './gateways/local-social-management.gateway';

export * from './contracts';
export { LocalAuthService } from './gateways/local-auth.gateway';
export { LocalDataService } from './gateways/local-data.gateway';
export { LocalGroupOrderService } from './gateways/local-group-order.gateway';
export {
  LocalNotificationService,
  pushLocalNotification,
} from './gateways/local-notification.gateway';
export { LocalPaginationService } from './gateways/local-pagination.gateway';
export { LocalSharingService } from './gateways/local-sharing.gateway';
export { LocalSocialManagementService } from './gateways/local-social-management.gateway';
export * from './helpers';
export { useCursorPage } from './hooks/use-cursor-page.hook';
export * from './types';

export const authService = env.firebaseEnabled
  ? withFirebaseErrorTranslation(new FirebaseEmailAuthService())
  : new LocalAuthService();
export const dataService = env.firebaseEnabled
  ? withFirebaseErrorTranslation(new FirestoreDataService())
  : new LocalDataService();
export const sharingService = env.firebaseEnabled
  ? withFirebaseErrorTranslation(new FirestoreCallableGroupOrderService())
  : new LocalGroupOrderService();
export const orderLifecycleService = env.firebaseEnabled
  ? withFirebaseErrorTranslation(new FirestoreCallableOrderLifecycleService())
  : new LocalOrderLifecycleService();
export const paginationService = env.firebaseEnabled
  ? withFirebaseErrorTranslation(new FirestorePaginationService())
  : new LocalPaginationService(dataService, sharingService);
export const socialService = env.firebaseEnabled
  ? withFirebaseErrorTranslation(new FirestoreCallableSocialService())
  : new LocalSocialManagementService();
export const notificationService = env.firebaseEnabled
  ? new FirestoreNotificationService()
  : new LocalNotificationService();
export const storageMode = env.firebaseEnabled ? 'firebase' : 'local-device';
