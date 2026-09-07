import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, CheckCircle, RefreshCw, Eye, Sliders, Play, Zap, Shield, Flame } from 'lucide-react';
import { GameSettings, TeamId } from '../types';
import { useCamera } from '../hooks/useCamera';
import { analyzeVideoFrame } from '../utils/colorDetection';
import { soundService } from '../services/soundService';

interface CameraCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings?: (settings: GameSettings) => void;
  onSaveSettings?: (settings: GameSettings) => void;
}

export const CameraCalibrationModal: React.FC<CameraCalibrationModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSaveSettings,
}) => {
  const {
    videoRef,
    devices,
    selectedDeviceId,
    isStreaming,
    error: cameraError,
    startCamera,
    switchCamera,
    stopCamera,
  } = useCamera();

  const [localSettings, setLocalSettings] = useState<GameSettings>(settings);
  const [blueScore, setBlueScore] = useState<number>(0);
  const [orangeScore, setOrangeScore] = useState<number>(0);
  const [blueStable, setBlueStable] = useState<number>(0);
  const [orangeStable, setOrangeStable] = useState<number>(0);
  const [testRaceWinner, setTestRaceWinner] = useState<TeamId | null>(null);
  const [isTestRaceActive, setIsTestRaceActive] = useState<boolean>(false);
  const [testCountdown, setTestCountdown] = useState<string | null>(null);

  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    if (!isOpen || !isStreaming || !videoRef.current) return;

    const loop = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      if (!testCanvasRef.current) {
        testCanvasRef.current = document.createElement('canvas');
      }

      const { result, updatedBlueStable, updatedOrangeStable } = analyzeVideoFrame(
        videoRef.current,
        testCanvasRef.current,
        localSettings,
        blueStable,
        orangeStable
      );

      setBlueScore(result.blueScore);
      setOrangeScore(result.orangeScore);
      setBlueStable(updatedBlueStable);
      setOrangeStable(updatedOrangeStable);

      if (isTestRaceActive && result.winnerCandidate && !testRaceWinner) {
        setTestRaceWinner(result.winnerCandidate);
        soundService.playRaceLock(result.winnerCandidate);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isOpen, isStreaming, localSettings, blueStable, orangeStable, isTestRaceActive, testRaceWinner, videoRef]);

  const handleStartTestRace = () => {
    setTestRaceWinner(null);
    setIsTestRaceActive(false);

    setTestCountdown('3');
    soundService.playCountdownTick(3);

    setTimeout(() => {
      setTestCountdown('2');
      soundService.playCountdownTick(2);
    }, 800);

    setTimeout(() => {
      setTestCountdown('1');
      soundService.playCountdownTick(1);
    }, 1600);

    setTimeout(() => {
      setTestCountdown('RUNNN!!!');
      soundService.playRunHorn();
      setIsTestRaceActive(true);
    }, 2400);

    setTimeout(() => {
      setTestCountdown(null);
    }, 3200);
  };

  const handleSaveSettings = () => {
    if (onUpdateSettings) onUpdateSettings(localSettings);
    if (onSaveSettings) onSaveSettings(localSettings);
    soundService.playClick();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-lg uppercase">
            <Camera className="w-6 h-6" />
            <span>📷 KIỂM TRA & HIỆU CHỈNH CAMERA TRẬN ĐẤU</span>
          </div>
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Video Preview with Diagnostic Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left: Video & Reticle */}
          <div className="space-y-3">
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Countdown overlay during test race */}
              {testCountdown && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-4xl md:text-6xl font-black text-amber-400 animate-pulse">
                  {testCountdown}
                </div>
              )}

              {/* Test Race Winner Announcement */}
              {testRaceWinner && (
                <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-4 text-center space-y-2 animate-in fade-in">
                  <span className="text-3xl">{testRaceWinner === 'blue' ? '🔵' : '🟠'}</span>
                  <h4
                    className={`text-2xl font-black uppercase ${
                      testRaceWinner === 'blue' ? 'text-cyan-300' : 'text-amber-300'
                    }`}
                  >
                    {testRaceWinner === 'blue' ? 'ĐỘI XANH THẮNG TEST!' : 'ĐỘI CAM THẮNG TEST!'}
                  </h4>
                  <button
                    onClick={handleStartTestRace}
                    className="bg-slate-800 hover:bg-slate-700 text-xs text-white px-3 py-1.5 rounded-lg border border-slate-600"
                  >
                    Chạy thử lại
                  </button>
                </div>
              )}

              {/* Reticle ROI box */}
              <div className="absolute inset-x-[10%] inset-y-[10%] border-2 border-dashed border-cyan-400/50 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[10px] text-cyan-400/80 bg-slate-950/80 px-2 py-0.5 rounded font-mono">
                  Vùng quét thẻ
                </span>
              </div>
            </div>

            {/* Camera Select dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-400">Chọn Camera:</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => switchCamera(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Live Marker Detection Gauges */}
          <div className="space-y-4">
            {/* Blue Card Gauge */}
            <div className="bg-slate-950/80 border-2 border-cyan-500/50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-cyan-300 font-extrabold text-sm uppercase">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>THẺ ĐỘI XANH (BLUE)</span>
                </div>
                <span className="font-mono text-base text-cyan-400">{blueScore}%</span>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-3 border border-cyan-500/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-75"
                  style={{ width: `${blueScore}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>Khung hình ổn định: {blueStable} / {localSettings.minStableFrames}</span>
                <span className={blueScore >= 70 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {blueScore >= 70 ? '✅ Nhận diện tốt' : 'Chưa nhận diện'}
                </span>
              </div>
            </div>

            {/* Orange Card Gauge */}
            <div className="bg-slate-950/80 border-2 border-orange-500/50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-amber-300 font-extrabold text-sm uppercase">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  <span>THẺ ĐỘI CAM (ORANGE)</span>
                </div>
                <span className="font-mono text-base text-amber-400">{orangeScore}%</span>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-3 border border-orange-500/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-75"
                  style={{ width: `${orangeScore}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>Khung hình ổn định: {orangeStable} / {localSettings.minStableFrames}</span>
                <span className={orangeScore >= 70 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {orangeScore >= 70 ? '✅ Nhận diện tốt' : 'Chưa nhận diện'}
                </span>
              </div>
            </div>

            {/* Test Cam Race Button */}
            <button
              type="button"
              onClick={handleStartTestRace}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>🏃 TEST CHẠY THỬ CAM RACE (3-2-1-RUN)</span>
            </button>
          </div>
        </div>

        {/* Sliders for fine-tuning */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Hiệu chỉnh độ nhạy màu & Khung hình ổn định:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-300 font-bold">
                <span>Giữ camera trước khi nhận diện:</span>
                <span className="text-amber-400 font-bold">{localSettings.cameraHoldSeconds ?? 5}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={localSettings.cameraHoldSeconds ?? 5}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, cameraHoldSeconds: parseInt(e.target.value, 10) })
                }
                className="w-full accent-amber-400"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-300 font-bold">
                <span>Độ phủ tối thiểu thẻ:</span>
                <span className="text-cyan-400">{localSettings.minColorCoveragePercent}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.5"
                value={localSettings.minColorCoveragePercent}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, minColorCoveragePercent: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-300 font-bold">
                <span>Số frame ổn định khóa quyền:</span>
                <span className="text-cyan-400">{localSettings.minStableFrames} frame</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={localSettings.minStableFrames}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, minStableFrames: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-300 font-bold">
                <span>Ngưỡng hòa thời gian:</span>
                <span className="text-cyan-400">{localSettings.tieThresholdMs} ms</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={localSettings.tieThresholdMs}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, tieThresholdMs: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
          >
            Đóng
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs uppercase shadow-lg shadow-cyan-600/30"
          >
            Lưu cài đặt Camera
          </button>
        </div>
      </div>
    </div>
  );
};
