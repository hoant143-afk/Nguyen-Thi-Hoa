import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

/**
 * 🎓 EDUPLAY - FIREBASE AUTHENTICATION CONFIGURATION
 * Firebase is used strictly for teacher identity authentication via Google Login.
 * All user profile and game data are stored in Google Sheets / Local Storage.
 *
 * MAPPING:
 * - apiKey            -> import.meta.env.VITE_FIREBASE_API_KEY
 * - authDomain        -> import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
 * - projectId         -> import.meta.env.VITE_FIREBASE_PROJECT_ID
 * - storageBucket     -> import.meta.env.VITE_FIREBASE_STORAGE_BUCKET (Optional)
 * - messagingSenderId -> import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
 * - appId             -> import.meta.env.VITE_FIREBASE_APP_ID
 */

export interface FirebaseValidationResult {
  isValid: boolean;
  missingKeys: string[];
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

/**
 * Validates the presence of required Firebase environment variables.
 *
 * Required for Google Authentication:
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - VITE_FIREBASE_PROJECT_ID
 * - VITE_FIREBASE_MESSAGING_SENDER_ID
 * - VITE_FIREBASE_APP_ID
 *
 * Optional:
 * - VITE_FIREBASE_STORAGE_BUCKET (lack of bucket does NOT block the app)
 */
export function validateFirebaseConfig(): FirebaseValidationResult {
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
  const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
  const messagingSenderId = (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim();
  const appId = (import.meta.env.VITE_FIREBASE_APP_ID || '').trim();
  const storageBucket = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim();

  const missingKeys: string[] = [];

  if (!apiKey || apiKey.startsWith('AIzaSyPlaceholder')) missingKeys.push('VITE_FIREBASE_API_KEY');
  if (!authDomain) missingKeys.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!projectId) missingKeys.push('VITE_FIREBASE_PROJECT_ID');
  if (!messagingSenderId) missingKeys.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!appId) missingKeys.push('VITE_FIREBASE_APP_ID');

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
    config: {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    },
  };
}

const validation = validateFirebaseConfig();
export const isFirebaseConfigured: boolean = validation.isValid;

// Prevent duplicate initialization across development / HMR / module re-imports
let app: FirebaseApp;
if (getApps().length > 0) {
  app = getApp();
} else {
  if (validation.isValid) {
    app = initializeApp({
      apiKey: validation.config.apiKey,
      authDomain: validation.config.authDomain,
      projectId: validation.config.projectId,
      storageBucket: validation.config.storageBucket || undefined,
      messagingSenderId: validation.config.messagingSenderId,
      appId: validation.config.appId,
    });
  } else {
    // Safe placeholder to avoid unhandled exceptions during initial module evaluation
    app = initializeApp({
      apiKey: 'AIzaSyPlaceholderEduplayAuthKey',
      authDomain: 'eduplay-placeholder.firebaseapp.com',
      projectId: 'eduplay-placeholder',
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:placeholder000000',
    });
  }
}

export const auth: Auth = getAuth(app);

// Configure Google Auth Provider strictly for basic teacher identity profile
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export default app;
