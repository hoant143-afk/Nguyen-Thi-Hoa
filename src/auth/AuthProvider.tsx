import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider, validateFirebaseConfig, isFirebaseConfigured } from '../config/firebase';
import { apiClient } from '../services/apiClient';
import { EduplayStorage } from '../services/eduplayStorage';
import { EduplayUser, EduplayUserPreferences } from '../types';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSyncing: boolean;
  isAuthenticated: boolean;
  isDemo: boolean;
  authError: string | null;
  teacherProfile: EduplayUser | null;
  teacherPreferences: EduplayUserPreferences | null;
  signInWithGoogle: () => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  refreshIdToken: () => Promise<string | null>;
  updatePreferences: (partial: Partial<EduplayUserPreferences>) => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to create a fully-typed simulated User for preview/demo mode
const createDemoUser = (): User => ({
  uid: 'demo_teacher_eduplay',
  email: 'giaovien.demo@eduplay.vn',
  displayName: 'Giáo viên Demo',
  photoURL: '',
  emailVerified: true,
  isAnonymous: true,
  metadata: {} as any,
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'demo_id_token',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: null,
  providerId: 'firebase',
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<EduplayUser | null>(null);
  const [teacherPreferences, setTeacherPreferences] = useState<EduplayUserPreferences | null>(null);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const getIdToken = useCallback(async (forceRefresh: boolean = false): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (err: any) {
      console.warn('[EDUPLAY AUTH] Failed to retrieve ID token:', err);
      return null;
    }
  }, []);

  const refreshIdToken = useCallback(async (): Promise<string | null> => {
    return getIdToken(true);
  }, [getIdToken]);

  // Sync Teacher Profile and Preferences with backend
  const syncTeacherAccount = useCallback(async (firebaseUser: User) => {
    setIsSyncing(true);
    try {
      // 1. Point storage namespace to this teacher's UID
      EduplayStorage.setTeacherUid(firebaseUser.uid);

      // 2. Call users.syncProfile via apiClient (attaches verified ID token automatically)
      const syncRes = await apiClient.apiRequest<EduplayUser>('users.syncProfile', {
        displayName: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || '',
      });

      if (syncRes.success && syncRes.data) {
        setTeacherProfile(syncRes.data);
      } else {
        // Local fallback profile
        setTeacherProfile({
          authUid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Giáo viên',
          photoURL: firebaseUser.photoURL || '',
          role: 'TEACHER',
          enabled: true,
          status: 'ACTIVE',
          emailVerified: firebaseUser.emailVerified,
        });
      }

      // 3. Load Teacher Preferences
      const prefRes = await apiClient.apiRequest<EduplayUserPreferences>('preferences.get');
      if (prefRes.success && prefRes.data) {
        setTeacherPreferences(prefRes.data);
      } else {
        // Default local workspace preferences
        const defaultPrefs: EduplayUserPreferences = {
          authUid: firebaseUser.uid,
          defaultSchoolName: 'Trường Tiểu học',
          defaultClassName: '5A1',
          defaultSubject: 'Tin học',
          defaultGrade: 5,
          defaultQuestionCount: 10,
          defaultTeamCount: 4,
          soundEnabled: true,
          animationEnabled: true,
          theme: 'LIGHT',
        };
        setTeacherPreferences(defaultPrefs);
      }

      setAuthError(null);
    } catch (err: any) {
      console.warn('[EDUPLAY AUTH] Error during profile sync:', err);
      // Even if cloud sync has network glitch, set basic profile
      setTeacherProfile({
        authUid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Giáo viên',
        photoURL: firebaseUser.photoURL || '',
        role: 'TEACHER',
        enabled: true,
        status: 'ACTIVE',
        emailVerified: firebaseUser.emailVerified,
      });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const loginAsDemo = useCallback(() => {
    const demoUser = createDemoUser();
    setUser(demoUser);
    setIsDemo(true);
    EduplayStorage.setTeacherUid('demo_teacher_eduplay');
    setTeacherProfile({
      authUid: 'demo_teacher_eduplay',
      email: 'giaovien.demo@eduplay.vn',
      displayName: 'Giáo viên Demo',
      photoURL: '',
      role: 'TEACHER',
      enabled: true,
      status: 'ACTIVE',
      emailVerified: true,
    });
    setTeacherPreferences({
      authUid: 'demo_teacher_eduplay',
      defaultSchoolName: 'Trường Tiểu học Eduplay',
      defaultClassName: '5A1',
      defaultSubject: 'Tin học & Kỹ năng sống',
      defaultGrade: 5,
      defaultQuestionCount: 10,
      defaultTeamCount: 4,
      soundEnabled: true,
      animationEnabled: true,
      theme: 'LIGHT',
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('eduplay_is_demo', 'true');
    }
    setAuthError(null);
  }, []);

  // Monitor Firebase Auth State or Restore Demo Session
  useEffect(() => {
    const isSavedDemo = typeof localStorage !== 'undefined' && localStorage.getItem('eduplay_is_demo') === 'true';
    if (isSavedDemo) {
      loginAsDemo();
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsDemo(false);
        await syncTeacherAccount(firebaseUser);
      } else {
        // Clean up when user logs out or switches accounts
        setUser(null);
        setIsDemo(false);
        setTeacherProfile(null);
        setTeacherPreferences(null);
        EduplayStorage.clearUserTransientState();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncTeacherAccount, loginAsDemo]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setLoading(true);

    const validation = validateFirebaseConfig();
    if (!validation.isValid) {
      setAuthError(
        `Firebase chưa được cấu hình đầy đủ. Vui lòng bổ sung: ${validation.missingKeys.join(', ')}`
      );
      setLoading(false);
      return;
    }

    try {
      // Primary: signInWithPopup
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('[EDUPLAY AUTH] Popup login issue:', err);
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/cancelled-popup-request' ||
        /popup/i.test(err.message)
      ) {
        try {
          // Fallback: signInWithRedirect
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setAuthError('Trình duyệt đang chặn cửa sổ đăng nhập. Hãy cho phép popup hoặc thử lại.');
        }
      } else if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError(
          'Tên miền hiện tại chưa được cấp phép trong Firebase Console (Authentication → Settings → Authorized domains).'
        );
      } else if (err.code === 'auth/network-request-failed') {
        setAuthError('Không thể kết nối máy chủ xác thực. Vui lòng kiểm tra đường truyền mạng.');
      } else {
        setAuthError(err.message || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (!isDemo) {
        await signOut(auth);
      }
    } catch (err) {
      console.error('[EDUPLAY AUTH] Logout error:', err);
    } finally {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('eduplay_is_demo');
      }
      setIsDemo(false);
      setUser(null);
      setTeacherProfile(null);
      setTeacherPreferences(null);
      EduplayStorage.clearUserTransientState();
      // Route to login
      if (typeof window !== 'undefined') {
        window.location.hash = '/login';
      }
    }
  };

  const updatePreferences = async (partial: Partial<EduplayUserPreferences>): Promise<boolean> => {
    if (!user) return false;
    const updated = {
      ...(teacherPreferences || {}),
      ...partial,
      authUid: user.uid,
    };
    setTeacherPreferences(updated as EduplayUserPreferences);

    try {
      const res = await apiClient.apiRequest('preferences.update', partial);
      return res.success;
    } catch (err) {
      console.warn('[EDUPLAY AUTH] Failed to save preferences to cloud:', err);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isSyncing,
    isAuthenticated: Boolean(user),
    isDemo,
    authError,
    teacherProfile,
    teacherPreferences,
    signInWithGoogle,
    loginAsDemo,
    logout,
    getIdToken,
    refreshIdToken,
    updatePreferences,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
