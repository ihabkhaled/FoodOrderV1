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
  logout(): Promise<void>;
  /** Deletes the authentication account itself; data cascade runs first via DataService. */
  deleteAccount(user: SessionUser): Promise<void>;
}
