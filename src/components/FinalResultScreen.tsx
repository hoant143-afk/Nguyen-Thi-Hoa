import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Sparkles, RotateCcw, Home, FileText, Zap, CheckCircle2, Shield, Flame, Camera, Download, Maximize2 } from 'lucide-react';
import { GameSession, GameStats, RoundMoment } from '../types';
import { ScoringService } from '../services/scoringService';
import { soundService } from '../services/soundService';

interface FinalResultScreenProps {
  session: GameSession;
  onOpenCertificate: () => void;
  onRestartGame: () => void;
  onGoHome: () => void;
}

export const FinalResultScreen: React.FC<FinalResultScreenProps> = ({
  session,
  onOpenCertificate,
  onRestartGame,
  onGoHome,
}) => {
  const stats: GameStats = ScoringService.calculateStats(session);
  const moments: RoundMoment[] = session.moments || [];
  const [selectedZoomMoment, setSelectedZoomMoment] = useState<RoundMoment | null>(null);

  const isTie = session.blueScore === session.orangeScore;
  const isBlueWinner = session.blueScore > session.orangeScore;
  const winnerName = isTie ? 'HÒA' : isBlueWinner ? session.blueTeamName : session.orangeTeamName;
  const winnerScore = isBlueWinner ? session.blueScore : session.orangeScore;

  const handleDownloadMoment = (moment: RoundMoment, e: React.MouseEvent) => {
    e.stopPropagation();
    soundService.playClick();
    const link = document.createElement('a');
    link.href = moment.snapshotUrl;
    link.download = `cam-race-khoanh-khac-cau-${moment.questionIndex + 1}.jpg`;
    link.click();
  };

  useEffect(() => {
    soundService.playChampionFanfare();

    // Continuous celebration confetti cannons
    const duration = 4.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00E5FF', '#F59E0B', '#FFD700', '#3B82F6', '#FF6B00'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00E5FF', '#F59E0B', '#FFD700', '#3B82F6', '#FF6B00'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] space-y-8">
      {/* Top Banner */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/50 text-amber-300 px-5 py-1.5 rounded-full text-xs md:text-sm font-extrabold uppercase tracking-widest animate-pulse">
          <Sparkles className="w-4 h-4" />
          <span>🏆 GRAND FINAL • TỔNG KẾT ĐẠI CHIẾN TIN HỌC 5</span>
          <Sparkles className="w-4 h-4" />
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight drop-shadow-2xl">
          LỄ TRAO GIẢI VÔ ĐỊCH
        </h1>
      </motion.div>

      {/* Champion Podium Box */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-4xl bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-950 border-2 border-amber-400/60 rounded-3xl p-6 md:p-10 backdrop-blur-2xl shadow-[0_0_80px_rgba(245,158,11,0.2)] text-center relative overflow-hidden"
      >
        {/* Ambient golden lighting */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Golden Trophy Graphic */}
        <div className="relative z-10 flex flex-col items-center space-y-3">
          <motion.div
            animate={{ rotate: [0, -3, 3, 0], y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-1 shadow-[0_0_50px_rgba(251,191,36,0.6)] flex items-center justify-center"
          >
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <Trophy className="w-16 h-16 md:w-20 md:h-20 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
            </div>
          </motion.div>

          <span className="text-xs md:text-sm font-black tracking-widest text-amber-400 uppercase">
            CAM RACE CHAMPION
          </span>

          <h2
            className={`text-4xl md:text-6xl font-black uppercase tracking-tight drop-shadow-md ${
              isTie
                ? 'text-white'
                : isBlueWinner
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-yellow-400'
            }`}
          >
            {isTie ? 'TRẬN ĐẤU HÒA ĐIỂM!' : `👑 ${winnerName}`}
          </h2>

          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="bg-slate-900/90 border border-slate-700 px-6 py-2 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase font-bold block">Tổng điểm:</span>
              <span className="text-3xl font-black text-amber-400">{winnerScore} ĐIỂM</span>
            </div>
            {session.className && (
              <div className="bg-slate-900/90 border border-slate-700 px-6 py-2 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase font-bold block">Lớp:</span>
                <span className="text-3xl font-black text-cyan-300">{session.className}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Match Statistics Table */}
        <div className="mt-8 pt-8 border-t border-slate-800 relative z-10 text-left">
          <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider mb-4 text-center">
            BẢNG THỐNG KÊ CHI TIẾT TRẬN ĐẤU (15 CÂU)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blue Stats */}
            <div className="bg-gradient-to-b from-cyan-950/40 to-slate-950 border border-cyan-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <div className="flex items-center gap-2 text-cyan-300 font-extrabold">
                  <Shield className="w-4 h-4" />
                  <span>{session.blueTeamName}</span>
                </div>
                <span className="text-2xl font-black text-cyan-300">{session.blueScore} ĐIỂM</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Thắng Camera:</span>
                  <span className="font-bold text-sm text-cyan-300">{stats.blueWinsCamera} lần</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Trả lời đúng:</span>
                  <span className="font-bold text-sm text-emerald-400">{stats.blueCorrect} câu</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Cướp điểm thành công:</span>
                  <span className="font-bold text-sm text-amber-400">{stats.blueStealCorrect} lần</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Tỷ lệ chính xác:</span>
                  <span className="font-bold text-sm text-white">
                    {stats.blueTotalAttempts > 0
                      ? `${Math.round(((stats.blueCorrect + stats.blueStealCorrect) / stats.blueTotalAttempts) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Orange Stats */}
            <div className="bg-gradient-to-b from-orange-950/40 to-slate-950 border border-orange-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-orange-500/20 pb-2">
                <div className="flex items-center gap-2 text-amber-300 font-extrabold">
                  <Flame className="w-4 h-4" />
                  <span>{session.orangeTeamName}</span>
                </div>
                <span className="text-2xl font-black text-amber-300">{session.orangeScore} ĐIỂM</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Thắng Camera:</span>
                  <span className="font-bold text-sm text-amber-300">{stats.orangeWinsCamera} lần</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Trả lời đúng:</span>
                  <span className="font-bold text-sm text-emerald-400">{stats.orangeCorrect} câu</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Cướp điểm thành công:</span>
                  <span className="font-bold text-sm text-amber-400">{stats.orangeStealCorrect} lần</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Tỷ lệ chính xác:</span>
                  <span className="font-bold text-sm text-white">
                    {stats.orangeTotalAttempts > 0
                      ? `${Math.round(((stats.orangeCorrect + stats.orangeStealCorrect) / stats.orangeTotalAttempts) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BỘ SƯU TẬP KHOẢNH KHẮC THI ĐẤU (SNAPSHOT GALLERY) */}
        {moments.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-800 relative z-10 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm md:text-base font-black uppercase text-cyan-300 tracking-wider">
                  📸 BỘ SƯU TẬP KHOẢNH KHẮC VỀ ĐÍCH ({moments.length} ẢNH)
                </h3>
              </div>
              <span className="text-xs text-slate-400">Tự động lưu từ Webcam</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1 p-1">
              {moments.map((m, idx) => {
                const isB = m.winner === 'blue';
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedZoomMoment(m)}
                    className={`bg-slate-900/90 border rounded-2xl p-2 cursor-pointer transition-all hover:scale-105 group relative overflow-hidden ${
                      isB ? 'border-cyan-500/50 hover:border-cyan-400' : 'border-orange-500/50 hover:border-orange-400'
                    }`}
                  >
                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-950 relative mb-1.5">
                      <img
                        src={m.snapshotUrl}
                        alt={`Câu ${m.questionIndex + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                      <span className="absolute bottom-1 left-1 bg-slate-950/80 text-[9px] font-mono text-white px-1.5 py-0.5 rounded">
                        CÂU {m.questionIndex + 1}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-bold truncate ${isB ? 'text-cyan-300' : 'text-amber-300'}`}>
                        {isB ? '🔵' : '🟠'} {m.teamName}
                      </span>
                      {m.reactionTimeMs && (
                        <span className="font-mono text-slate-400 text-[10px]">
                          {(m.reactionTimeMs / 1000).toFixed(2)}s
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
          <button
            onClick={() => {
              soundService.playClick();
              onOpenCertificate();
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-base md:text-lg py-4 px-8 rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-3 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider"
          >
            <Award className="w-6 h-6" />
            <span>🏆 NHẬN GIẤY CHỨNG NHẬN</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              onRestartGame();
            }}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-2xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors text-sm md:text-base"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Đấu Lại Trận Mới</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              onGoHome();
            }}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 px-5 rounded-2xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors text-sm md:text-base"
          >
            <Home className="w-5 h-5" />
            <span>Về Trang Chủ</span>
          </button>
        </div>
      </motion.div>

      {/* Fullscreen Zoom Modal for Moment */}
      {selectedZoomMoment && (
        <div
          onClick={() => setSelectedZoomMoment(null)}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full bg-slate-950 border-2 border-cyan-500 rounded-3xl p-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <span className="text-xs text-cyan-400 font-black uppercase block">
                  CÂU {selectedZoomMoment.questionIndex + 1} • {selectedZoomMoment.teamName}
                </span>
                <p className="text-sm font-bold text-white line-clamp-1">{selectedZoomMoment.questionText}</p>
              </div>
              <button
                onClick={(e) => handleDownloadMoment(selectedZoomMoment, e)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-600/30"
              >
                <Download className="w-4 h-4" />
                <span>Tải ảnh về</span>
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-700 aspect-video bg-slate-900">
              <img
                src={selectedZoomMoment.snapshotUrl}
                alt="Moment Large"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
