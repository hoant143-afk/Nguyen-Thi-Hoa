import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Camera,
  Settings,
  Sparkles,
  Trophy,
  Flame,
  Shield,
  HelpCircle,
  Video,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Layers,
  GraduationCap,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { GameSession, GameSettings, QuestionBankLesson } from '../types';
import { useCamera } from '../hooks/useCamera';
import { analyzeVideoFrame } from '../utils/colorDetection';
import { soundService } from '../services/soundService';
import { QuestionBankRepository } from '../repositories/questionBankRepository';
import { QuestionBankSelector } from './common/QuestionBankSelector';

interface HomeScreenProps {
  initialSession: GameSession | null;
  savedSession: GameSession | null;
  onStartNewGame: (formData: {
    blueTeamName: string;
    orangeTeamName: string;
    className: string;
    teacherName: string;
    schoolName: string;
    selectedLesson?: QuestionBankLesson;
  }) => void;
  onResumeGame: () => void;
  onOpenCalibration: () => void;
  onOpenAdmin: () => void;
  settings: GameSettings;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  initialSession,
  savedSession,
  onStartNewGame,
  onResumeGame,
  onOpenCalibration,
  onOpenAdmin,
  settings,
}) => {
  const [selectedLesson, setSelectedLesson] = useState<QuestionBankLesson>(() => {
    return QuestionBankRepository.getSelectedLesson();
  });
  const [showBankModal, setShowBankModal] = useState<boolean>(false);
  const [blueTeamName, setBlueTeamName] = useState<string>(initialSession?.blueTeamName || 'BLUE TECH');
  const [orangeTeamName, setOrangeTeamName] = useState<string>(initialSession?.orangeTeamName || 'ORANGE CODE');
  const [className, setClassName] = useState<string>(initialSession?.className || '5A1');
  const [teacherName, setTeacherName] = useState<string>(initialSession?.teacherName || 'Thầy Hoàng');
  const [schoolName, setSchoolName] = useState<string>(initialSession?.schoolName || 'Trường Tiểu học Chu Văn An');
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  // Auto-start camera immediately so webcam opens right on the home page!
  const {
    videoRef,
    isStreaming,
    error: cameraError,
    devices,
    selectedDeviceId,
    startCamera,
    switchCamera,
  } = useCamera(true);

  // Live detection scores on home screen for testing
  const [blueScore, setBlueScore] = useState<number>(0);
  const [orangeScore, setOrangeScore] = useState<number>(0);
  const [hasPerson, setHasPerson] = useState<boolean>(false);
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    let blueStable = 0;
    let orangeStable = 0;

    const runLiveTest = () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && isStreaming) {
        if (!testCanvasRef.current) {
          testCanvasRef.current = document.createElement('canvas');
        }
        const { result, updatedBlueStable, updatedOrangeStable } = analyzeVideoFrame(
          videoRef.current,
          testCanvasRef.current,
          settings,
          blueStable,
          orangeStable
        );
        blueStable = updatedBlueStable;
        orangeStable = updatedOrangeStable;

        setBlueScore(result.blueScore);
        setOrangeScore(result.orangeScore);
        setHasPerson(result.hasPerson);
      }
      animId = requestAnimationFrame(runLiveTest);
    };

    if (isStreaming) {
      animId = requestAnimationFrame(runLiveTest);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isStreaming, settings, videoRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundService.playClick();
    onStartNewGame({
      blueTeamName: blueTeamName.trim() || 'BLUE TECH',
      orangeTeamName: orangeTeamName.trim() || 'ORANGE CODE',
      className: className.trim() || `${selectedLesson.grade}A1`,
      teacherName: teacherName.trim() || 'Giáo viên',
      schoolName: schoolName.trim() || 'Trường Tiểu học',
      selectedLesson,
    });
  };

  const hasResumeOption = savedSession && savedSession.state !== 'FINAL_RESULT' && savedSession.state !== 'CERTIFICATE';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
      {/* Title & Badge */}
      <div className="text-center mb-4 space-y-2">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-amber-950/80 border border-cyan-500/40 rounded-full px-5 py-1 shadow-lg shadow-cyan-500/10">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs md:text-sm font-extrabold tracking-widest text-cyan-300 uppercase">
            GAME SHOW ĐẤU TRÍ CÔNG NGHỆ 4.0
          </span>
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
        </div>

        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase drop-shadow-2xl">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
            CAM RACE
          </span>
        </h1>

        <p className="text-slate-300 text-xs md:text-sm max-w-2xl mx-auto font-medium">
          Camera tự động mở & nhận diện thẻ màu • Chạy đua khóa quyền • Trả lời 15 câu hỏi Tin học 5
        </p>
      </div>

      {/* Main Container */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-7 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Glow ambient lights */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* LIVE CAMERA PREVIEW & INSTANT DETECTION TESTER */}
        <div className="mb-6 bg-slate-950/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Video className="w-4 h-4 text-cyan-400" />
                <span>📷 TRẠNG THÁI WEBCAM & TEST THẺ MÀU TRỰC TIẾP</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {isStreaming ? (
                <span className="text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Camera Đang Hoạt Động</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Bật Lại Camera</span>
                </button>
              )}

              {devices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => switchCamera(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none"
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Live Video Box */}
            <div className="md:col-span-6 relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-700 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${!isStreaming ? 'hidden' : ''}`}
              />

              {!isStreaming && (
                <div className="p-4 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-300">
                    {cameraError || 'Đang kết nối camera máy tính...'}
                  </p>
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                  >
                    Cấp Quyền & Bật Cam
                  </button>
                </div>
              )}

              {isStreaming && (
                <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                  LIVE FEED
                </div>
              )}
            </div>

            {/* Realtime Color Recognition Meters */}
            <div className="md:col-span-6 space-y-3">
              <div className="text-xs text-slate-300 font-medium">
                👉 Thử giơ <span className="text-cyan-400 font-bold">Thẻ Xanh</span> hoặc{' '}
                <span className="text-amber-400 font-bold">Thẻ Cam</span> trước camera để xem thanh tín hiệu:
              </div>

              {/* Blue Live Gauge */}
              <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    ĐỘI XANH (Blue Marker)
                  </span>
                  <span className="font-mono text-sm text-cyan-400 font-extrabold">{blueScore}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-3 border border-cyan-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-75"
                    style={{ width: `${blueScore}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Trạng thái:</span>
                  <span className={blueScore >= 80 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {blueScore >= 80 ? '✅ Đã nhận diện tốt' : 'Đang chờ thẻ xanh...'}
                  </span>
                </div>
              </div>

              {/* Orange Live Gauge */}
              <div className="bg-slate-900 border border-orange-500/40 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    ĐỘI CAM (Orange Marker)
                  </span>
                  <span className="font-mono text-sm text-amber-400 font-extrabold">{orangeScore}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-3 border border-orange-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-75"
                    style={{ width: `${orangeScore}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Trạng thái:</span>
                  <span className={orangeScore >= 80 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {orangeScore >= 80 ? '✅ Đã nhận diện tốt' : 'Đang chờ thẻ cam...'}
                  </span>
                </div>
              </div>

              {hasPerson && (
                <div className="text-[11px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-lg">
                  👤 Đã phát hiện người đứng trước camera
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TEAM NAME & CONFIGURATION FORM */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* QUESTION PACK SELECTOR CARD */}
          <div className="bg-gradient-to-r from-cyan-950/60 via-slate-950 to-blue-950/60 border-2 border-cyan-500/50 rounded-2xl p-4 shadow-xl shadow-cyan-950/40 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-md">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">BỘ CÂU HỎI THI ĐẤU</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      Khối 1 - 9
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white leading-tight mt-0.5">
                    {selectedLesson.lessonTitle}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setShowBankModal(true);
                }}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/25 transition-all uppercase tracking-wide shrink-0"
              >
                <Layers className="w-3.5 h-3.5 stroke-[3]" />
                <span>Đổi Bài Học Khác (Khối 1 - 9)</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Khối {selectedLesson.grade}</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-500/40 font-bold">
                Môn: {selectedLesson.subject}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                {selectedLesson.questions.length} câu hỏi
              </span>
              {selectedLesson.description && (
                <span className="text-slate-400 text-xs hidden sm:inline-block truncate max-w-md">
                  • {selectedLesson.description}
                </span>
              )}
            </div>
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Blue Team Card */}
            <div className="bg-gradient-to-b from-cyan-950/50 to-slate-950/80 border-2 border-cyan-500/50 rounded-2xl p-4 shadow-lg shadow-cyan-950/50 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-cyan-300">
                <Shield className="w-5 h-5" />
                <h3 className="font-extrabold uppercase tracking-wider text-sm">ĐỘI XANH (BLUE)</h3>
                <span className="ml-auto text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                  Thẻ Xanh Dương
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                  Tên đội xanh:
                </label>
                <input
                  type="text"
                  required
                  value={blueTeamName}
                  onChange={(e) => setBlueTeamName(e.target.value)}
                  placeholder="Ví dụ: BLUE TECH, ROBOT XANH..."
                  className="w-full bg-slate-950/90 border border-cyan-500/40 rounded-xl px-4 py-2.5 text-cyan-200 placeholder-slate-500 text-base font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Orange Team Card */}
            <div className="bg-gradient-to-b from-orange-950/50 to-slate-950/80 border-2 border-orange-500/50 rounded-2xl p-4 shadow-lg shadow-orange-950/50 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-amber-300">
                <Flame className="w-5 h-5" />
                <h3 className="font-extrabold uppercase tracking-wider text-sm">ĐỘI CAM (ORANGE)</h3>
                <span className="ml-auto text-xs bg-orange-500/20 text-amber-300 border border-orange-500/30 px-2 py-0.5 rounded font-mono">
                  Thẻ Cam Rõ
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                  Tên đội cam:
                </label>
                <input
                  type="text"
                  required
                  value={orangeTeamName}
                  onChange={(e) => setOrangeTeamName(e.target.value)}
                  placeholder="Ví dụ: ORANGE CODE, CHIẾN BINH CAM..."
                  className="w-full bg-slate-950/90 border border-orange-500/40 rounded-xl px-4 py-2.5 text-amber-200 placeholder-slate-500 text-base font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* School & Class Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tên Lớp:</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="5A1, 5/2..."
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tên Giáo Viên:</label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Thầy Hoàng, Cô Linh..."
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tên Trường:</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Trường Tiểu học..."
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              className="w-full sm:flex-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-base md:text-lg py-3.5 px-6 rounded-2xl shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-3 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-wider"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>🚀 BẮT ĐẦU CAM RACE</span>
            </button>

            {hasResumeOption && (
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  onResumeGame();
                }}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold py-3.5 px-4 rounded-2xl border border-cyan-500/30 flex items-center justify-center gap-2 transition-colors text-xs md:text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Tiếp tục Câu {savedSession.currentQuestionIndex + 1} ({savedSession.blueScore} - {savedSession.orangeScore})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onOpenCalibration();
              }}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 px-4 rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition-colors text-xs md:text-sm"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Căn chỉnh Cam</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onOpenAdmin();
              }}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 px-4 rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition-colors text-xs md:text-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Cài đặt</span>
            </button>
          </div>
        </form>
      </div>

      {/* Guide toggle button */}
      <div className="mt-3 flex items-center justify-center">
        <button
          onClick={() => setShowHowToPlay(!showHowToPlay)}
          className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 underline decoration-slate-600 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showHowToPlay ? 'Thu gọn luật chơi' : 'Xem thể lệ & cách chơi Cam Race'}</span>
        </button>
      </div>

      {/* Expandable Game Rules */}
      {showHowToPlay && (
        <div className="mt-3 w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-slate-300 text-xs md:text-sm space-y-2 animate-in fade-in duration-200">
          <h4 className="font-extrabold text-cyan-400 uppercase flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Luật thi đấu Cam Race Tin Học 5:
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs">
            <li>Mỗi câu bắt đầu bằng đếm ngược <strong className="text-white">3 - 2 - 1 - RUNNN!</strong></li>
            <li>Đại diện 2 đội cầm thẻ màu đội mình giơ trước camera trong vùng nhận diện.</li>
            <li>Computer Vision tự động nhận diện thẻ và khóa quyền cho đội chạy tới trước.</li>
            <li>Đội giành quyền trả lời đúng: <strong className="text-cyan-400">+10 điểm</strong> (Câu đặc biệt: <strong className="text-amber-400">+20 điểm</strong>).</li>
            <li>Nếu trả lời sai: Đội còn lại có cơ hội <strong className="text-orange-400">CƯỚP ĐIỂM</strong> (Đúng: <strong className="text-amber-400">+5 điểm</strong>).</li>
            <li>Sau 15 câu, đội có tổng điểm cao nhất sẽ đăng quang <strong className="text-yellow-400">CHAMPION</strong> và nhận Giấy chứng nhận A4 chuẩn!</li>
          </ol>
        </div>
      )}
      {/* QUESTION BANK SELECTOR MODAL */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-950 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] p-4 sm:p-6 shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-150">
            <QuestionBankSelector
              isModal={true}
              selectedLessonId={selectedLesson.id}
              onSelectLesson={(lesson) => {
                setSelectedLesson(lesson);
                // Update default class name to match selected grade if using standard format
                setClassName((prev) => {
                  if (/^[1-9]A\d+$/.test(prev) || prev === '5A1') {
                    return `${lesson.grade}A1`;
                  }
                  return prev;
                });
                setShowBankModal(false);
              }}
              onClose={() => setShowBankModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
