import React from 'react';
import {
  Gamepad2,
  BookOpen,
  HelpCircle,
  History,
  Calendar,
  Award,
  ArrowRight,
  Database,
  Upload,
  Play,
  CheckCircle2,
  Wifi,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { soundService } from '../../../services/soundService';
import { EDUPLAY_VERSION } from '../../../version';

export interface OverviewMetrics {
  totalGames: number;
  totalQuestionBanks: number;
  totalQuestions: number;
  totalSessionsPlayed: number;
  sessionsToday: number;
  totalCertificates: number;
  isCloudConnected: boolean;
  dataMode: 'local' | 'cloud';
}

interface AdminOverviewTabProps {
  metrics: OverviewMetrics;
  onNavigateTab: (tab: any) => void;
  onSelectGame: (gameId: string) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  metrics,
  onNavigateTab,
  onSelectGame,
}) => {
  return (
    <div className="space-y-6">
      {/* Cloud Status Alert Ribbon */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            metrics.dataMode === 'cloud'
              ? metrics.isCloudConnected
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-white tracking-wider">Hệ thống EDUPLAY:</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                metrics.dataMode === 'cloud'
                  ? metrics.isCloudConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              }`}>
                {metrics.dataMode === 'cloud'
                  ? (metrics.isCloudConnected ? '🟢 DATABASE CLOUD ĐÃ KẾT NỐI' : '🔴 CHƯA KẾT NỐI DATABASE')
                  : '💻 CHẾ ĐỘ CỤC BỘ (LOCAL MODE)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Phiên bản {EDUPLAY_VERSION} • Lưu trữ chuẩn 18 Schemas theo Đội • Không lưu dữ liệu sinh trắc học sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onNavigateTab('DATABASE');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Quản lý Database</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6 Core Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Số game */}
        <div
          onClick={() => {
            soundService.playClick();
            onNavigateTab('GAMES');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-2xl transition-all cursor-pointer group shadow-sm hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số trò chơi</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white group-hover:text-cyan-400 transition-colors">
            {metrics.totalGames}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">6 Game tương tác</p>
        </div>

        {/* Metric 2: Số bộ câu hỏi */}
        <div
          onClick={() => {
            soundService.playClick();
            onNavigateTab('QUESTION_BANKS');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 p-4 rounded-2xl transition-all cursor-pointer group shadow-sm hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bộ câu hỏi</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white group-hover:text-purple-400 transition-colors">
            {metrics.totalQuestionBanks}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Kho Question Banks</p>
        </div>

        {/* Metric 3: Tổng số câu hỏi */}
        <div
          onClick={() => {
            soundService.playClick();
            onNavigateTab('QUESTION_BANKS');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl transition-all cursor-pointer group shadow-sm hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng số câu</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">
            {metrics.totalQuestions}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Câu hỏi có sẵn</p>
        </div>

        {/* Metric 4: Số phiên đã chơi */}
        <div
          onClick={() => {
            soundService.playClick();
            onNavigateTab('SESSIONS');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl transition-all cursor-pointer group shadow-sm hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phiên đã chơi</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white group-hover:text-amber-400 transition-colors">
            {metrics.totalSessionsPlayed}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Tổng lịch sử trận</p>
        </div>

        {/* Metric 5: Số phiên hôm nay */}
        <div
          onClick={() => {
            soundService.playClick();
            onNavigateTab('SESSIONS');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 p-4 rounded-2xl transition-all cursor-pointer group shadow-sm hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phiên hôm nay</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white group-hover:text-rose-400 transition-colors">
            {metrics.sessionsToday}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Hoạt động trong ngày</p>
        </div>

        {/* Metric 6: Số giấy chứng nhận */}
        <div
          onClick={() => {
            soundService.playClick();
            onNavigateTab('CERTIFICATES');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-2xl transition-all cursor-pointer group shadow-sm hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chứng nhận</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">
            {metrics.totalCertificates}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Đã cấp cho đội</p>
        </div>
      </div>

      {/* Quick Launch & Common Workflow Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Quick Launch Games */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Play className="w-4 h-4 text-rose-500" />
              Khởi động trận đấu nhanh
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('GAMES')}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold"
            >
              Xem tất cả 6 game →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onSelectGame('cam-race')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-2xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white group-hover:text-cyan-400">CAM RACE</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">📷 2 Đội</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Giơ thẻ màu nhận diện webcam</p>
            </button>

            <button
              type="button"
              onClick={() => onSelectGame('smile-race')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-2xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white group-hover:text-purple-400">SMILE RACE</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">😁 2-4 Đội</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Đại chiến cử chỉ nụ cười</p>
            </button>

            <button
              type="button"
              onClick={() => onSelectGame('fastest-hand')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-2xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white group-hover:text-rose-400">FASTEST HAND</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">⏱️ 2-4 Đội</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Bấm chuông buzzer tốc độ cao</p>
            </button>

            <button
              type="button"
              onClick={() => onSelectGame('lucky-wheel')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-2xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white group-hover:text-emerald-400">LUCKY WHEEL</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">🎡 2-4 Đội</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Vòng quay hoạt náo may mắn</p>
            </button>
          </div>
        </div>

        {/* Quick Question Bank & Import Shortcuts */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Soạn đề & Nạp dữ liệu
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('QUESTION_BANKS')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
            >
              Vào kho câu hỏi →
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-white">Nhập câu hỏi từ CSV / Excel</p>
                <p className="text-[11px] text-slate-400">Hỗ trợ định dạng 18 cột chuẩn của EDUPLAY</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  onNavigateTab('IMPORT');
                }}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all"
              >
                Nạp file ngay
              </button>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-white">Sao lưu & Khôi phục toàn bộ</p>
                <p className="text-[11px] text-slate-400">Xuất file JSON an toàn hoặc đồng bộ Cloud</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  onNavigateTab('DATABASE');
                }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shrink-0 cursor-pointer transition-all"
              >
                Quản lý
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
