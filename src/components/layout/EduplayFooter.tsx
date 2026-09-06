import React from 'react';
import { GraduationCap, Sparkles, Monitor, ShieldCheck } from 'lucide-react';

export const EduplayFooter: React.FC = () => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <p className="font-extrabold text-white text-sm">EDUPLAY – Nền tảng Trò chơi Tương tác Lớp học</p>
            <p className="text-[11px] text-slate-500">“Học vui – Chơi chất – Tương tác thật” • Phiên bản 2.0</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5 text-cyan-400" /> Tối ưu Máy chiếu 16:9 & Smart TV
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Tương thích Webcam AI Computer Vision
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Không cần cài đặt (Chạy offline mượt mà)
          </span>
        </div>
      </div>
    </footer>
  );
};
