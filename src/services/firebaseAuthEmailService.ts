import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import {
  FirebaseAuthService,
  getFirebaseRuntime,
} from '@/services/firebaseServices';
import type {
  ProfileDefaults,
  SessionUser,
} from '@/types/domain';

const activeEmailLanguage = (): 'ar' | 'en' =>
  document.documentElement.lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';

export class FirebaseEmailAuthService extends FirebaseAuthService {
  override async register(
    fullName: string,
    email: string,
    password: string,
    defaults: ProfileDefaults,
  ): Promise<SessionUser> {
    const user = await super.register(fullName, email, password, defaults);
    await setDoc(
      doc(getFirebaseRuntime().firestore, 'publicProfiles', user.id),
      {
        userId: user.id,
        displayName: user.displayName,
        email: user.email.trim().toLowerCase(),
        emailNormalized: user.email.trim().toLowerCase(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return user;
  }

  override async resetPassword(email: string): Promise<void> {
    const auth = getFirebaseRuntime().auth;
    auth.languageCode = activeEmailLanguage();
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  }
}
