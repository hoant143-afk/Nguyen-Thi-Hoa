import React from 'react';
import { GraduationCap, Sparkles, Monitor, ShieldCheck } from 'lucide-react';

export const EduplayFooter: React.FC = () => {
  return (
    <footer className="border-t border-rose-200/80 bg-white/75 backdrop-blur-md px-4 py-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <p className="font-extrabold text-slate-800 text-sm">EDUPLAY – Nền tảng Trò chơi Tương tác Lớp học</p>
            <p className="text-[11px] text-slate-500">“Học vui – Chơi chất – Tương tác thật” • Phiên bản 2.0</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5 text-rose-500" /> Tối ưu Máy chiếu 16:9 & Smart TV
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Tương thích Webcam AI Computer Vision
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Không cần cài đặt (Chạy offline mượt mà)
          </span>
        </div>
      </div>
    </footer>
  );
};
