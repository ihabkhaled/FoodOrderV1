import { env } from '@/config/env';
import { FirebaseAuthService, FirestoreDataService } from '@/services/firebaseServices';
import { LocalAuthService, LocalDataService } from '@/services/localServices';

export const authService = env.firebaseEnabled ? new FirebaseAuthService() : new LocalAuthService();
export const dataService = env.firebaseEnabled ? new FirestoreDataService() : new LocalDataService();
export const storageMode = env.firebaseEnabled ? 'firebase' : 'local-device';
