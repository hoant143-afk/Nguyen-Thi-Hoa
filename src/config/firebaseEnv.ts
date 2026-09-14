/**
 * ==============================================================================
 * 🎓 EDUPLAY - FIREBASE ENVIRONMENT CONFIGURATION & VALIDATION
 * ==============================================================================
 * Central module for reading and validating Firebase configuration from Vite.
 *
 * MAPPING:
 * - apiKey            -> import.meta.env.VITE_FIREBASE_API_KEY
 * - authDomain        -> import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
 * - projectId         -> import.meta.env.VITE_FIREBASE_PROJECT_ID
 * - messagingSenderId -> import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
 * - appId             -> import.meta.env.VITE_FIREBASE_APP_ID
 * - storageBucket     -> import.meta.env.VITE_FIREBASE_STORAGE_BUCKET (OPTIONAL)
 */

export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const firebaseEnv: FirebaseEnvConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
};

/**
 * 5 required environment variables for Google Authentication in EDUPLAY.
 */
export const requiredFirebaseEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

/**
 * Optional environment variables (does not block the application if missing).
 */
export const optionalFirebaseEnv = [
  'VITE_FIREBASE_STORAGE_BUCKET',
] as const;

export interface EnvFieldDiagnostic {
  key: string;
  label: string;
  configured: boolean;
  required: boolean;
  maskedValue?: string;
}

export interface FirebaseEnvironmentValidation {
  valid: boolean;
  missing: string[];
  fields: {
    apiKey: EnvFieldDiagnostic;
    authDomain: EnvFieldDiagnostic;
    projectId: EnvFieldDiagnostic;
    senderId: EnvFieldDiagnostic;
    appId: EnvFieldDiagnostic;
    storageBucket: EnvFieldDiagnostic;
  };
}

/**
 * Masks a sensitive string (e.g. API key) for safe diagnostic preview.
 * Never displays the full key in the UI.
 */
function maskValue(val: string): string {
  if (!val) return '';
  if (val.length <= 8) return '••••••••';
  return `${val.slice(0, 4)}••••${val.slice(-4)}`;
}

/**
 * Validates Firebase environment configuration without throwing an exception.
 * Allows the application to gracefully render a configuration checklist instead of crashing.
 */
export function validateFirebaseEnvironment(): FirebaseEnvironmentValidation {
  const missing: string[] = [];

  const isApiKeyValid = Boolean(
    firebaseEnv.apiKey &&
    !firebaseEnv.apiKey.startsWith('AIzaSyPlaceholder')
  );
  if (!isApiKeyValid) missing.push('VITE_FIREBASE_API_KEY');

  const isAuthDomainValid = Boolean(firebaseEnv.authDomain);
  if (!isAuthDomainValid) missing.push('VITE_FIREBASE_AUTH_DOMAIN');

  const isProjectIdValid = Boolean(firebaseEnv.projectId);
  if (!isProjectIdValid) missing.push('VITE_FIREBASE_PROJECT_ID');

  const isSenderIdValid = Boolean(firebaseEnv.messagingSenderId);
  if (!isSenderIdValid) missing.push('VITE_FIREBASE_MESSAGING_SENDER_ID');

  const isAppIdValid = Boolean(firebaseEnv.appId);
  if (!isAppIdValid) missing.push('VITE_FIREBASE_APP_ID');

  const isStorageBucketConfigured = Boolean(firebaseEnv.storageBucket);

  return {
    valid: missing.length === 0,
    missing,
    fields: {
      apiKey: {
        key: 'VITE_FIREBASE_API_KEY',
        label: 'Firebase API Key',
        configured: isApiKeyValid,
        required: true,
        maskedValue: isApiKeyValid ? maskValue(firebaseEnv.apiKey) : undefined,
      },
      authDomain: {
        key: 'VITE_FIREBASE_AUTH_DOMAIN',
        label: 'Auth Domain',
        configured: isAuthDomainValid,
        required: true,
        maskedValue: isAuthDomainValid ? firebaseEnv.authDomain : undefined,
      },
      projectId: {
        key: 'VITE_FIREBASE_PROJECT_ID',
        label: 'Project ID',
        configured: isProjectIdValid,
        required: true,
        maskedValue: isProjectIdValid ? firebaseEnv.projectId : undefined,
      },
      senderId: {
        key: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
        label: 'Sender ID',
        configured: isSenderIdValid,
        required: true,
        maskedValue: isSenderIdValid ? maskValue(firebaseEnv.messagingSenderId) : undefined,
      },
      appId: {
        key: 'VITE_FIREBASE_APP_ID',
        label: 'App ID',
        configured: isAppIdValid,
        required: true,
        maskedValue: isAppIdValid ? maskValue(firebaseEnv.appId) : undefined,
      },
      storageBucket: {
        key: 'VITE_FIREBASE_STORAGE_BUCKET',
        label: 'Storage Bucket',
        configured: isStorageBucketConfigured,
        required: false,
        maskedValue: isStorageBucketConfigured ? firebaseEnv.storageBucket : undefined,
      },
    },
  };
}
