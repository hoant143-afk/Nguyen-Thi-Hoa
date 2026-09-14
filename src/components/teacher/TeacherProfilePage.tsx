import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  School,
  BookOpen,
  GraduationCap,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Gamepad2,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { soundService } from '../../services/soundService';

interface TeacherProfilePageProps {
  onBack: () => void;
}

export const TeacherProfilePage: React.FC<TeacherProfilePageProps> = ({ onBack }) => {
  const { user, teacherProfile, teacherPreferences, updatePreferences } = useAuth();

  const [schoolName, setSchoolName] = useState<string>(
    teacherPreferences?.defaultSchoolName || 'Trường Tiểu học Chu Văn An'
  );
  const [className, setClassName] = useState<string>(
    teacherPreferences?.defaultClassName || '5A1'
  );
  const [subject, setSubject] = useState<string>(
    teacherPreferences?.defaultSubject || 'Tin học'
  );
  const [grade, setGrade] = useState<number | string>(
    teacherPreferences?.defaultGrade || 5
  );
  const [teamCount, setTeamCount] = useState<number>(
    teacherPreferences?.defaultTeamCount || 4
  );
  const [questionCount, setQuestionCount] = useState<number>(
    teacherPreferences?.defaultQuestionCount || 10
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state if preferences change
  useEffect(() => {
    if (teacherPreferences) {
      if (teacherPreferences.defaultSchoolName) setSchoolName(teacherPreferences.defaultSchoolName);
      if (teacherPreferences.defaultClassName) setClassName(teacherPreferences.defaultClassName);
      if (teacherPreferences.defaultSubject) setSubject(teacherPreferences.defaultSubject);
      if (teacherPreferences.defaultGrade) setGrade(teacherPreferences.defaultGrade);
      if (teacherPreferences.defaultTeamCount) setTeamCount(teacherPreferences.defaultTeamCount);
      if (teacherPreferences.defaultQuestionCount) setQuestionCount(teacherPreferences.defaultQuestionCount);
    }
  }, [teacherPreferences]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    soundService.playClick();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const success = await updatePreferences({
        defaultSchoolName: schoolName.trim(),
        defaultClassName: className.trim(),
        defaultSubject: subject.trim(),
        defaultGrade: grade,
        defaultTeamCount: Number(teamCount) || 4,
        defaultQuestionCount: Number(questionCount) || 10,
      });

      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setSaveError('Đã lưu cục bộ. Máy chủ Google Sheets sẽ tự động đồng bộ khi kết nối mạng ổn định.');
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Không thể lưu cài đặt.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = teacherProfile?.displayName || user?.displayName || 'Giáo viên';
  const email = teacherProfile?.email || user?.email || '';
  const photoUrl = teacherProfile?.photoURL || teacherProfile?.photoUrl || user?.photoURL;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top navigation back button */}
      <button
        onClick={() => {
          soundService.playClick();
          onBack();
        }}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-rose-600 mb-6 bg-white/80 hover:bg-white px-3.5 py-2 rounded-xl border border-rose-200 shadow-xs transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại trang chủ EDUPLAY</span>
      </button>

      {/* Main card */}
      <div className="bg-white rounded-3xl border border-rose-200/90 shadow-xl overflow-hidden">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 p-8 text-white relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white/50 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md ring-4 ring-white/40 flex items-center justify-center text-3xl font-black shadow-xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-2">
                <Shield className="w-3.5 h-3.5 text-amber-300" />
                <span>Tài khoản Giáo viên xác thực</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{displayName}</h1>
              <p className="text-rose-100 text-sm mt-1 flex items-center justify-center sm:justify-start gap-2">
                <Mail className="w-4 h-4" />
                <span>{email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Banners */}
        {saveSuccess && (
          <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Đã cập nhật thành công thông tin không gian cá nhân của bạn!</span>
          </div>
        )}

        {saveError && (
          <div className="m-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSavePreferences} className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <School className="w-5 h-5 text-rose-500" />
              <span>Cấu hình không gian giảng dạy mặc định</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Các thông số này sẽ tự động áp dụng khi bạn khởi tạo trò chơi, ngân hàng câu hỏi và cấp chứng nhận.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Email (Read-only as mandated by Rule 40) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email tài khoản Google (Chỉ đọc)
              </label>
              <input
                type="text"
                value={email}
                disabled
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium cursor-not-allowed select-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Email được bảo vệ bởi Google Firebase Authentication.
              </p>
            </div>

            {/* Teacher Display Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Họ và tên giáo viên
              </label>
              <input
                type="text"
                value={displayName}
                disabled
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tên hiển thị đồng bộ từ tài khoản Google của bạn.
              </p>
            </div>

            {/* School Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên trường học mặc định
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="VD: Trường Tiểu học Chu Văn An"
                required
                className="w-full px-4 py-2.5 bg-white border border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl text-xs text-slate-800 font-medium outline-hidden"
              />
            </div>

            {/* Default Class Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Lớp phụ trách mặc định
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="VD: 5A1"
                required
                className="w-full px-4 py-2.5 bg-white border border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl text-xs text-slate-800 font-medium outline-hidden"
              />
            </div>

            {/* Default Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Môn học giảng dạy
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="VD: Tin học, Toán học, Tiếng Anh..."
                required
                className="w-full px-4 py-2.5 bg-white border border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl text-xs text-slate-800 font-medium outline-hidden"
              />
            </div>

            {/* Default Grade */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Khối lớp giảng dạy
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value) || e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl text-xs text-slate-800 font-medium outline-hidden"
              >
                <option value={1}>Khối 1 (Tiểu học)</option>
                <option value={2}>Khối 2 (Tiểu học)</option>
                <option value={3}>Khối 3 (Tiểu học)</option>
                <option value={4}>Khối 4 (Tiểu học)</option>
                <option value={5}>Khối 5 (Tiểu học)</option>
                <option value={6}>Khối 6 (THCS)</option>
                <option value={7}>Khối 7 (THCS)</option>
                <option value={8}>Khối 8 (THCS)</option>
                <option value={9}>Khối 9 (THCS)</option>
              </select>
            </div>

            {/* Default Teams */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Số đội thi đấu mặc định
              </label>
              <select
                value={teamCount}
                onChange={(e) => setTeamCount(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl text-xs text-slate-800 font-medium outline-hidden"
              >
                <option value={2}>2 Đội (Đội Xanh & Đội Cam)</option>
                <option value={3}>3 Đội</option>
                <option value={4}>4 Đội (Chuẩn lớp học)</option>
                <option value={5}>5 Đội</option>
                <option value={6}>6 Đội</option>
              </select>
            </div>

            {/* Default Questions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Số câu hỏi mỗi trận đấu mặc định
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl text-xs text-slate-800 font-medium outline-hidden"
              >
                <option value={5}>5 câu (Nhanh - Khởi động)</option>
                <option value={10}>10 câu (Tiêu chuẩn)</option>
                <option value={15}>15 câu (Ôn tập sâu)</option>
                <option value={20}>20 câu (Thi đấu tổng kết)</option>
              </select>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onBack();
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black shadow-lg shadow-rose-500/25 cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu cài đặt không gian</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
