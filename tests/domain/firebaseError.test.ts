import { describe, expect, it } from 'vitest';

import {
  firebaseErrorMessage,
  setFirebaseErrorLocale,
  userFacingErrorMessage,
  withFirebaseErrorTranslation,
} from '@/packages/firebase';
import { FIREBASE_ERROR_MESSAGES } from '@/packages/firebase/firebase-error-messages.constants';
import { SUPPORTED_LOCALES } from '@/shared/i18n';

const codedError = (code: string): Error & { code: string } =>
  Object.assign(new Error(`Firebase: Error (${code}).`), { code });

const compareText = (left: string, right: string): number =>
  left.localeCompare(right);

describe('Firebase error localization', () => {
  it('has nonblank, key-parity translations for every supported locale', () => {
    const englishKeys = Object.keys(FIREBASE_ERROR_MESSAGES.en).toSorted(
      compareText,
    );

    expect(Object.keys(FIREBASE_ERROR_MESSAGES).toSorted(compareText)).toEqual(
      [...SUPPORTED_LOCALES].toSorted(compareText),
    );
    for (const locale of SUPPORTED_LOCALES) {
      const messages = FIREBASE_ERROR_MESSAGES[locale];
      expect(Object.keys(messages).toSorted(compareText)).toEqual(englishKeys);
      for (const key of englishKeys) {
        const message = messages[key as keyof typeof messages];
        expect(message.trim()).not.toBe('');
      }
    }
    for (const locale of SUPPORTED_LOCALES.filter((value) => value !== 'en')) {
      const messages = FIREBASE_ERROR_MESSAGES[locale];
      for (const key of englishKeys) {
        expect(messages[key as keyof typeof messages]).not.toBe(
          FIREBASE_ERROR_MESSAGES.en[
            key as keyof typeof FIREBASE_ERROR_MESSAGES.en
          ],
        );
      }
    }
  });

  it('returns the selected locale instead of a binary English fallback', () => {
    const error = codedError('auth/invalid-credential');

    for (const locale of SUPPORTED_LOCALES) {
      expect(firebaseErrorMessage(error, locale)).toBe(
        FIREBASE_ERROR_MESSAGES[locale].invalidCredentials,
      );
    }
  });

  it('translates invalid credentials without exposing Firebase text', () => {
    const error = codedError('auth/invalid-credential');

    expect(firebaseErrorMessage(error, 'en')).toBe(
      'The email or password is incorrect.',
    );
    expect(firebaseErrorMessage(error, 'ar')).toBe(
      'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    );
  });

  it('translates an email already in use', () => {
    expect(
      firebaseErrorMessage(codedError('auth/email-already-in-use'), 'en'),
    ).toContain('already exists');
    expect(
      firebaseErrorMessage(codedError('auth/email-already-in-use'), 'ar'),
    ).toContain('يوجد حساب');
  });

  it('normalizes the raw Firestore permission message', () => {
    const error = new Error('Missing or insufficient permissions.');

    expect(firebaseErrorMessage(error, 'en')).toBe(
      'You do not have permission to access or change this data.',
    );
    expect(firebaseErrorMessage(error, 'ar')).toBe(
      'لا تملك صلاحية الوصول إلى هذه البيانات أو تعديلها.',
    );
  });

  it('uses a localized family fallback for a future Firebase code', () => {
    expect(firebaseErrorMessage(codedError('auth/future-sdk-error'), 'ar')).toBe(
      'تعذّر إكمال تسجيل الدخول. حاول مرة أخرى.',
    );
  });

  it('preserves a non-Firebase application error', () => {
    expect(
      userFacingErrorMessage(new Error('Bucket was not found.'), 'ar', 'fallback'),
    ).toBe('Bucket was not found.');
  });

  it('wraps asynchronous Firebase service errors using the active locale', async () => {
    setFirebaseErrorLocale('ar');
    const service = withFirebaseErrorTranslation({
      fail(): Promise<void> {
        return Promise.reject(codedError('functions/permission-denied'));
      },
    });

    await expect(service.fail()).rejects.toThrow(
      'لا تملك صلاحية تنفيذ هذا الإجراء.',
    );
  });
});
