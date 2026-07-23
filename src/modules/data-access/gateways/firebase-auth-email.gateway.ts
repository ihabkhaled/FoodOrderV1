import { doc, sendPasswordResetEmail, setDoc } from '@/packages/firebase';
import { getDocumentLanguage } from '@/platform/browser';
import { DEFAULT_LOCALE, matchSupportedLocale } from '@/shared/i18n';
import type { Locale } from '@/shared/types';

import type {
  ProfileDefaults,
  SessionUser,
} from '../types/domain.types';
import { FirebaseAuthService } from './firebase-auth.gateway';
import { getFirebaseRuntime } from './firebase-runtime.gateway';

const activeEmailLanguage = (): Locale =>
  matchSupportedLocale([getDocumentLanguage()]) ?? DEFAULT_LOCALE;

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
