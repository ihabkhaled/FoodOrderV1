import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  doc,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  verifyPasswordResetCode,
} from '@/packages/firebase';
import { nowIso } from '@/shared/helpers';

import type { AuthService } from '../contracts/auth-service.interfaces';
import type { ProfileDefaults, SessionUser, UserProfile } from '../types/domain.types';
import { getFirebaseRuntime } from './firebase-runtime.gateway';

const sessionUser = (user: { uid: string; email: string | null; displayName: string | null }): SessionUser => ({
  id: user.uid,
  email: user.email ?? '',
  displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
  isDemo: false,
});

export class FirebaseAuthService implements AuthService {
  subscribe(listener: (user: SessionUser | null) => void): () => void {
    return onAuthStateChanged(getFirebaseRuntime().auth, (user) => { listener(user ? sessionUser(user) : null); });
  }

  async login(email: string, password: string): Promise<SessionUser> {
    const result = await signInWithEmailAndPassword(getFirebaseRuntime().auth, email, password);
    return sessionUser(result.user);
  }

  async register(
    fullName: string,
    email: string,
    password: string,
    defaults: ProfileDefaults,
  ): Promise<SessionUser> {
    const { auth, firestore } = getFirebaseRuntime();
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: fullName.trim() });
    const createdAt = nowIso();
    const profile: UserProfile = {
      id: result.user.uid,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      locale: defaults.locale,
      theme: defaults.theme,
      defaultCurrency: defaults.defaultCurrency,
      createdAt,
      updatedAt: createdAt,
    };
    await setDoc(doc(firestore, 'users', result.user.uid), profile);
    return sessionUser(result.user);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(getFirebaseRuntime().auth, email);
  }

  async changePassword(
    user: SessionUser,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const current = getFirebaseRuntime().auth.currentUser;
    if (!current || current.uid !== user.id) {
      throw new Error('You must be signed in to change this password.');
    }
    // Reauthenticate first so a wrong current password fails before any change.
    const credential = EmailAuthProvider.credential(
      current.email ?? user.email,
      currentPassword,
    );
    await reauthenticateWithCredential(current, credential);
    await updatePassword(current, newPassword);
  }

  async verifyPasswordResetCode(code: string): Promise<string> {
    return verifyPasswordResetCode(getFirebaseRuntime().auth, code);
  }

  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    await confirmPasswordReset(getFirebaseRuntime().auth, code, newPassword);
  }

  async logout(): Promise<void> {
    await signOut(getFirebaseRuntime().auth);
  }

  async deleteAccount(user: SessionUser): Promise<void> {
    const current = getFirebaseRuntime().auth.currentUser;
    if (!current || current.uid !== user.id) throw new Error('You must be signed in to delete this account.');
    // Firebase requires a recent login; the requires-recent-login error surfaces to the UI.
    await deleteUser(current);
  }
}
