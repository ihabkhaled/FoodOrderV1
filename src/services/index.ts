import { env } from '@/config/env';
import {
  FirebaseAuthService,
  FirestoreDataService,
} from '@/services/firebaseServices';
import {
  FirestoreGroupOrderService,
  LocalGroupOrderService,
} from '@/services/groupOrderServices';
import {
  LocalAuthService,
  LocalDataService,
} from '@/services/localServices';

export const authService = env.firebaseEnabled ? new FirebaseAuthService() : new LocalAuthService();
export const dataService = env.firebaseEnabled ? new FirestoreDataService() : new LocalDataService();
export const sharingService = env.firebaseEnabled
  ? new FirestoreGroupOrderService()
  : new LocalGroupOrderService();
export const storageMode = env.firebaseEnabled ? 'firebase' : 'local-device';
