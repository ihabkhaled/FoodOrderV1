import { subscribeToAppEvent } from '@/platform/browser';
import { createPasswordSalt, hashPassword } from '@/platform/crypto';
import { readWebStorage, removeWebStorage, writeWebStorage } from '@/platform/storage';
import { createId, nowIso } from '@/shared/helpers';

import type { AuthService } from '../contracts/auth-service.interfaces';
import type { ProfileDefaults, SessionUser, UserProfile } from '../types/domain.types';
import {
  AUTH_EVENT,
  type LocalUserRecord,
  notifyAuth,
  readDatabase,
  SESSION_KEY,
  toSessionUser,
  writeDatabase,
} from './local-database.helper';

/** Emailed one-time reset codes only exist in Firebase mode. */
const rejectLocalResetLink = (): never => {
  throw new Error(
    'Password reset links require Firebase mode. In local mode, change your password from Settings.',
  );
};

/** Verifies a candidate password against a hashed (or legacy) record. */
const matchesRecordPassword = async (
  record: LocalUserRecord,
  candidate: string,
): Promise<boolean> => {
  if (record.passwordHash !== undefined && record.passwordSalt !== undefined) {
    return (await hashPassword(candidate, record.passwordSalt)) === record.passwordHash;
  }
  return record.password === candidate;
};

/** Replaces any stored credential with a freshly salted one-way hash. */
const storeHashedPassword = async (
  record: LocalUserRecord,
  password: string,
): Promise<void> => {
  record.passwordSalt = createPasswordSalt();
  record.passwordHash = await hashPassword(password, record.passwordSalt);
  delete record.password;
};

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
    if (!record || !(await matchesRecordPassword(record, password))) {
      throw new Error('Invalid email or password.');
    }
    if (record.password !== undefined) {
      // Upgrade a legacy clear-text record to a salted hash in place.
      await storeHashedPassword(record, password);
      writeDatabase(database);
    }
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
    const record: LocalUserRecord = { profile };
    await storeHashedPassword(record, password);
    database.users[id] = record;
    database.buckets[id] = [];
    database.orders[id] = [];
    writeDatabase(database);
    writeWebStorage(SESSION_KEY, id);
    notifyAuth();
    return toSessionUser(profile);
  }

  async changePassword(
    user: SessionUser,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const database = readDatabase();
    const record = database.users[user.id];
    if (!record || !(await matchesRecordPassword(record, currentPassword))) {
      throw new Error('Invalid email or password.');
    }
    await storeHashedPassword(record, newPassword);
    record.profile.updatedAt = nowIso();
    writeDatabase(database);
  }

  async verifyPasswordResetCode(_code: string): Promise<string> {
    return rejectLocalResetLink();
  }

  async confirmPasswordReset(_code: string, _newPassword: string): Promise<void> {
    rejectLocalResetLink();
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
