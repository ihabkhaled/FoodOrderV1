import { env } from '@/config/env';
import {
  FirebaseAuthService,
  FirestoreDataService,
  FirestoreSharingService,
} from '@/services/firebaseServices';
import {
  LocalAuthService,
  LocalDataService,
  LocalSharingService,
} from '@/services/localServices';

export const authService = env.firebaseEnabled ? new FirebaseAuthService() : new LocalAuthService();
export const dataService = env.firebaseEnabled ? new FirestoreDataService() : new LocalDataService();
export const sharingService = env.firebaseEnabled
  ? new FirestoreSharingService()
  : new LocalSharingService();
export const storageMode = env.firebaseEnabled ? 'firebase' : 'local-device';
