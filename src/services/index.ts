import { env } from '@/config/env';
import { withFirebaseErrorTranslation } from '@/lib/firebaseError';
import { FirebaseEmailAuthService } from '@/services/firebaseAuthEmailService';
import { FirestoreDataService } from '@/services/firebaseServices';
import { FirestoreCallableGroupOrderService } from '@/services/firestoreGroupOrderFunctions';
import { LocalGroupOrderService } from '@/services/groupOrderServices';
import {
  LocalAuthService,
  LocalDataService,
} from '@/services/localServices';

export const authService = env.firebaseEnabled
  ? withFirebaseErrorTranslation(new FirebaseEmailAuthService())
  : new LocalAuthService();
export const dataService = env.firebaseEnabled
  ? withFirebaseErrorTranslation(new FirestoreDataService())
  : new LocalDataService();
export const sharingService = env.firebaseEnabled
  ? withFirebaseErrorTranslation(new FirestoreCallableGroupOrderService())
  : new LocalGroupOrderService();
export const storageMode = env.firebaseEnabled ? 'firebase' : 'local-device';
