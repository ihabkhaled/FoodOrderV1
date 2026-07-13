interface FirebaseEnvironment {
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const get = (key: string): string => String(import.meta.env[key] ?? '').trim();

/**
 * Firebase web configuration is provided through `.env` (VITE_FIREBASE_*)
 * at build time. When every required value is present the app runs in
 * Firebase cloud mode; otherwise it falls back to the fully functional
 * local-device mode. Locale and currency are intentionally NOT environment
 * values: they are runtime settings owned by src/state/deviceConfig.ts and
 * changeable by the user at any time.
 */
const firebase: FirebaseEnvironment = {
  apiKey: get('VITE_FIREBASE_API_KEY'),
  authDomain: get('VITE_FIREBASE_AUTH_DOMAIN'),
  ...(get('VITE_FIREBASE_DATABASE_URL') ? { databaseURL: get('VITE_FIREBASE_DATABASE_URL') } : {}),
  projectId: get('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: get('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: get('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: get('VITE_FIREBASE_APP_ID'),
  ...(get('VITE_FIREBASE_MEASUREMENT_ID')
    ? { measurementId: get('VITE_FIREBASE_MEASUREMENT_ID') }
    : {}),
};

const forceLocalMode = get('VITE_FORCE_LOCAL_MODE') === 'true';

export const env = {
  appName: get('VITE_APP_NAME') || 'FoodOrder',
  appVersion: __APP_VERSION__,
  /**
   * Initial defaults only. Locale and currency are runtime settings the user
   * changes anytime (src/state/deviceConfig.ts); these seed first launch.
   */
  initialLocale: get('VITE_DEFAULT_LOCALE') === 'ar' ? ('ar' as const) : ('en' as const),
  initialCurrency: get('VITE_DEFAULT_CURRENCY') || 'EGP',
  firebase,
  firebaseEnabled:
    !forceLocalMode &&
    Boolean(firebase.apiKey && firebase.authDomain && firebase.projectId && firebase.appId),
} as const;
