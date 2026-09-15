import React from 'react';
import { useAuth } from './AuthProvider';
import { LoginPage } from '../components/auth/LoginPage';
import { GraduationCap, Sparkles, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onNavigateToLogin?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, isSyncing } = useAuth();

  // 1. Session verification phase: prevent flashing dashboard
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/70 to-indigo-50/60 flex flex-col items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md border border-rose-200 rounded-3xl p-8 shadow-xl shadow-rose-500/10 flex flex-col items-center max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 mb-4 animate-pulse">
            <GraduationCap className="w-8 h-8" />
          </div>
          <Loader2 className="w-6 h-6 text-rose-600 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-800 tracking-tight">
            Đang kiểm tra tài khoản EDUPLAY...
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Xác thực danh tính giáo viên qua Google Firebase
          </p>
        </div>
      </div>
    );
  }

  // 2. Post-login profile sync phase
  if (isSyncing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/70 to-indigo-50/60 flex flex-col items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md border border-rose-200 rounded-3xl p-8 shadow-xl shadow-rose-500/10 flex flex-col items-center max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 mb-4">
            <Sparkles className="w-8 h-8 text-amber-300 animate-spin" />
          </div>
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-800 tracking-tight">
            Đang chuẩn bị EDUPLAY của bạn...
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Đồng bộ kho câu hỏi, cấu hình lớp và dữ liệu cá nhân
          </p>
        </div>
      </div>
    );
  }

  // 3. Not authenticated -> Show Login view
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => {}} />;
  }

  // 4. Authenticated -> Render protected child components
  return <>{children}</>;
};
