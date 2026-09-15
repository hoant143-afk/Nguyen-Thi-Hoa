import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  LogOut,
  Settings,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Shield,
  School,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { apiClient } from '../../services/apiClient';
import { soundService } from '../../services/soundService';

interface EduplayUserMenuProps {
  onNavigate: (route: string) => void;
  onOpenSettings?: () => void;
}

export const EduplayUserMenu: React.FC<EduplayUserMenuProps> = ({
  onNavigate,
  onOpenSettings,
}) => {
  const { user, teacherProfile, teacherPreferences, logout, isDemo } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const displayName = teacherProfile?.displayName || user.displayName || 'Giáo viên';
  const email = teacherProfile?.email || user.email || '';
  const photoUrl = teacherProfile?.photoURL || teacherProfile?.photoUrl || user.photoURL;

  const handleForceSync = async () => {
    soundService.playClick();
    setIsFlushing(true);
    setSyncFeedback(null);
    try {
      const res = await apiClient.flushPendingQueue();
      setSyncFeedback(
        res.synced > 0
          ? `Đã đồng bộ ${res.synced} dữ liệu lên Cloud`
          : 'Dữ liệu đã ở trạng thái mới nhất'
      );
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch {
      setSyncFeedback('Không thể kết nối máy chủ');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsFlushing(false);
    }
  };

  const handleLogout = async () => {
    soundService.playClick();
    setIsOpen(false);
    await logout();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button: User Avatar + Name */}
      <button
        onClick={() => {
          soundService.playClick();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl bg-white hover:bg-rose-50/70 border border-rose-200/90 shadow-xs transition-all cursor-pointer group"
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover ring-2 ring-rose-400/40 group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="text-left hidden lg:block max-w-[130px]">
          <p className="text-xs font-black text-slate-800 truncate leading-tight">
            {displayName}
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            {teacherPreferences?.defaultSchoolName || 'Giáo viên'}
          </p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-rose-500' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-rose-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Header Summary */}
          <div className="p-3 bg-gradient-to-r from-rose-50 via-pink-50/70 to-indigo-50/50 rounded-2xl mb-1.5 flex items-center gap-3">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-400/50 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-black text-slate-800 truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 truncate" title={email}>{email}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${isDemo ? 'text-amber-800 bg-amber-100' : 'text-rose-700 bg-rose-100/90'}`}>
                <Shield className="w-2.5 h-2.5" />
                {isDemo ? 'Bản xem trước (Demo)' : 'Không gian cá nhân'}
              </span>
            </div>
          </div>

          {/* Sync notification if active */}
          {syncFeedback && (
            <div className="mb-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-700 font-medium">
              {syncFeedback}
            </div>
          )}

          {/* Menu Items */}
          <div className="flex flex-col gap-0.5 text-xs text-slate-700 font-semibold">
            {/* 1. Profile Page */}
            <button
              onClick={() => {
                soundService.playClick();
                setIsOpen(false);
                onNavigate('/profile');
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer text-left w-full"
            >
              <UserIcon className="w-4 h-4 text-indigo-600" />
              <div className="flex-1">
                <p className="font-bold">👤 Hồ sơ giáo viên</p>
                <p className="text-[10px] text-slate-400 font-normal">Xem thông tin và không gian làm việc</p>
              </div>
            </button>

            {/* 2. Workspace Settings */}
            <button
              onClick={() => {
                soundService.playClick();
                setIsOpen(false);
                if (onOpenSettings) {
                  onOpenSettings();
                } else {
                  onNavigate('/admin');
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer text-left w-full"
            >
              <Settings className="w-4 h-4 text-amber-600" />
              <div className="flex-1">
                <p className="font-bold">⚙️ Cài đặt không gian</p>
                <p className="text-[10px] text-slate-400 font-normal">Cấu hình trường, lớp và trò chơi</p>
              </div>
            </button>

            {/* 3. Cloud Sync */}
            <button
              onClick={handleForceSync}
              disabled={isFlushing}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer text-left w-full disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-600 ${isFlushing ? 'animate-spin' : ''}`} />
              <div className="flex-1">
                <p className="font-bold">☁️ Đồng bộ ngay</p>
                <p className="text-[10px] text-slate-400 font-normal">Cập nhật dữ liệu tức thì lên Google Sheet</p>
              </div>
            </button>

            <div className="my-1 border-t border-slate-100" />

            {/* 4. Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors cursor-pointer text-left w-full"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <div>
                <p className="font-bold">🚪 Đăng xuất</p>
                <p className="text-[10px] text-red-400 font-normal">Thoát tài khoản Google an toàn</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
