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
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo & Slogan */}
        <div
          onClick={() => {
            soundService.playClick();
            onNavigate('/');
          }}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-300">
                EDUPLAY
              </span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 tracking-wider">
                Lớp học 4.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              “Học vui – Chơi chất – Tương tác thật”
            </p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => {
              soundService.playClick();
              onNavigate('/');
            }}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              currentRoute === '/'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Trang chủ
          </button>
          <button
            onClick={() => {
              soundService.playClick();
              onNavigate('/#games');
            }}
            className="px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Kho trò chơi</span>
          </button>
          <button
            onClick={() => {
              soundService.playClick();
              onOpenTeacherDashboard();
            }}
            className="px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
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
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? 'border-slate-800 bg-slate-900/60 text-slate-500'
                : 'border-slate-700 bg-slate-900 text-cyan-400 hover:border-cyan-500/50'
            }`}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle for classroom projectors */}
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 hover:border-blue-500/50 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Toàn màn hình máy chiếu (16:9)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Teacher dashboard quick button */}
          <button
            onClick={() => {
              soundService.playClick();
              onOpenTeacherDashboard();
            }}
            className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 cursor-pointer transition-transform active:scale-95"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Bảng điều khiển GV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
