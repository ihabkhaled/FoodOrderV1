import type { ProfileDefaults, SessionUser } from '../types/domain.types';

export interface AuthService {
  subscribe(listener: (user: SessionUser | null) => void): () => void;
  login(email: string, password: string): Promise<SessionUser>;
  register(
    fullName: string,
    email: string,
    password: string,
    defaults: ProfileDefaults,
  ): Promise<SessionUser>;
  resetPassword(email: string): Promise<void>;
  /** Re-verifies the current password before persisting the new one. */
  changePassword(
    user: SessionUser,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
  /** Validates an emailed reset code WITHOUT consuming it; resolves the account email. */
  verifyPasswordResetCode(code: string): Promise<string>;
  /** Consumes an emailed reset code and stores the new password. */
  confirmPasswordReset(code: string, newPassword: string): Promise<void>;
  logout(): Promise<void>;
  /** Deletes the authentication account itself; data cascade runs first via DataService. */
  deleteAccount(user: SessionUser): Promise<void>;
}
