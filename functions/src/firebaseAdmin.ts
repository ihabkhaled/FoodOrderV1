import { getApps, initializeApp } from 'firebase-admin/app';

// Firebase Functions does not initialize the Admin SDK app for application code.
// Keep this bootstrap idempotent because local tooling/tests may load the bundle
// more than once in the same process.
if (getApps().length === 0) {
  initializeApp();
}
