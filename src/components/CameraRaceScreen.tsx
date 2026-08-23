import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, AlertTriangle, Zap, RefreshCw, Eye, Timer, Play, FastForward, Image as ImageIcon } from 'lucide-react';
import { GameSession, GameSettings, TeamId } from '../types';
import { useCamera } from '../hooks/useCamera';
import { useRaceDetection } from '../hooks/useRaceDetection';
import { soundService } from '../services/soundService';
import { captureSnapshot } from '../utils/colorDetection';

interface CameraRaceScreenProps {
  session: GameSession;
  settings: GameSettings;
  raceStartTimestamp: number | null;
  onWinnerLock: (winner: TeamId, snapshotUrl: string | null, reactionTimeMs: number) => void;
  onTie: () => void;
}

export const CameraRaceScreen: React.FC<CameraRaceScreenProps> = ({
  session,
  settings,
  raceStartTimestamp: initialRaceStartTimestamp,
  onWinnerLock,
  onTie,
}) => {
  const {
    videoRef,
    devices,
    selectedDeviceId,
    isStreaming,
    error: cameraError,
    startCamera,
    switchCamera,
  } = useCamera(true);

  // Countdown Step: '3' -> '2' -> '1' -> 'RUN' -> 'RACING'
  const [countdownStep, setCountdownStep] = useState<'3' | '2' | '1' | 'RUN' | 'RACING'>('3');
  const [actualRaceStart, setActualRaceStart] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);
  const [lastSnappedPreview, setLastSnappedPreview] = useState<string | null>(null);

  const countdownTimersRef = useRef<NodeJS.Timeout[]>([]);

  const triggerCameraFlash = () => {
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 250);
  };

  // Initialize camera when mounted
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Clean countdown timers helper
  const clearAllCountdownTimers = () => {
    countdownTimersRef.current.forEach((t) => clearTimeout(t));
    countdownTimersRef.current = [];
  };

  // Start 3, 2, 1, RUNNN Live Camera Countdown
  useEffect(() => {
    clearAllCountdownTimers();

    // Step 3
    setCountdownStep('3');
    soundService.playCountdownTick(3);

    // Step 2 after 1000ms
    const t2 = setTimeout(() => {
      setCountdownStep('2');
      soundService.playCountdownTick(2);
    }, 1000);

    // Step 1 after 2000ms
    const t1 = setTimeout(() => {
      setCountdownStep('1');
      soundService.playCountdownTick(1);
    }, 2000);

    // Step RUN after 3000ms
    const tRun = setTimeout(() => {
      triggerCameraFlash();
      setCountdownStep('RUN');
      soundService.playRunHorn();
      const startTime = performance.now();
      setActualRaceStart(startTime);

      // Transition to active racing mode after 500ms
      const tRace = setTimeout(() => {
        setCountdownStep('RACING');
      }, 550);

      countdownTimersRef.current.push(tRace);
    }, 3000);

    countdownTimersRef.current.push(t2, t1, tRun);

    return () => {
      clearAllCountdownTimers();
    };
  }, []);

  // Skip countdown immediately and start race
  const handleSkipCountdown = () => {
    clearAllCountdownTimers();
    triggerCameraFlash();
    soundService.playRunHorn();
    const startTime = performance.now();
    setActualRaceStart(startTime);
    setCountdownStep('RACING');
  };

  // Manual Photo Snapshot handler for teacher
  const handleManualSnapshot = () => {
    if (!videoRef.current) return;
    triggerCameraFlash();
    soundService.playShutter();
    const snap = captureSnapshot(videoRef.current, {
      questionIndex: session.currentQuestionIndex,
      label: `KHOẢNH KHẮC TRANH QUYỀN - CÂU ${session.currentQuestionIndex + 1}`,
    });
    if (snap) {
      setLastSnappedPreview(snap);
      setTimeout(() => setLastSnappedPreview(null), 3000);
    }
  };

  const isCountingDown = countdownStep !== 'RACING' && countdownStep !== 'RUN';
  const isRacing = countdownStep === 'RACING' || countdownStep === 'RUN';

  // Elapsed timer ticker for active race
  useEffect(() => {
    if (!isRacing || !actualRaceStart) {
      setElapsedMs(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedMs(Math.round(performance.now() - actualRaceStart));
    }, 40);

    return () => clearInterval(interval);
  }, [isRacing, actualRaceStart]);

  const { detection, fps, triggerManualWinner, triggerManualTie } = useRaceDetection({
    videoRef,
    settings,
    isActive: isStreaming,
    isHoldActive: isCountingDown,
    raceStartTimestamp: actualRaceStart || initialRaceStartTimestamp,
    questionIndex: session.currentQuestionIndex,
    blueTeamName: session.blueTeamName,
    orangeTeamName: session.orangeTeamName,
    onWinnerLock: (w, snap, rTime) => {
      triggerCameraFlash();
      onWinnerLock(w, snap, rTime);
    },
    onTie,
  });

  // Keyboard shortcuts for Teacher / Referee
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isCountingDown) {
        e.preventDefault();
        handleSkipCountdown();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleManualSnapshot();
      } else if (e.key === 'b' || e.key === 'B') {
        triggerManualWinner('blue');
      } else if (e.key === 'o' || e.key === 'O') {
        triggerManualWinner('orange');
      } else if (e.key === 't' || e.key === 'T') {
        triggerManualTie();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCountingDown, triggerManualWinner, triggerManualTie]);

  // Active glow color depending on detection
  const isBlueTriggering = detection.blueScore >= 70;
  const isOrangeTriggering = detection.orangeScore >= 70;

  return (
    <div className="w-full max-w-6xl mx-auto px-2 md:px-4 py-3 flex flex-col items-center justify-center">
      {/* Top Race Status Header */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 mb-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {isCountingDown ? (
            <span className="flex items-center gap-2 text-xs md:text-sm font-black text-amber-400 uppercase tracking-wider">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span>📷 MỞ WEBCAM • ĐẾM NGƯỢC XUẤT PHÁT ({countdownStep})</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs md:text-sm font-black text-emerald-400 uppercase tracking-wider">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span>⚡ ĐANG TRANH QUYỀN TRẢ LỜI CÂU {session.currentQuestionIndex + 1}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-xs text-slate-400 font-mono">
            {isCountingDown ? (
              <span className="text-amber-400 font-bold">CHUẨN BỊ: {countdownStep}</span>
            ) : (
              <span>
                THỜI GIAN: <strong className="text-cyan-400 font-bold">{(elapsedMs / 1000).toFixed(2)}s</strong>
              </span>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span>CV FPS:</span>
            <span className="text-emerald-400 font-bold">{fps}</span>
          </div>

          {isCountingDown && (
            <button
              onClick={handleSkipCountdown}
              className="text-[11px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-lg flex items-center gap-1 cursor-pointer shadow transition-transform active:scale-95"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Bỏ qua 3s (Space)</span>
            </button>
          )}

          {devices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => switchCamera(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none"
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

      {/* Main 16:9 Camera Viewport with Esports HUD */}
      <div
        className={`relative w-full aspect-video max-h-[68vh] bg-slate-950 border-2 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] flex items-center justify-center transition-all duration-150 ${
          isCountingDown
            ? 'border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.2)]'
            : isBlueTriggering
            ? 'border-cyan-400 shadow-[0_0_60px_rgba(6,182,212,0.4)]'
            : isOrangeTriggering
            ? 'border-orange-400 shadow-[0_0_60px_rgba(249,115,22,0.4)]'
            : 'border-cyan-500/40'
        }`}
      >
        {/* Camera Flash Screen Effect */}
        {isFlashActive && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
        )}

        {/* Video stream element (mirrored for natural interaction) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${!isStreaming ? 'hidden' : ''}`}
        />

        {/* Loading Camera Indicator */}
        {!isStreaming && !cameraError && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <div className="w-14 h-14 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 animate-spin flex items-center justify-center" />
            <span className="text-sm font-bold text-cyan-300">Đang bật Webcam...</span>
          </div>
        )}

        {/* Photo Snapped Toast Notification */}
        {lastSnappedPreview && (
          <div className="absolute top-4 right-4 z-40 bg-slate-900/95 border-2 border-cyan-400 rounded-2xl p-2 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <img
              src={lastSnappedPreview}
              alt="Moment snapshot"
              referrerPolicy="no-referrer"
              className="w-20 h-14 object-cover rounded-xl border border-slate-700"
            />
            <div className="pr-2">
              <span className="text-xs font-black text-cyan-300 block uppercase">📸 Đã chụp khoảnh khắc!</span>
              <span className="text-[10px] text-slate-300">Đã lưu ảnh câu {session.currentQuestionIndex + 1}</span>
            </div>
          </div>
        )}

        {/* Camera Error Fallback View */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
            <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-bold text-white uppercase">KHÔNG THỂ SỬ DỤNG WEBCAM</h3>
              <p className="text-xs text-slate-400">{cameraError}</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                onClick={() => startCamera()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Bật lại Webcam</span>
              </button>
            </div>
          </div>
        )}

        {/* 3, 2, 1, RUNNN OVERLAY ON LIVE CAMERA */}
        {isCountingDown && (
          <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px] z-30 flex flex-col items-center justify-center p-4 pointer-events-none">
            <AnimatePresence mode="wait">
              {countdownStep === '3' && (
                <motion.div
                  key="3"
                  initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
                  exit={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="flex flex-col items-center justify-center text-center space-y-2"
                >
                  <span className="text-9xl md:text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 drop-shadow-[0_0_60px_rgba(6,182,212,0.8)] font-mono">
                    3
                  </span>
                  <span className="bg-cyan-950/90 border border-cyan-400/60 text-cyan-300 text-sm md:text-base font-black px-6 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                    CHUẨN BỊ TRANH QUYỀN
                  </span>
                </motion.div>
              )}

              {countdownStep === '2' && (
                <motion.div
                  key="2"
                  initial={{ scale: 0.3, opacity: 0, rotate: 10 }}
                  animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
                  exit={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="flex flex-col items-center justify-center text-center space-y-2"
                >
                  <span className="text-9xl md:text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-yellow-500 drop-shadow-[0_0_60px_rgba(245,158,11,0.8)] font-mono">
                    2
                  </span>
                  <span className="bg-amber-950/90 border border-amber-400/60 text-amber-300 text-sm md:text-base font-black px-6 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                    SẴN SÀNG THẺ MÀU
                  </span>
                </motion.div>
              )}

              {countdownStep === '1' && (
                <motion.div
                  key="1"
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="flex flex-col items-center justify-center text-center space-y-2"
                >
                  <span className="text-9xl md:text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-rose-400 to-red-600 drop-shadow-[0_0_60px_rgba(244,63,94,0.9)] font-mono">
                    1
                  </span>
                  <span className="bg-rose-950/90 border border-rose-400/60 text-rose-300 text-sm md:text-base font-black px-6 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                    VÀO VỊ TRÍ XUẤT PHÁT!
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* RUNNN BANNER OVERLAY */}
        {countdownStep === 'RUN' && (
          <div className="absolute inset-0 bg-slate-950/20 z-30 flex items-center justify-center pointer-events-none animate-in zoom-in-50 duration-200">
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [1, 1.3, 1.1], opacity: 1 }}
              exit={{ scale: 2.2, opacity: 0 }}
              className="text-7xl md:text-9xl lg:text-[11rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-400 to-cyan-400 drop-shadow-[0_0_80px_rgba(52,211,153,0.9)] tracking-wider uppercase font-mono"
            >
              RUNNN!!!
            </motion.div>
          </div>
        )}

        {/* HUD OVERLAYS */}
        {isStreaming && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-10">
            {/* Top Info Banner */}
            <div className="flex items-center justify-between">
              {/* Blue Live Gauge */}
              <div
                className={`bg-slate-950/85 border-2 rounded-2xl p-3 md:p-4 backdrop-blur-md shadow-lg min-w-[170px] md:min-w-[230px] transition-all ${
                  isBlueTriggering
                    ? 'border-cyan-400 shadow-cyan-500/50 scale-105 bg-cyan-950/60'
                    : 'border-cyan-500/60 shadow-cyan-950/60'
                }`}
              >
                <div className="flex items-center justify-between text-cyan-300 font-extrabold text-xs md:text-sm uppercase mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    {session.blueTeamName}
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">{detection.blueScore}%</span>
                </div>

                <div className="relative w-full bg-slate-900 rounded-full h-4 border border-cyan-500/40 overflow-hidden mb-1">
                  {/* 70% Trigger Threshold Marker */}
                  <div className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-cyan-300 z-10 opacity-70" title="Ngưỡng khóa thắng (70%)" />
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 transition-all duration-75"
                    style={{ width: `${detection.blueScore}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] md:text-xs text-slate-300">
                  <span>Khóa ổn định (Ngưỡng 70%):</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {detection.blueStableFrames} / {Math.max(2, settings.minStableFrames || 3)} frame
                  </span>
                </div>
              </div>

              {/* Center Status Pill & Card Detection Layer */}
              <div className="flex flex-col items-center">
                {isCountingDown ? (
                  <div className="bg-amber-950/90 border border-amber-500/60 text-amber-300 px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-bold flex items-center gap-2 shadow-lg">
                    <Timer className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>ĐẾM NGƯỢC: {countdownStep}</span>
                  </div>
                ) : detection.status === 'NO_CARD' ? (
                  <div className="bg-slate-950/90 border border-slate-700/90 text-slate-300 px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-bold flex items-center gap-2 shadow-lg animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span>🔍 CHƯA TÌM THẤY THẺ • HÃY GIƠ THẺ VÀO CAMERA</span>
                  </div>
                ) : detection.status === 'TRACKING_BLUE' ? (
                  <div className="bg-cyan-950/95 border-2 border-cyan-400 text-cyan-200 px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-black flex items-center gap-2 shadow-xl shadow-cyan-500/30">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>🎯 ĐANG BẮT THẺ XANH ({detection.blueScore}%) • {detection.blueStableFrames}/3 frame</span>
                  </div>
                ) : detection.status === 'TRACKING_ORANGE' ? (
                  <div className="bg-orange-950/95 border-2 border-orange-400 text-amber-200 px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-black flex items-center gap-2 shadow-xl shadow-orange-500/30">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
                    <span>🎯 ĐANG BẮT THẺ CAM ({detection.orangeScore}%) • {detection.orangeStableFrames}/3 frame</span>
                  </div>
                ) : detection.status === 'TRACKING_BOTH' ? (
                  <div className="bg-purple-950/95 border-2 border-purple-400 text-purple-200 px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-black flex items-center gap-2 shadow-xl">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
                    <span>⚡ BẮT CẢ 2 THẺ (X: {detection.blueScore}% | C: {detection.orangeScore}%)</span>
                  </div>
                ) : (
                  <div className="bg-emerald-950/95 border-2 border-emerald-400 text-emerald-200 px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-black flex items-center gap-2 shadow-xl">
                    <span>🏆 ĐÃ KHÓA CHIẾN THẮNG!</span>
                  </div>
                )}

                {detection.hasPerson && (
                  <span className="text-[10px] text-emerald-400 font-bold mt-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    ✅ PHÁT HIỆN THÍ SINH
                  </span>
                )}
              </div>

              {/* Orange Live Gauge */}
              <div
                className={`bg-slate-950/85 border-2 rounded-2xl p-3 md:p-4 backdrop-blur-md shadow-lg min-w-[170px] md:min-w-[230px] transition-all ${
                  isOrangeTriggering
                    ? 'border-orange-400 shadow-orange-500/50 scale-105 bg-orange-950/60'
                    : 'border-orange-500/60 shadow-orange-950/60'
                }`}
              >
                <div className="flex items-center justify-between text-amber-300 font-extrabold text-xs md:text-sm uppercase mb-1.5">
                  <span className="font-mono text-amber-300 font-bold">{detection.orangeScore}%</span>
                  <span className="flex items-center gap-1.5">
                    {session.orangeTeamName}
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                  </span>
                </div>

                <div className="relative w-full bg-slate-900 rounded-full h-4 border border-orange-500/40 overflow-hidden mb-1">
                  {/* 70% Trigger Threshold Marker */}
                  <div className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-amber-300 z-10 opacity-70" title="Ngưỡng khóa thắng (70%)" />
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-75"
                    style={{ width: `${detection.orangeScore}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] md:text-xs text-slate-300">
                  <span className="font-mono font-bold text-amber-300">
                    {detection.orangeStableFrames} / {Math.max(2, settings.minStableFrames || 3)} frame
                  </span>
                  <span>(Ngưỡng 70%) Khóa ổn định:</span>
                </div>
              </div>
            </div>

            {/* Visual Tracking Bounding Overlays */}
            {detection.blueBounds && (
              <div
                className="absolute border-2 border-cyan-400 bg-cyan-400/20 rounded-xl transition-all duration-75 pointer-events-none"
                style={{
                  left: `${100 - detection.blueBounds.maxX}%`,
                  width: `${Math.max(8, detection.blueBounds.maxX - detection.blueBounds.minX)}%`,
                  top: `${detection.blueBounds.minY}%`,
                  height: `${Math.max(8, detection.blueBounds.maxY - detection.blueBounds.minY)}%`,
                }}
              >
                <span className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow font-mono">
                  BLUE {detection.blueScore}%
                </span>
              </div>
            )}

            {detection.orangeBounds && (
              <div
                className="absolute border-2 border-orange-400 bg-orange-400/20 rounded-xl transition-all duration-75 pointer-events-none"
                style={{
                  left: `${100 - detection.orangeBounds.maxX}%`,
                  width: `${Math.max(8, detection.orangeBounds.maxX - detection.orangeBounds.minX)}%`,
                  top: `${detection.orangeBounds.minY}%`,
                  height: `${Math.max(8, detection.orangeBounds.maxY - detection.orangeBounds.minY)}%`,
                }}
              >
                <span className="absolute -top-6 right-0 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow font-mono">
                  ORANGE {detection.orangeScore}%
                </span>
              </div>
            )}

            {/* Central ROI Target Reticle */}
            <div className="self-center w-[84%] h-[80%] border border-cyan-500/20 rounded-3xl relative pointer-events-none flex items-center justify-center">
              {/* Corner target reticles */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />

              {/* Crosshair Center */}
              <div className="w-8 h-8 border border-cyan-400/40 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
              </div>
              <span className="absolute bottom-3 text-[11px] font-bold text-cyan-400/80 tracking-widest uppercase bg-slate-950/70 px-3 py-0.5 rounded border border-cyan-500/30">
                VÙNG NHẬN DIỆN THẺ (ROI)
              </span>
            </div>

            {/* Bottom Floating Hint */}
            <div className="text-center text-xs text-slate-300 font-semibold bg-slate-950/60 py-1 px-4 rounded-full mx-auto backdrop-blur-sm border border-slate-800">
              {isCountingDown
                ? `⏳ Camera đang đếm ngược 3, 2, 1... Hãy đứng sẵn sàng!`
                : `⚡ Đưa thẻ xanh hoặc thẻ cam vào trước ống kính để hệ thống chớp khóa!`}
            </div>
          </div>
        )}
      </div>

      {/* TEACHER / REFEREE MANUAL OVERRIDE TOOLBAR */}
      <div className="w-full mt-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 md:p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="uppercase tracking-wider">Trọng tài / Phím tắt Giáo viên:</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full md:w-auto">
            {isCountingDown && (
              <button
                onClick={handleSkipCountdown}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs md:text-sm px-4 py-2.5 rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer transition-transform active:scale-95"
              >
                <FastForward className="w-4 h-4" />
                <span>Bỏ qua 3s (Space)</span>
              </button>
            )}

            <button
              onClick={handleManualSnapshot}
              title="Chụp lại khoảnh khắc camera ngay lập tức"
              className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs md:text-sm px-3.5 py-2.5 rounded-xl border border-cyan-500/40 flex items-center justify-center gap-1.5 cursor-pointer transition-transform active:scale-95 shadow"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>📸 Chụp ảnh (P)</span>
            </button>

            <button
              onClick={() => {
                soundService.playClick();
                triggerManualWinner('blue');
              }}
              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <div className="w-3 h-3 rounded-full bg-cyan-200" />
              <span>🔵 {session.blueTeamName} Thắng</span>
              <kbd className="bg-blue-900/80 px-1.5 py-0.5 rounded text-[10px] font-mono border border-cyan-400/40">B</kbd>
            </button>

            <button
              onClick={() => {
                soundService.playClick();
                triggerManualWinner('orange');
              }}
              className="flex-1 sm:flex-none bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <div className="w-3 h-3 rounded-full bg-amber-200" />
              <span>🟠 {session.orangeTeamName} Thắng</span>
              <kbd className="bg-orange-900/80 px-1.5 py-0.5 rounded text-[10px] font-mono border border-orange-400/40">O</kbd>
            </button>

            <button
              onClick={() => {
                soundService.playClick();
                triggerManualTie();
              }}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl border border-amber-500/40 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Hòa / Chạy lại</span>
              <kbd className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700">T</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
