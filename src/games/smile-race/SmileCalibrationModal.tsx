import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Sliders, CheckCircle, RefreshCw, Eye, Camera, ShieldCheck, HelpCircle } from 'lucide-react';
import { SmileDetector, SmileGestureMetrics, TeamMarkerResult, computeTeamZones } from './smileDetector';
import { soundService } from '../../services/soundService';

export interface SmileCalibrationSettings {
  smileThreshold: number; // default 0.55 (nhạy và nhanh hơn)
  markerThreshold: number; // default 0.30
  requiredStableFrames: number; // default 2 (phản xạ nhanh ~50-60ms)
  tieThresholdMs: number; // default 200
  stealMode: 'TEACHER_SELECT' | 'NEXT_TEAM' | 'LOWEST_SCORE' | 'RANDOM_OTHER_TEAM';
  stealRoundingMode: 'FLOOR' | 'ROUND' | 'CEIL';
  maxStealAttempts: number; // default 1
  normalPoints: number; // default 10
  specialPoints: number; // default 20
  questionTimeLimitSeconds: number; // default 30
  showDebugStats: boolean;
}

interface SmileCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SmileCalibrationSettings;
  onSaveSettings: (newSettings: SmileCalibrationSettings) => void;
  teams: { id: string; teamCode: string; name: string; color: string; markerColor?: string }[];
}

export const SmileCalibrationModal: React.FC<SmileCalibrationModalProps> = ({
  isOpen,
  onClose,
  settings: initialSettings,
  onSaveSettings,
  teams,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<SmileDetector>(new SmileDetector());
  const animationFrameRef = useRef<number | null>(null);

  const [localSettings, setLocalSettings] = useState<SmileCalibrationSettings>(initialSettings);
  const [currentMetrics, setCurrentMetrics] = useState<SmileGestureMetrics | null>(null);
  const [teamMarkers, setTeamMarkers] = useState<TeamMarkerResult[]>([]);
  const [hasBaseline, setHasBaseline] = useState<boolean>(false);
  const [stableCount, setStableCount] = useState<number>(0);
  const [isTestQualified, setIsTestQualified] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'advanced'>('camera');

  // Start webcam for calibration
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        if (isMounted) {
          setCameraError(err?.message || 'Không thể mở webcam');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  // Real-time Computer Vision Loop
  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    let stableCounter = 0;

    const runFrame = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const detector = detectorRef.current;
        const metrics = await detector.analyzeFrame(videoRef.current);
        const markers = detector.detectTeamMarker(videoRef.current, teams, metrics.faceBox);

        setCurrentMetrics(metrics);
        setTeamMarkers(markers);
        setHasBaseline(!!detector.getBaseline());

        // Draw HUD overlay on canvas
        if (canvasOverlayRef.current) {
          const cvs = canvasOverlayRef.current;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, cvs.width, cvs.height);

            const scaleX = cvs.width / 320;
            const scaleY = cvs.height / 240;

            // Draw Team Zones Partition guidelines
            const zones = computeTeamZones(teams);
            zones.forEach((z) => {
              const zx = z.normX * cvs.width;
              const zy = z.normY * cvs.height;
              const zw = z.normWidth * cvs.width;
              const zh = z.normHeight * cvs.height;

              // Dashed zone border
              ctx.save();
              ctx.strokeStyle = z.color;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.strokeRect(zx + 2, zy + 2, zw - 4, zh - 4);

              // Zone team label badge at top
              ctx.fillStyle = z.color;
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText(z.teamName, zx + 8, zy + 18);
              ctx.restore();
            });

            // Draw Face box
            if (metrics.faceDetected && metrics.faceBox) {
              const fb = metrics.faceBox;
              ctx.strokeStyle = metrics.smileGestureScore >= localSettings.smileThreshold ? '#eab308' : '#38bdf8';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(fb.x * scaleX, fb.y * scaleY, fb.width * scaleX, fb.height * scaleY);

              // Draw Mouth box
              if (metrics.mouthBox) {
                const mb = metrics.mouthBox;
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 2;
                ctx.strokeRect(mb.x * scaleX, mb.y * scaleY, mb.width * scaleX, mb.height * scaleY);
              }
            }

            // Draw Markers
            markers.forEach((m) => {
              if (m.markerBounds && m.confidence >= localSettings.markerThreshold) {
                const mb = m.markerBounds;
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2;
                ctx.strokeRect(mb.x * scaleX, mb.y * scaleY, mb.width * scaleX, mb.height * scaleY);
              }
            });
          }
        }

        // Test qualification
        const maxMarkerConf = Math.max(0, ...markers.map((m) => m.confidence));
        if (
          metrics.faceDetected &&
          metrics.smileGestureScore >= localSettings.smileThreshold &&
          maxMarkerConf >= localSettings.markerThreshold
        ) {
          stableCounter++;
          if (stableCounter >= localSettings.requiredStableFrames) {
            if (!isTestQualified) {
              soundService.playSmileChime();
            }
            setIsTestQualified(true);
          }
        } else {
          stableCounter = Math.max(0, stableCounter - 1);
          setIsTestQualified(false);
        }
        setStableCount(stableCounter);
      }

      animationFrameRef.current = requestAnimationFrame(runFrame);
    };

    animationFrameRef.current = requestAnimationFrame(runFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, localSettings, teams, isTestQualified]);

  const handleCaptureBaseline = () => {
    if (currentMetrics && currentMetrics.faceDetected) {
      detectorRef.current.addBaselineSample(currentMetrics);
      detectorRef.current.addBaselineSample(currentMetrics);
      detectorRef.current.addBaselineSample(currentMetrics);
      setHasBaseline(true);
      soundService.playClick();
    }
  };

  const handleResetBaseline = () => {
    detectorRef.current.resetBaseline();
    setHasBaseline(false);
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border-2 border-amber-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500 text-white">
            <div className="flex items-center gap-3">
              <span className="text-3xl">😁</span>
              <div>
                <h2 className="text-xl font-bold tracking-tight">TEST NỤ CƯỜI & HIỆU CHUẨN CAMERA</h2>
                <p className="text-xs text-amber-100 font-medium">
                  Cân chỉnh nhận diện cử chỉ nụ cười và thẻ màu các đội
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Camera & Real-time Gauge Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Video Preview with Wireframe HUD */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <canvas
                  ref={canvasOverlayRef}
                  width={320}
                  height={240}
                  className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
                />

                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-rose-300 p-4 text-center">
                    <Camera className="w-10 h-10 mb-2 text-rose-400" />
                    <p className="font-semibold text-sm">{cameraError}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Hãy cấp quyền Camera cho trình duyệt để bắt đầu test
                    </p>
                  </div>
                )}

                {/* Overlaid Test Status */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${
                      isTestQualified
                        ? 'bg-emerald-500/90 text-white border-emerald-300 shadow-lg shadow-emerald-500/40 animate-pulse'
                        : 'bg-slate-900/80 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {isTestQualified ? '🎉 CỬ CHỈ CƯỜI ĐẠT CHUẨN!' : 'Đang phát hiện...'}
                  </span>
                </div>

                <div className="absolute bottom-3 right-3">
                  <button
                    onClick={hasBaseline ? handleResetBaseline : handleCaptureBaseline}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 hover:bg-white text-slate-800 shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                    {hasBaseline ? 'Đặt lại chuẩn' : '🎯 Lấy chuẩn trung tính'}
                  </button>
                </div>
              </div>

              {/* Right: Live Metrics & Gauges */}
              <div className="space-y-4 bg-rose-50/50 rounded-2xl p-4 border border-rose-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-600" />
                  THÔNG SỐ CỬ CHỈ THỜI GIAN THỰC
                </h3>

                {/* Smile Gesture Score Gauge */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <span>😁 Điểm cử chỉ nụ cười</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        (Ngưỡng: {Math.round(localSettings.smileThreshold * 100)}%)
                      </span>
                    </span>
                    <span
                      className={`text-sm font-black ${
                        (currentMetrics?.smileGestureScore || 0) >= localSettings.smileThreshold
                          ? 'text-amber-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {Math.round((currentMetrics?.smileGestureScore || 0) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full transition-all duration-100 rounded-full ${
                        (currentMetrics?.smileGestureScore || 0) >= localSettings.smileThreshold
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-sm'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((currentMetrics?.smileGestureScore || 0) * 100))}%` }}
                    />
                    {/* Threshold indicator line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-purple-600 z-10"
                      style={{ left: `${Math.round(localSettings.smileThreshold * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Team Marker Confidence */}
                <div className="space-y-2 pt-2 border-t border-rose-100">
                  <div className="text-xs font-bold text-slate-700">Thẻ màu các đội (Marker Confidence):</div>
                  <div className="grid grid-cols-2 gap-2">
                    {teamMarkers.map((m, idx) => (
                      <div
                        key={m.teamCode || idx}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                          m.confidence >= localSettings.markerThreshold
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                m.teamCode === 'TEAM1'
                                  ? '#06b6d4'
                                  : m.teamCode === 'TEAM2'
                                  ? '#f97316'
                                  : m.teamCode === 'TEAM3'
                                  ? '#10b981'
                                  : '#a855f7',
                            }}
                          />
                          <span className="truncate">{m.teamName || m.teamCode}</span>
                        </div>
                        <span>{Math.round(m.confidence * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Chips */}
                <div className="flex flex-wrap gap-2 pt-2 text-xs font-medium">
                  <span
                    className={`px-2.5 py-1 rounded-lg border ${
                      currentMetrics?.faceDetected
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    Khuôn mặt: {currentMetrics?.faceDetected ? '✅ Nhận diện' : '❌ Chưa thấy'}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg border ${
                      stableCount >= localSettings.requiredStableFrames
                        ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    Ổn định: {stableCount}/{localSettings.requiredStableFrames} khung hình
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg border ${
                      hasBaseline
                        ? 'bg-purple-50 text-purple-700 border-purple-200 font-bold'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    Chuẩn trung tính: {hasBaseline ? 'Đã lưu' : 'Mặc định'}
                  </span>
                </div>
              </div>
            </div>

            {/* Calibration Sliders */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                CÀI ĐẶT THAM SỐ TRÒ CHƠI
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Slider 1: Smile Threshold */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Ngưỡng nụ cười hợp lệ (Smile Threshold):</span>
                    <span className="font-black text-purple-600">
                      {Math.round(localSettings.smileThreshold * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="35"
                    max="85"
                    value={Math.round(localSettings.smileThreshold * 100)}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, smileThreshold: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">
                    Khuyến nghị 55% - 65%. Thấp hơn sẽ dễ kích hoạt, cao hơn yêu cầu cười thật tươi.
                  </p>
                </div>

                {/* Slider 2: Marker Threshold */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Ngưỡng thẻ màu đội (Marker Threshold):</span>
                    <span className="font-black text-cyan-600">
                      {Math.round(localSettings.markerThreshold * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="70"
                    value={Math.round(localSettings.markerThreshold * 100)}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, markerThreshold: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">
                    Mặc định 35%. Giảm xuống 20% nếu phòng học có ánh sáng yếu.
                  </p>
                </div>

                {/* Slider 3: Required Stable Frames */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Số khung hình ổn định liên tiếp:</span>
                    <span className="font-black text-amber-600">{localSettings.requiredStableFrames} frames</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={localSettings.requiredStableFrames}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, requiredStableFrames: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">
                    Mặc định 3 khung hình (~0.1s) để lọc bỏ nháy mắt hoặc cử động vô tình.
                  </p>
                </div>

                {/* Slider 4: Tie Window */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Cửa sổ phát hiện hòa nhau (Tie Window):</span>
                    <span className="font-black text-rose-600">{localSettings.tieThresholdMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={localSettings.tieThresholdMs}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, tieThresholdMs: Number(e.target.value) })
                    }
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">
                    Mặc định 200ms. Nếu 2 đội cùng cười trong khoảng thời gian này sẽ báo HÒA.
                  </p>
                </div>
              </div>

              {/* Steal Mode and Rounding */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chế độ chọn đội cướp quyền (khi 3-4 đội):
                  </label>
                  <select
                    value={localSettings.stealMode}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, stealMode: e.target.value as any })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-purple-400 bg-white"
                  >
                    <option value="TEACHER_SELECT">Giáo viên chọn đội cướp (Mặc định)</option>
                    <option value="NEXT_TEAM">Đội kế tiếp theo lượt</option>
                    <option value="LOWEST_SCORE">Đội đang có điểm thấp nhất</option>
                    <option value="RANDOM_OTHER_TEAM">Chọn ngẫu nhiên đội khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cách làm tròn điểm cướp (stealPoints = floor(pts / 2)):
                  </label>
                  <select
                    value={localSettings.stealRoundingMode}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, stealRoundingMode: e.target.value as any })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-purple-400 bg-white"
                  >
                    <option value="FLOOR">Làm tròn xuống (FLOOR, e.g. 15 → 7, 10 → 5)</option>
                    <option value="ROUND">Làm tròn chuẩn (ROUND, e.g. 15 → 8)</option>
                    <option value="CEIL">Làm tròn lên (CEIL, e.g. 15 → 8)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <span className="font-bold">Bảo vệ quyền riêng tư & Nguyên tắc hoạt động:</span> Thuật toán xử lý thuần
                túy ngay trên trình duyệt (Local Browser Processing). Hệ thống chỉ đo đạc các tỷ lệ hình học chuyển động
                của khóe môi, miệng và màu thẻ để phục vụ trò chơi. Tuyệt đối không nhận diện khuôn mặt, không lưu ảnh
                chụp/video và không suy đoán cảm xúc của học sinh.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <button
              onClick={() => {
                setLocalSettings({
                  ...localSettings,
                  smileThreshold: 0.60,
                  markerThreshold: 0.35,
                  requiredStableFrames: 3,
                  tieThresholdMs: 200,
                  stealMode: 'TEACHER_SELECT',
                  stealRoundingMode: 'FLOOR',
                  maxStealAttempts: 1,
                });
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Khôi phục mặc định
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500 text-white shadow-md hover:shadow-lg transition-all"
              >
                Lưu cài đặt
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
