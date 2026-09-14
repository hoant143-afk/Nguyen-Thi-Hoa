import React from 'react';
import { GraduationCap, Sparkles, Monitor, ShieldCheck, Database } from 'lucide-react';
import { EDUPLAY_VERSION } from '../../version';
import { apiClient } from '../../services/apiClient';

export const EduplayFooter: React.FC = () => {
  const mode = apiClient.getMode();
  return (
    <footer className="border-t border-rose-200/80 bg-white/75 backdrop-blur-md px-4 py-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <p className="font-extrabold text-slate-800 text-sm">EDUPLAY – Hệ Thống Trò Chơi Tương Tác Lớp Học</p>
            <p className="text-[11px] text-slate-500">
              “Học vui – Chơi chất – Tương tác thật” • Phiên bản {EDUPLAY_VERSION} •{' '}
              <span className="font-semibold text-slate-700">
                {mode === 'cloud' ? '☁️ Cloud Google Sheets' : '💻 Chế độ Local'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5 text-rose-500" /> Tối ưu Máy chiếu 16:9 & Smart TV
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Webcam Computer Vision
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Bảo mật thông tin học sinh (Team-First)
          </span>
        </div>
      </div>
    </footer>
  );
};
