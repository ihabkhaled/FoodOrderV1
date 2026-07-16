import { nowIso } from '@/lib/date';
import { createId } from '@/lib/id';
import { subscribeToAppEvent } from '@/platform/browser';
import { readWebStorage, removeWebStorage, writeWebStorage } from '@/platform/storage';

import type { AuthService } from '../contracts/auth-service.interfaces';
import type { ProfileDefaults, SessionUser, UserProfile } from '../types/domain.types';
import {
  AUTH_EVENT,
  notifyAuth,
  readDatabase,
  SESSION_KEY,
  toSessionUser,
  writeDatabase,
} from './local-database.helper';

export class LocalAuthService implements AuthService {
  subscribe(listener: (user: SessionUser | null) => void): () => void {
    const emit = (): void => {
      const id = readWebStorage(SESSION_KEY);
      const user = id ? readDatabase().users[id] : undefined;
      listener(user ? toSessionUser(user.profile) : null);
    };
    emit();
    return subscribeToAppEvent(AUTH_EVENT, emit);
  }

  async login(email: string, password: string): Promise<SessionUser> {
    const database = readDatabase();
    const record = Object.values(database.users).find(
      (item) => item.profile.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!record || record.password !== password) throw new Error('Invalid email or password.');
    writeWebStorage(SESSION_KEY, record.profile.id);
    notifyAuth();
    return toSessionUser(record.profile);
  }

  async register(
    fullName: string,
    email: string,
    password: string,
    defaults: ProfileDefaults,
  ): Promise<SessionUser> {
    const database = readDatabase();
    if (Object.values(database.users).some((item) => item.profile.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account already exists for this email.');
    }
    const id = createId('user');
    const createdAt = nowIso();
    const profile: UserProfile = {
      id,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      locale: defaults.locale,
      theme: defaults.theme,
      defaultCurrency: defaults.defaultCurrency,
      createdAt,
      updatedAt: createdAt,
    };
    database.users[id] = { password, profile };
    database.buckets[id] = [];
    database.orders[id] = [];
    writeDatabase(database);
    writeWebStorage(SESSION_KEY, id);
    notifyAuth();
    return toSessionUser(profile);
  }

  async resetPassword(email: string): Promise<void> {
    const exists = Object.values(readDatabase().users).some(
      (item) => item.profile.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!exists) throw new Error('No local account exists for this email.');
    throw new Error('Password reset email requires Firebase mode. In local mode, create another account.');
  }

  async logout(): Promise<void> {
    removeWebStorage(SESSION_KEY);
    notifyAuth();
  }

  async deleteAccount(_user: SessionUser): Promise<void> {
    // Local credentials live in the user record removed by deleteAllUserData.
    removeWebStorage(SESSION_KEY);
    notifyAuth();
  }
}
