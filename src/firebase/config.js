// =============================================================================
// firebase/config.js — Firebase bootstrap (Phase 2)
// -----------------------------------------------------------------------------
// All keys come from Vite env vars (import.meta.env.VITE_*). Never hard-code
// secrets here — they live in a gitignored .env (see .env.example).
//
// Firestore uses persistentLocalCache to satisfy the offline-first directive
// (ARCHITECTURE.md §4). This must be set at initialization time.
// =============================================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fail fast & loud if the env file wasn't loaded — saves hours of "auth/invalid-api-key".
if (!firebaseConfig.apiKey) {
  console.error(
    '[firebase] Missing VITE_FIREBASE_* env vars. Copy .env.example to .env and fill it in.'
  );
}

const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);

// Firestore with offline-first local cache (multi-tab safe).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export default app;
