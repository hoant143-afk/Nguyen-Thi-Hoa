import React, { useState } from 'react';
import { Settings, Users, School, UserCheck, Palette, Save, CheckCircle2, ShieldCheck } from 'lucide-react';
import { soundService } from '../../../services/soundService';
import { EduplayStorage } from '../../../services/eduplayStorage';
import { TeamPreset, TeamCount } from '../../../types';

interface AdminSettingsTabProps {
  onSettingsSaved: () => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({ onSettingsSaved }) => {
  const [schoolName, setSchoolName] = useState<string>(() =>
    EduplayStorage.getGameData<string>('eduplay_school_name', 'TRƯỜNG TIỂU HỌC CHU VĂN AN')
  );
  const [className, setClassName] = useState<string>(() =>
    EduplayStorage.getGameData<string>('eduplay_class_name', '5A1')
  );
  const [teacherName, setTeacherName] = useState<string>(() =>
    EduplayStorage.getGameData<string>('eduplay_teacher_name', 'Thầy Hoàng')
  );
  const [defaultTeamCount, setDefaultTeamCount] = useState<TeamCount>(() => {
    const count = EduplayStorage.getGameData<number>('eduplay_default_team_count', 4);
    return (count === 2 || count === 3 || count === 4) ? (count as TeamCount) : 4;
  });

  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSave = () => {
    soundService.playClick();
    EduplayStorage.saveGameData('eduplay_school_name', schoolName.trim());
    EduplayStorage.saveGameData('eduplay_class_name', className.trim());
    EduplayStorage.saveGameData('eduplay_teacher_name', teacherName.trim());
    EduplayStorage.saveGameData('eduplay_default_team_count', defaultTeamCount);

    setSavedMsg('Đã lưu cấu hình thành công!');
    setTimeout(() => setSavedMsg(null), 3000);
    onSettingsSaved();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            CÀI ĐẶT LỚP HỌC & ĐỘI THI ĐẤU
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cấu hình thông tin trường, lớp và số lượng đội mặc định áp dụng khi bắt đầu các trò chơi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>LƯU CÀI ĐẶT</span>
        </button>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* School & Class Info */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <School className="w-4 h-4 text-cyan-400" />
            Thông Tin Lớp & Trường
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Tên Trường Học:</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Ví dụ: Trường Tiểu học Chu Văn An"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Lớp Học Mặc Định:</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Ví dụ: 5A1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Giáo Viên Phụ Trách:</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Ví dụ: Thầy Hoàng"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Team Configuration */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            Cấu Hình Đội Mặc Định
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Số đội mặc định khi bắt đầu game:</label>
              <div className="grid grid-cols-3 gap-2">
                {([2, 3, 4] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      setDefaultTeamCount(cnt);
                    }}
                    className={`py-2.5 rounded-xl border text-center font-black transition-all cursor-pointer ${
                      defaultTeamCount === cnt
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {cnt} ĐỘI
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-400 space-y-1">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Nguyên tắc quản lý Đội:
              </span>
              <p>EDUPLAY chỉ lưu danh sách và điểm số của từng Đội. Không thu thập hay định danh học sinh cá nhân.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
