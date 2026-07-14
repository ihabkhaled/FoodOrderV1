import { sendPasswordResetEmail } from 'firebase/auth';

import {
  FirebaseAuthService,
  getFirebaseRuntime,
} from '@/services/firebaseServices';

const activeEmailLanguage = (): 'ar' | 'en' =>
  document.documentElement.lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';

export class FirebaseEmailAuthService extends FirebaseAuthService {
  override async resetPassword(email: string): Promise<void> {
    const auth = getFirebaseRuntime().auth;
    auth.languageCode = activeEmailLanguage();
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  }
}
