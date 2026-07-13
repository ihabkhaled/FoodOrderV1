import { env } from '@/config/env';
import {
  FirebaseAuthService,
  FirestoreDataService,
} from '@/services/firebaseServices';
import { FirestoreCallableGroupOrderService } from '@/services/firestoreGroupOrderFunctions';
import { LocalGroupOrderService } from '@/services/groupOrderServices';
import {
  LocalAuthService,
  LocalDataService,
} from '@/services/localServices';

export const authService = env.firebaseEnabled
  ? new FirebaseAuthService()
  : new LocalAuthService();
export const dataService = env.firebaseEnabled
  ? new FirestoreDataService()
  : new LocalDataService();
export const sharingService = env.firebaseEnabled
  ? new FirestoreCallableGroupOrderService()
  : new LocalGroupOrderService();
export const storageMode = env.firebaseEnabled ? 'firebase' : 'local-device';
