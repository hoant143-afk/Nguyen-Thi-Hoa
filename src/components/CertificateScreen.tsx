import React, { useState, useRef } from 'react';
import { Printer, Download, ArrowLeft, Trophy, Sparkles, Check, Edit3, Shield, Palette, Home } from 'lucide-react';
import { GameSession, CertificateConfig } from '../types';
import { soundService } from '../services/soundService';

interface CertificateScreenProps {
  session: GameSession;
  onBack: () => void;
  onGoHome?: () => void;
}

export const CertificateScreen: React.FC<CertificateScreenProps> = ({ session, onBack, onGoHome }) => {
  const isBlueWinner = session.blueScore >= session.orangeScore;
  const winnerTeamName = isBlueWinner ? session.blueTeamName : session.orangeTeamName;
  const winnerScore = isBlueWinner ? session.blueScore : session.orangeScore;

  const [config, setConfig] = useState<CertificateConfig>({
    schoolName: session.schoolName || 'TRƯỜNG TIỂU HỌC CHU VĂN AN',
    className: session.className || '5A1',
    teacherName: session.teacherName || 'Thầy Hoàng',
    title: 'GIẤY CHỨNG NHẬN VÔ ĐỊCH',
    recipientTeamName: winnerTeamName,
    awardTitle: 'QUÁN QUÂN',
    customMessage: 'Đã xuất sắc thể hiện tốc độ, phản xạ công nghệ và kiến thức Tin học vượt trội',
    themeColor: 'gold',
    showSeal: true,
    dateStr: new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const certificateRef = useRef<HTMLDivElement | null>(null);

  const handlePrint = () => {
    soundService.playClick();
    window.print();
  };

  const getThemeClasses = () => {
    switch (config.themeColor) {
      case 'cyan':
        return {
          border: 'border-cyan-500',
          innerBorder: 'border-cyan-300',
          bgGradient: 'from-cyan-950/20 via-slate-900 to-slate-950',
          textAccent: 'text-cyan-400',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
          sealColor: 'text-cyan-400 border-cyan-400',
        };
      case 'amber':
        return {
          border: 'border-amber-600',
          innerBorder: 'border-orange-400',
          bgGradient: 'from-orange-950/20 via-slate-900 to-slate-950',
          textAccent: 'text-amber-400',
          badgeBg: 'bg-orange-500/20 text-amber-300 border-orange-400/50',
          sealColor: 'text-amber-400 border-amber-400',
        };
      case 'royal':
        return {
          border: 'border-indigo-500',
          innerBorder: 'border-purple-300',
          bgGradient: 'from-indigo-950/20 via-slate-900 to-slate-950',
          textAccent: 'text-indigo-400',
          badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50',
          sealColor: 'text-indigo-400 border-indigo-400',
        };
      case 'gold':
      default:
        return {
          border: 'border-yellow-500',
          innerBorder: 'border-amber-300',
          bgGradient: 'from-yellow-950/20 via-slate-900 to-slate-950',
          textAccent: 'text-yellow-400',
          badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50',
          sealColor: 'text-yellow-400 border-yellow-400',
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Top Toolbar (Hidden on print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl mb-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundService.playClick();
              onBack();
            }}
            className="flex items-center gap-2 text-slate-300 hover:text-white font-bold text-sm bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại kết quả</span>
          </button>

          {onGoHome && (
            <button
              onClick={() => {
                soundService.playClick();
                onGoHome();
              }}
              className="flex items-center gap-2 text-slate-300 hover:text-cyan-300 font-bold text-sm bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-colors"
            >
              <Home className="w-4 h-4 text-cyan-400" />
              <span>Về trang chủ</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Màu:</span>
            {(['gold', 'cyan', 'amber', 'royal'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setConfig({ ...config, themeColor: t })}
                className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] transition-all ${
                  config.themeColor === t
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3.5 py-2 rounded-xl border border-cyan-500/30 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Đóng chỉnh sửa' : 'Tùy chỉnh thông tin'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs md:text-sm px-5 py-2 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider"
          >
            <Printer className="w-4 h-4" />
            <span>🖨 In Giấy Chứng Nhận (A4)</span>
          </button>
        </div>
      </div>

      {/* Editor drawer (Hidden on print) */}
      {isEditing && (
        <div className="print:hidden bg-slate-900/95 border border-slate-800 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Tên Trường:</label>
            <input
              type="text"
              value={config.schoolName}
              onChange={(e) => setConfig({ ...config, schoolName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Tên Giáo Viên:</label>
            <input
              type="text"
              value={config.teacherName}
              onChange={(e) => setConfig({ ...config, teacherName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Lớp:</label>
            <input
              type="text"
              value={config.className}
              onChange={(e) => setConfig({ ...config, className: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Ngày trao giải:</label>
            <input
              type="text"
              value={config.dateStr}
              onChange={(e) => setConfig({ ...config, dateStr: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-bold text-slate-400 mb-1">Lời chúc / Lời khen:</label>
            <input
              type="text"
              value={config.customMessage}
              onChange={(e) => setConfig({ ...config, customMessage: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* A4 Landscape Printable Certificate Container */}
      <div className="flex justify-center print:m-0 print:p-0">
        <div
          ref={certificateRef}
          id="printable-certificate"
          className={`w-full max-w-[960px] aspect-[297/210] bg-slate-950 text-white rounded-3xl p-8 md:p-12 relative border-8 ${theme.border} shadow-2xl overflow-hidden print:w-[100vw] print:h-[100vh] print:max-w-none print:aspect-auto print:border-8 print:rounded-none print:shadow-none`}
        >
          {/* Inner Golden Border */}
          <div className={`w-full h-full border-2 ${theme.innerBorder} border-dashed rounded-2xl p-6 md:p-8 flex flex-col justify-between items-center text-center relative z-10 bg-gradient-to-b ${theme.bgGradient}`}>
            
            {/* Top School & Contest Header */}
            <div className="space-y-1">
              <p className="text-xs md:text-sm uppercase tracking-widest font-black text-slate-400 font-sans">
                {config.schoolName}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-amber-400/50" />
                <h3 className="text-sm md:text-base font-extrabold uppercase tracking-wider text-amber-300">
                  CUỘC THI: “CAM RACE – ĐẠI CHIẾN TIN HỌC 5”
                </h3>
                <span className="h-px w-8 bg-amber-400/50" />
              </div>
            </div>

            {/* Certificate Title */}
            <div className="space-y-2 my-2">
              <h1 className={`text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight ${theme.textAccent} font-serif drop-shadow-md`}>
                GIẤY CHỨNG NHẬN
              </h1>
              <p className="text-xs md:text-sm font-semibold uppercase tracking-widest text-slate-300">
                CHỨNG NHẬN ĐỘI DỰ THI
              </p>
            </div>

            {/* Winner Team Name & Moment Photo */}
            <div className="my-1 flex items-center justify-center gap-4">
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-lg underline decoration-amber-400/60 decoration-4 underline-offset-8">
                {winnerTeamName}
              </h2>
            </div>

            {/* Optional Snapshot Photo Thumbnail */}
            {(session.winnerSnapshotUrl || (session.moments && session.moments.length > 0)) && (
              <div className="my-1 flex items-center justify-center">
                <div className="relative border-2 border-amber-400/80 rounded-xl overflow-hidden shadow-lg h-16 md:h-20 aspect-video bg-slate-900">
                  <img
                    src={session.winnerSnapshotUrl || session.moments![session.moments!.length - 1].snapshotUrl}
                    alt="Winning Moment"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0.5 right-1 text-[8px] bg-slate-950/80 text-amber-300 font-mono px-1 rounded">
                    📸 Snapshot Về Đích
                  </span>
                </div>
              </div>
            )}

            {/* Title & Honor Details */}
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/50 px-5 py-1 rounded-full text-xs md:text-sm font-black text-amber-300 uppercase tracking-wider">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>🏆 CAM RACE CHAMPION – QUÁN QUÂN TIN HỌC 5</span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 italic font-medium leading-relaxed">
                {config.customMessage}
              </p>
            </div>

            {/* Match Stats Line */}
            <div className="flex items-center justify-center gap-6 text-xs md:text-sm text-slate-200 font-bold border-y border-slate-800 py-2 w-full max-w-xl">
              <span>Tổng điểm: <strong className="text-amber-400 font-black">{winnerScore} ĐIỂM</strong></span>
              <span>•</span>
              <span>Lớp: <strong className="text-cyan-300">{config.className}</strong></span>
              <span>•</span>
              <span>Ngày: <strong className="text-white">{config.dateStr}</strong></span>
            </div>

            {/* Signatures & Seal Area */}
            <div className="w-full flex items-end justify-between px-4 pt-2">
              {/* Left: Class Rep / Team */}
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-400 uppercase font-bold">ĐẠI DIỆN ĐỘI THI</p>
                <div className="h-10 flex items-center justify-center">
                  <span className="font-serif italic text-sm text-slate-400">Đội {winnerTeamName}</span>
                </div>
                <p className="text-xs font-bold text-white uppercase">Học sinh lớp {config.className}</p>
              </div>

              {/* Center: Official Seal */}
              {config.showSeal && (
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-dashed ${theme.sealColor} flex flex-col items-center justify-center shadow-lg p-1`}>
                    <Shield className="w-5 h-5 text-amber-400" />
                    <span className="text-[8px] font-black uppercase tracking-tighter text-amber-300">
                      OFFICIAL SEAL
                    </span>
                    <span className="text-[7px] font-bold text-slate-300">CAM RACE 5</span>
                  </div>
                </div>
              )}

              {/* Right: Teacher Signature */}
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-400 uppercase font-bold">GIÁO VIÊN BỘ MÔN</p>
                <div className="h-10 flex items-center justify-center">
                  <span className="font-serif italic text-base text-amber-300">{config.teacherName}</span>
                </div>
                <p className="text-xs font-bold text-white uppercase">{config.teacherName}</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
