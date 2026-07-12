interface FirebaseEnvironment {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const get = (key: string): string => String(import.meta.env[key] ?? '').trim();

const firebase: FirebaseEnvironment = {
  apiKey: get('VITE_FIREBASE_API_KEY'),
  authDomain: get('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: get('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: get('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: get('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: get('VITE_FIREBASE_APP_ID'),
  ...(get('VITE_FIREBASE_MEASUREMENT_ID')
    ? { measurementId: get('VITE_FIREBASE_MEASUREMENT_ID') }
    : {}),
};

export const env = {
  appName: get('VITE_APP_NAME') || 'FoodOrder',
  defaultLocale: get('VITE_DEFAULT_LOCALE') === 'ar' ? 'ar' : 'en',
  defaultCurrency: get('VITE_DEFAULT_CURRENCY') || 'EGP',
  enableDemoMode: get('VITE_ENABLE_DEMO_MODE') !== 'false',
  firebase,
  firebaseEnabled: Boolean(
    firebase.apiKey && firebase.authDomain && firebase.projectId && firebase.appId,
  ),
} as const;
