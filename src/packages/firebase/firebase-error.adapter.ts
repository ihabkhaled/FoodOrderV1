import type { FirebaseErrorLike } from './firebase-error.interfaces';
import type {
  FirebaseErrorFamily,
  FirebaseErrorLocale,
} from './firebase-error.types';
import {
  FIREBASE_ERROR_MESSAGE_KEY_BY_CODE,
  FIREBASE_ERROR_MESSAGES,
  FIREBASE_GENERIC_MESSAGE_KEY_BY_FAMILY,
} from './firebase-error-messages.constants';

let activeLocale: FirebaseErrorLocale = 'en';

export const setFirebaseErrorLocale = (locale: FirebaseErrorLocale): void => {
  activeLocale = locale;
};

const firebaseCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null) return null;

  const code = (error as FirebaseErrorLike).code;
  if (typeof code === 'string' && code.includes('/')) return code;

  const rawMessage = (error as FirebaseErrorLike).message;
  if (typeof rawMessage !== 'string') return null;

  const match = /\(((?:auth|firestore|functions|storage)\/[^)]+)\)/u.exec(
    rawMessage,
  );
  if (match?.[1]) return match[1];
  return rawMessage.includes('Missing or insufficient permissions')
    ? 'firestore/permission-denied'
    : null;
};

const firebaseFamily = (code: string): FirebaseErrorFamily | null => {
  const family = code.split('/')[0];
  return family === 'auth' ||
    family === 'firestore' ||
    family === 'functions' ||
    family === 'storage'
    ? family
    : null;
};

export const firebaseErrorMessage = (
  error: unknown,
  locale: FirebaseErrorLocale = activeLocale,
): string | null => {
  const code = firebaseCode(error);
  if (!code) return null;

  const exactKey = FIREBASE_ERROR_MESSAGE_KEY_BY_CODE[code];
  if (exactKey) return FIREBASE_ERROR_MESSAGES[locale][exactKey];

  const family = firebaseFamily(code);
  return family
    ? FIREBASE_ERROR_MESSAGES[locale][
        FIREBASE_GENERIC_MESSAGE_KEY_BY_FAMILY[family]
      ]
    : null;
};

export const userFacingErrorMessage = (
  error: unknown,
  locale: FirebaseErrorLocale,
  fallback: string,
): string => {
  const translated = firebaseErrorMessage(error, locale);
  if (translated) return translated;
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
};

const normalizeFirebaseError = (error: unknown): unknown => {
  const translated = firebaseErrorMessage(error);
  return translated ? new Error(translated, { cause: error }) : error;
};

export const withFirebaseErrorTranslation = <Service extends object>(
  service: Service,
): Service =>
  new Proxy(service, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;
      const method = value as (...arguments_: unknown[]) => unknown;
      return (...arguments_: unknown[]) => {
        try {
          const result = Reflect.apply(method, target, arguments_);
          if (result instanceof Promise) {
            return result.catch((error: unknown) => {
              throw normalizeFirebaseError(error);
            });
          }
          return result;
        } catch (error) {
          throw normalizeFirebaseError(error);
        }
      };
    },
  });
