/** Firebase Authentication surface used by application source. */
export {
  type Auth,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';
