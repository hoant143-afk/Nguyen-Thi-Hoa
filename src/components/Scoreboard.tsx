import React, { useState } from 'react';
import { Volume2, VolumeX, Settings, Camera, Trophy, Sparkles, Home, AlertCircle, LogOut } from 'lucide-react';
import { GameSession, GameSettings } from '../types';
import { soundService } from '../services/soundService';

interface ScoreboardProps {
  session: GameSession;
  settings: GameSettings;
  onOpenAdmin: () => void;
  onOpenCalibration: () => void;
  onSoundToggle: () => void;
  onGoHome: () => void;
  isSoundMuted: boolean;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  session,
  settings: _settings,
  onOpenAdmin,
  onOpenCalibration,
  onSoundToggle,
  onGoHome,
  isSoundMuted,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const currentQNum = Math.min(session.currentQuestionIndex + 1, session.questions.length);
  const totalQ = session.questions.length;
  const currentQ = session.questions[session.currentQuestionIndex];

  const handleConfirmExit = () => {
    soundService.playClick();
    setShowExitConfirm(false);
    onGoHome();
  };

  return (
    <>
      <header className="w-full bg-slate-950/90 border-b border-cyan-900/40 backdrop-blur-md px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-2 shadow-2xl relative z-40">
        {/* Left: Blue Team Score */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-950/80 to-blue-950/40 border border-cyan-500/40 rounded-xl px-4 py-2 shadow-lg shadow-cyan-500/10 min-w-[200px]">
            <div className="w-4 h-4 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-400" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">
                {session.blueTeamName || 'BLUE TECH'}
              </span>
              <span className="text-xs text-cyan-400/70">Đội Xanh</span>
            </div>
            <div className="ml-auto text-3xl font-black text-cyan-300 tabular-nums tracking-tight">
              {session.blueScore}
            </div>
          </div>

          {/* Mobile Question indicator */}
          <div className="md:hidden flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-bold text-slate-300">
            <span>CÂU</span>
            <span className="text-cyan-400 font-extrabold">{currentQNum}</span>
            <span>/{totalQ}</span>
          </div>
        </div>

        {/* Center: Match Progress & Category */}
        <div className="hidden md:flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-widest font-extrabold uppercase text-slate-400">
              CAM RACE – ĐẠI CHIẾN TIN HỌC 5
            </span>
            {session.className && (
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-medium">
                Lớp {session.className}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-cyan-500/30 px-3 py-1 rounded-full shadow-inner">
              <span className="text-xs font-medium text-slate-400">CÂU HỎI:</span>
              <span className="text-base font-black text-cyan-400 tabular-nums">{currentQNum}</span>
              <span className="text-xs text-slate-500 font-bold">/ {totalQ}</span>
            </div>

            {currentQ?.isSpecial && (
              <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full animate-bounce">
                <Sparkles className="w-3.5 h-3.5" />
                <span>CÂU ĐẶC BIỆT +20</span>
              </div>
            )}

            {currentQ?.category && (
              <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60 max-w-[220px] truncate">
                {currentQ.category}
              </span>
            )}
          </div>
        </div>

        {/* Right: Orange Team Score & Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-3 bg-gradient-to-l from-orange-950/80 to-amber-950/40 border border-orange-500/40 rounded-xl px-4 py-2 shadow-lg shadow-orange-500/10 min-w-[200px]">
            <div className="text-3xl font-black text-amber-400 tabular-nums tracking-tight mr-auto">
              {session.orangeScore}
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold tracking-wider text-amber-300 uppercase">
                {session.orangeTeamName || 'ORANGE CODE'}
              </span>
              <span className="text-xs text-amber-400/70">Đội Cam</span>
            </div>
            <div className="w-4 h-4 rounded-full bg-orange-400 animate-pulse shadow-md shadow-orange-400" />
          </div>

          {/* Global Toolbar Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {/* Nút Quay về trang chủ */}
            <button
              onClick={() => {
                soundService.playClick();
                setShowExitConfirm(true);
              }}
              title="Quay về trang chủ"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-rose-950/70 hover:border-rose-500/50 border border-slate-700 transition-all font-bold text-xs shadow"
            >
              <Home className="w-4 h-4 text-cyan-400 group-hover:text-rose-400" />
              <span className="hidden sm:inline">Trang chủ</span>
            </button>

            <button
              onClick={() => {
                soundService.playClick();
                onSoundToggle();
              }}
              title={isSoundMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              onClick={() => {
                soundService.playClick();
                onOpenCalibration();
              }}
              title="Kiểm tra & Hiệu chỉnh Camera"
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                soundService.playClick();
                onOpenAdmin();
              }}
              title="Quản trị câu hỏi & Cài đặt"
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Modal Xác nhận Quay về trang chủ */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 mx-auto">
              <Home className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase">Quay về trang chủ?</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Tiến trình trận đấu hiện tại (điểm số, câu hỏi đã hoàn thành) sẽ được <strong>tự động lưu</strong>. Bạn có thể bấm <strong>"Tiếp tục trận đấu đã lưu"</strong> bất kỳ lúc nào từ màn hình chính!
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  soundService.playClick();
                  setShowExitConfirm(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition-colors cursor-pointer"
              >
                Tiếp tục chơi
              </button>

              <button
                onClick={handleConfirmExit}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer uppercase flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Về trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
