import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Gamepad2,
  Users,
  BookOpen,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { soundService } from '../../services/soundService';
import { CloudSyncStatus } from '../common/CloudSyncStatus';

interface EduplayHeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenTeacherDashboard: () => void;
}

export const EduplayHeader: React.FC<EduplayHeaderProps> = ({
  currentRoute,
  onNavigate,
  onOpenTeacherDashboard,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(soundService.getMuted());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundService.setMuted(next);
    if (!next) soundService.playClick();
  };

  const toggleFullscreen = () => {
    soundService.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-rose-200/80 px-4 lg:px-8 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo & Slogan */}
        <div
          onClick={() => {
            soundService.playClick();
            onNavigate('/');
          }}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600">
                EDUPLAY
              </span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 tracking-wider">
                Lớp học 4.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              “Học vui – Chơi chất – Tương tác thật”
            </p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="hidden md:flex items-center gap-1 bg-rose-50/80 border border-rose-200/90 p-1 rounded-2xl text-xs font-bold shadow-xs">
          <button
            onClick={() => {
              soundService.playClick();
              onNavigate('/');
            }}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              currentRoute === '/'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black shadow-md shadow-rose-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            Trang chủ
          </button>
          <button
            onClick={() => {
              soundService.playClick();
              onNavigate('/#games');
            }}
            className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Kho trò chơi</span>
          </button>
          <button
            onClick={() => {
              soundService.playClick();
              onOpenTeacherDashboard();
            }}
            className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <span>Dành cho Giáo viên</span>
          </button>
        </nav>

        {/* Right utility toolbar */}
        <div className="flex items-center gap-2">
          {/* Cloud Database Sync Status Pill */}
          <CloudSyncStatus />

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              isMuted
                ? 'border-rose-200 bg-rose-50/70 text-slate-400'
                : 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
            }`}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle for classroom projectors */}
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title="Toàn màn hình máy chiếu (16:9)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-rose-600" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Teacher dashboard quick button */}
          <button
            onClick={() => {
              soundService.playClick();
              onOpenTeacherDashboard();
            }}
            className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-lg shadow-rose-500/20 cursor-pointer transition-transform active:scale-95"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Bảng điều khiển GV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
