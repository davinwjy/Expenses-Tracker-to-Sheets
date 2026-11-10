import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import { defaultFirebaseConfig } from './defaultFirebaseConfig';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

const FIREBASE_CONFIG_STORAGE_KEY = 'wealthtrack_firebase_config';

// 1. Get stored, URL param, default or env config
export function getStoredFirebaseConfig(): FirebaseConfig | null {
  // Check URL parameter first (?fbConfig=... or ?fb=...) for 1-click HP onboarding
  if (typeof window !== 'undefined' && window.location.search) {
    try {
      const params = new URLSearchParams(window.location.search);
      const fbParam = params.get('fbConfig') || params.get('fb');
      if (fbParam) {
        let decoded = '';
        try {
          decoded = decodeURIComponent(escape(atob(fbParam)));
        } catch {
          decoded = decodeURIComponent(fbParam);
        }
        const parsed = JSON.parse(decoded);
        if (parsed.apiKey && parsed.projectId) {
          localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(parsed));
          // Clean the query param from URL without reload
          params.delete('fbConfig');
          params.delete('fb');
          const newSearch = params.toString() ? `?${params.toString()}` : '';
          window.history.replaceState({}, '', `${window.location.pathname}${newSearch}${window.location.hash}`);
          return parsed as FirebaseConfig;
        }
      }
    } catch (err) {
      console.warn('Failed to parse Firebase config from URL param:', err);
    }
  }

  // Check code-level defaultFirebaseConfig (baked into repo)
  if (defaultFirebaseConfig && defaultFirebaseConfig.apiKey && defaultFirebaseConfig.projectId) {
    return defaultFirebaseConfig;
  }

  // Check localStorage (user-configured in UI)
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId) {
        return parsed as FirebaseConfig;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored Firebase config:', err);
  }

  // Check Vite env vars (optional fallback)
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (envApiKey && envProjectId) {
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return null;
}

export function generateFirebaseShareUrl(config?: FirebaseConfig | null): string {
  const targetConfig = config || getStoredFirebaseConfig();
  if (!targetConfig) return '';
  try {
    const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(targetConfig))));
    const url = new URL(window.location.href);
    url.searchParams.set('fbConfig', base64);
    return url.toString();
  } catch (err) {
    console.error('Failed to encode Firebase config for share URL:', err);
    return '';
  }
}

// 2. Parser to extract Firebase config from text, JS snippet or JSON
export function parseFirebaseConfigInput(input: string): FirebaseConfig {
  const trimmed = input.trim();

  // Try direct JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.apiKey && parsed.projectId) {
        return parsed as FirebaseConfig;
      }
    } catch {
      // Continue to regex extractor
    }
  }

  // Regex extractor for JS snippet or loose text
  const extractField = (key: string): string => {
    const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`, 'i');
    const match = trimmed.match(regex);
    return match ? match[1].trim() : '';
  };

  const apiKey = extractField('apiKey');
  const authDomain = extractField('authDomain');
  const projectId = extractField('projectId');
  const storageBucket = extractField('storageBucket');
  const messagingSenderId = extractField('messagingSenderId');
  const appId = extractField('appId');
  const measurementId = extractField('measurementId');

  if (!apiKey || !projectId) {
    throw new Error('Could not find "apiKey" and "projectId". Please paste the full firebaseConfig object.');
  }

  return {
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: storageBucket || undefined,
    messagingSenderId: messagingSenderId || undefined,
    appId: appId || '',
    measurementId: measurementId || undefined,
  };
}

// 3. Save config
export function saveFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  // Reinitialize instances
  initFirebase();
}

// 4. Remove config
export function removeFirebaseConfig(): void {
  localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  window.location.reload();
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function initFirebase(): { app: FirebaseApp | null; auth: Auth | null; db: Firestore | null } {
  const config = getStoredFirebaseConfig();
  if (!config) {
    appInstance = null;
    authInstance = null;
    dbInstance = null;
    return { app: null, auth: null, db: null };
  }

  try {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(config);
    }
    authInstance = getAuth(appInstance);

    // Initialize Firestore with robust IndexedDB multi-tab offline cache
    try {
      dbInstance = initializeFirestore(appInstance, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // If already initialized (e.g. fast reload), retrieve existing instance
      dbInstance = getFirestore(appInstance);
    }

    return { app: appInstance, auth: authInstance, db: dbInstance };
  } catch (err) {
    console.warn('Firebase initialization error:', err);
    return { app: null, auth: null, db: null };
  }
}

// Check if Firebase is currently active
export function isFirebaseActive(): boolean {
  return getStoredFirebaseConfig() !== null;
}

// Explicit network controls for offline/online synchronization
export async function syncFirestoreOnline(): Promise<void> {
  if (dbInstance) {
    try {
      await enableNetwork(dbInstance);
    } catch (err) {
      console.warn('enableNetwork error:', err);
    }
  }
}

export async function setFirestoreOffline(): Promise<void> {
  if (dbInstance) {
    try {
      await disableNetwork(dbInstance);
    } catch (err) {
      console.warn('disableNetwork error:', err);
    }
  }
}

// Initialize on module load
const initial = initFirebase();
export const firebaseApp = initial.app;
export const firebaseAuth = initial.auth;
export const firestoreDb = initial.db;
