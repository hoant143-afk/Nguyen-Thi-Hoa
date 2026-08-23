import React from 'react';
import { motion } from 'motion/react';
import { Play, Sparkles, HelpCircle, Shield, Flame, Home } from 'lucide-react';
import { GameSession, GameSettings } from '../types';
import { soundService } from '../services/soundService';

interface ReadyScreenProps {
  session: GameSession;
  settings: GameSettings;
  onStartCountdown: () => void;
  onGoHome?: () => void;
}

export const ReadyScreen: React.FC<ReadyScreenProps> = ({
  session,
  settings: _settings,
  onStartCountdown,
  onGoHome,
}) => {
  const currentQNum = session.currentQuestionIndex + 1;
  const currentQ = session.questions[session.currentQuestionIndex];
  const points = currentQ?.isSpecial ? 20 : currentQ?.normalPoints || 10;

  if (!currentQ) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full bg-slate-900/90 border-2 border-cyan-500/40 rounded-3xl p-6 md:p-10 backdrop-blur-xl shadow-2xl text-center space-y-6 relative overflow-hidden"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Question Counter Badge */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs md:text-sm font-black uppercase tracking-widest text-cyan-400 bg-cyan-950 border border-cyan-500/40 px-4 py-1 rounded-full">
            CÂU HỎI {currentQNum} / {session.questions.length}
          </span>

          {currentQ.isSpecial && (
            <span className="text-xs md:text-sm font-black uppercase tracking-widest text-amber-300 bg-amber-950 border border-amber-400/50 px-4 py-1 rounded-full flex items-center gap-1.5 animate-bounce">
              <Sparkles className="w-4 h-4" />
              🌟 CÂU ĐẶC BIỆT (+20 ĐIỂM)
            </span>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
            SẴN SÀNG TRANH QUYỀN CAMERA!
          </h2>
          <p className="text-sm md:text-base text-slate-300 font-medium">
            Chủ đề: <strong className="text-cyan-400">{currentQ.category || 'Tin học lớp 5'}</strong> • Điểm thưởng: <strong className="text-emerald-400">+{points} điểm</strong>
          </p>
        </div>

        {/* Teams Ready Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="bg-gradient-to-b from-cyan-950/60 to-slate-950 border-2 border-cyan-500/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="text-xs text-cyan-400/80 font-mono block">ĐỘI XANH</span>
              <h4 className="font-extrabold text-base text-cyan-200 uppercase">{session.blueTeamName}</h4>
              <span className="text-xs text-slate-400">Điểm: {session.blueScore}</span>
            </div>
          </div>

          <div className="bg-gradient-to-b from-orange-950/60 to-slate-950 border-2 border-orange-500/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400 flex items-center justify-center text-amber-300 shrink-0">
              <Flame className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="text-xs text-amber-400/80 font-mono block">ĐỘI CAM</span>
              <h4 className="font-extrabold text-base text-amber-200 uppercase">{session.orangeTeamName}</h4>
              <span className="text-xs text-slate-400">Điểm: {session.orangeScore}</span>
            </div>
          </div>
        </div>

        {/* Instruction Reminder */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-xs md:text-sm text-slate-300 text-left space-y-1">
          <div className="font-bold text-white flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Hướng dẫn câu {currentQNum}:</span>
          </div>
          <p className="text-slate-400">
            Khi bấm nút bắt đầu, hệ thống đếm ngược <strong className="text-cyan-400">3 - 2 - 1 - RUNNN!</strong> Thí sinh 2 đội chạy nhanh lên giơ thẻ màu đội trước ngực vào camera. Đội tới trước sẽ được ưu tiên trả lời câu hỏi!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onGoHome && (
            <button
              onClick={() => {
                soundService.playClick();
                onGoHome();
              }}
              className="w-full sm:w-auto bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-base py-4 px-6 rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <Home className="w-5 h-5 text-slate-400" />
              <span>Về trang chủ</span>
            </button>
          )}

          <button
            onClick={() => {
              soundService.playClick();
              onStartCountdown();
            }}
            className="w-full sm:w-auto flex-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-lg md:text-xl py-4 px-10 rounded-2xl shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-3 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>🚀 BẮT ĐẦU CÂU {currentQNum}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
