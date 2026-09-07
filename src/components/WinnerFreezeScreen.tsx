import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, CheckCircle, ArrowRight, Clock, Zap, Download, Maximize2, Camera } from 'lucide-react';
import { GameSession, TeamId, GameSettings } from '../types';
import { soundService } from '../services/soundService';

interface WinnerFreezeScreenProps {
  session: GameSession;
  winner: TeamId;
  snapshotUrl: string | null;
  reactionTimeMs: number | null;
  settings?: GameSettings;
  onProceedToQuestion?: () => void;
  onProceed?: () => void;
}

export const WinnerFreezeScreen: React.FC<WinnerFreezeScreenProps> = ({
  session,
  winner,
  snapshotUrl,
  reactionTimeMs,
  settings,
  onProceedToQuestion,
  onProceed,
}) => {
  const isBlue = winner === 'blue';
  const teamName = isBlue ? session.blueTeamName : session.orangeTeamName;
  const currentQ = session.currentQuestionIndex + 1;
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const handleProceed = onProceedToQuestion || onProceed || (() => {});

  useEffect(() => {
    // Auto-proceed after freezeDurationMs if not manually clicked
    const duration = settings?.freezeDurationMs ?? 5000;
    const timer = setTimeout(() => {
      handleProceed();
    }, Math.max(5000, duration + 1000));

    return () => clearTimeout(timer);
  }, [handleProceed, settings?.freezeDurationMs]);

  const handleDownloadSnapshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!snapshotUrl) return;
    soundService.playClick();
    const link = document.createElement('a');
    link.href = snapshotUrl;
    link.download = `cam-race-cau-${currentQ}-${teamName.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4 overflow-y-auto">
      {/* Background glow matching winner team */}
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${
          isBlue
            ? 'from-cyan-900/40 via-slate-950/90 to-slate-950'
            : 'from-orange-900/40 via-slate-950/90 to-slate-950'
        }`}
      />

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center space-y-4 py-4">
        {/* Flash Alert Banner */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-flex items-center gap-2 bg-red-600/90 text-white font-black text-xs md:text-sm uppercase tracking-widest px-6 py-1.5 rounded-full shadow-lg shadow-red-600/40 animate-pulse border border-red-400"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>🚨 ĐÃ PHÁT HIỆN THÍ SINH VỀ ĐÍCH CÂU {currentQ}!</span>
        </motion.div>

        {/* Main Grid: Card & Snapshot */}
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Winner Title Card */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`w-full p-6 rounded-3xl border-4 backdrop-blur-xl shadow-2xl md:col-span-7 flex flex-col justify-between text-left ${
              isBlue
                ? 'bg-gradient-to-b from-cyan-950/90 to-slate-950 border-cyan-400 shadow-cyan-500/30'
                : 'bg-gradient-to-b from-orange-950/90 to-slate-950 border-orange-400 shadow-orange-500/30'
            }`}
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{isBlue ? '🔵' : '🟠'}</span>
                <span className="text-xs md:text-sm uppercase font-black tracking-widest text-slate-300">
                  CHIẾN THẮNG TỐC ĐỘ
                </span>
              </div>

              <h2
                className={`text-3xl md:text-5xl font-black uppercase tracking-tight ${
                  isBlue ? 'text-cyan-300' : 'text-amber-300'
                }`}
              >
                {teamName}
              </h2>

              <p className="text-lg md:text-xl font-extrabold text-white uppercase tracking-wider mt-1">
                GIÀNH QUYỀN TRẢ LỜI CÂU {currentQ}!
              </p>
            </div>

            {/* Reaction time & Details */}
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-slate-800 text-xs md:text-sm font-semibold">
              {reactionTimeMs && (
                <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Tốc độ phản xạ:</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {(reactionTimeMs / 1000).toFixed(2)}s
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-emerald-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <CheckCircle className="w-4 h-4" />
                <span>Đã chốt quyền trả lời</span>
              </div>
            </div>
          </motion.div>

          {/* Captured Moment Snapshot Card */}
          {snapshotUrl ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="md:col-span-5 w-full bg-slate-900/90 border-2 border-slate-700 rounded-3xl p-3 shadow-2xl relative flex flex-col items-center"
            >
              <div className="w-full flex items-center justify-between px-2 pb-2 text-xs font-bold text-slate-300">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Camera className="w-4 h-4" />
                  <span>Ảnh Khoảnh Khắc Về Đích</span>
                </div>
                <button
                  onClick={handleDownloadSnapshot}
                  className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Tải ảnh khoảnh khắc"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Lưu ảnh</span>
                </button>
              </div>

              <div
                onClick={() => setIsZoomed(!isZoomed)}
                className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-700 shadow-inner relative group cursor-pointer"
              >
                <img
                  src={snapshotUrl}
                  alt="Winner Moment"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-slate-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5" /> Phóng to
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="md:col-span-5 w-full bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Camera className="w-8 h-8 mb-2 opacity-50" />
              <span>Camera không lưu ảnh</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => {
            soundService.playClick();
            handleProceed();
          }}
          className={`mt-2 px-10 py-4 rounded-2xl font-black text-lg text-white uppercase tracking-wider flex items-center gap-3 cursor-pointer shadow-xl transition-transform active:scale-95 ${
            isBlue
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-600/30'
              : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 shadow-orange-600/30'
          }`}
        >
          <span>HIỆN CÂU HỎI NGAY</span>
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Fullscreen Zoom Modal */}
      {isZoomed && snapshotUrl && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="max-w-4xl w-full bg-slate-950 border-2 border-cyan-500 rounded-3xl p-3 shadow-2xl relative">
            <img
              src={snapshotUrl}
              alt="Winner Moment Large"
              referrerPolicy="no-referrer"
              className="w-full h-auto rounded-2xl"
            />
            <div className="flex items-center justify-between mt-3 px-2">
              <span className="text-xs text-slate-300 font-bold">📸 Khoảnh khắc về đích câu {currentQ} - {teamName}</span>
              <button
                onClick={handleDownloadSnapshot}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Tải ảnh về máy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
