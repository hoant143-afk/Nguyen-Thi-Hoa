import React, { useState, useRef } from 'react';
import {
  Database,
  Cloud,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  ShieldCheck,
  Zap,
  Activity,
  Copy,
  ExternalLink,
  Check,
} from 'lucide-react';
import { soundService } from '../../../services/soundService';
import { dataAdapter, HealthCheckResult } from '../../../services/dataAdapter';
import { BackupService, BackupPreview } from '../../../services/backupService';
import { apiClient } from '../../../services/apiClient';

interface AdminDatabaseTabProps {
  onDatabaseRestored: () => void;
}

export const AdminDatabaseTab: React.FC<AdminDatabaseTabProps> = ({ onDatabaseRestored }) => {
  const [dataMode, setDataMode] = useState<'local' | 'cloud'>(dataAdapter.getMode());
  const [apiUrlInput, setApiUrlInput] = useState<string>(dataAdapter.getApiUrl());
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [queueCount, setQueueCount] = useState<number>(dataAdapter.getPendingQueueCount());

  // Backup state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);

  // Restore state
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'skip_existing'>('merge');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy code helper
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Check Health handler
  const handleCheckHealth = async () => {
    soundService.playClick();
    setIsCheckingHealth(true);
    try {
      const res = await dataAdapter.checkHealth();
      setHealthStatus(res);
      setQueueCount(dataAdapter.getPendingQueueCount());
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Switch Data Mode
  const handleToggleMode = (mode: 'local' | 'cloud') => {
    soundService.playClick();
    dataAdapter.setMode(mode);
    setDataMode(mode);
    setHealthStatus(null);
  };

  // Save API URL
  const handleSaveApiUrl = () => {
    soundService.playClick();
    dataAdapter.setApiUrl(apiUrlInput.trim());
    setBackupSuccessMsg('Đã lưu cấu hình Google Apps Script Web App URL!');
    setTimeout(() => setBackupSuccessMsg(null), 3000);
  };

  // Sync Offline Queue
  const handleSyncQueue = async () => {
    soundService.playClick();
    setIsSyncingQueue(true);
    try {
      const res = await dataAdapter.flushPendingQueue();
      setQueueCount(dataAdapter.getPendingQueueCount());
      if (res.flushedCount > 0) {
        setBackupSuccessMsg(`Đã đồng bộ thành công ${res.flushedCount} sự kiện lên Google Sheets!`);
      } else {
        setBackupSuccessMsg('Hàng đợi đã trống hoặc không có sự kiện mới.');
      }
      setTimeout(() => setBackupSuccessMsg(null), 3500);
    } finally {
      setIsSyncingQueue(false);
    }
  };

  // Export Backup
  const handleExportBackup = async () => {
    soundService.playClick();
    setIsExporting(true);
    try {
      await BackupService.exportBackup();
      setBackupSuccessMsg('Đã tạo và tải file sao lưu JSON an toàn thành công!');
      setTimeout(() => setBackupSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(`Lỗi xuất backup: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  // File selected for restore
  const handleFileSelected = async (file: File) => {
    if (!file) return;
    setRestoreFile(file);
    setRestoreError(null);
    setRestoreSuccessMsg(null);

    const validation = await BackupService.validateBackupFile(file);
    if (!validation.isValid) {
      setRestoreError(validation.error || 'Tệp sao lưu không hợp lệ.');
      setBackupPreview(null);
      return;
    }

    setBackupPreview(validation.preview || null);
  };

  // Confirm Restore
  const handleConfirmRestore = async () => {
    if (!restoreFile) return;
    soundService.playClick();
    setIsRestoring(true);
    setRestoreError(null);
    try {
      const res = await BackupService.restoreBackup(restoreFile, restoreMode);
      if (res.success) {
        setRestoreSuccessMsg(
          `Khôi phục thành công! Đã nạp ${res.itemCount} bản ghi (Chế độ: ${
            restoreMode === 'merge' ? 'Ghi đè/Cập nhật' : 'Bỏ qua bản ghi cũ'
          }).`
        );
        setBackupPreview(null);
        setRestoreFile(null);
        onDatabaseRestored();
      } else {
        setRestoreError(res.error || 'Khôi phục không thành công.');
      }
    } catch (err: any) {
      setRestoreError(err.message || 'Lỗi xử lý tệp sao lưu.');
    } finally {
      setIsRestoring(false);
    }
  };

  const isConnected = dataMode === 'cloud' && healthStatus?.status === 'CONNECTED';

  return (
    <div className="space-y-6">
      {/* Top Banner: Cloud Status (Requirement 10) */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              dataMode === 'cloud'
                ? isConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              <Database className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white">TRẠNG THÁI DATABASE:</span>
                {dataMode === 'cloud' ? (
                  isConnected ? (
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      🟢 DATABASE CLOUD ĐÃ KẾT NỐI
                    </span>
                  ) : (
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      🔴 CHƯA KẾT NỐI DATABASE
                    </span>
                  )
                ) : (
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    💻 CHẾ ĐỘ CỤC BỘ (LOCAL MODE)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {dataMode === 'cloud'
                  ? 'Dữ liệu được lưu trữ trực tiếp vào Google Sheets thông qua Google Apps Script Web App.'
                  : 'Dữ liệu được lưu trữ an toàn trong trình duyệt cục bộ (localStorage). Không cần kết nối Internet.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* KIỂM TRA KẾT NỐI BUTTON (Requirement 10) */}
            <button
              type="button"
              disabled={isCheckingHealth}
              onClick={handleCheckHealth}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Activity className={`w-4 h-4 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              <span>{isCheckingHealth ? 'ĐANG KIỂM TRA...' : 'KIỂM TRA KẾT NỐI'}</span>
            </button>
          </div>
        </div>

        {/* Health Check Details */}
        {healthStatus && (
          <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-4 ${
            healthStatus.status === 'CONNECTED'
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {healthStatus.status === 'CONNECTED' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <p className="font-black text-sm">
                  {healthStatus.status === 'CONNECTED'
                    ? 'Máy chủ Google Apps Script phản hồi tốt!'
                    : 'Không thể kết nối đến Web App URL!'}
                </p>
                <p className="opacity-80 mt-0.5">
                  Thời gian phản hồi: {healthStatus.responseTimeMs ?? 0}ms • Thời điểm kiểm tra:{' '}
                  {new Date(healthStatus.timestamp).toLocaleTimeString('vi-VN')}
                </p>
              </div>
            </div>

            {queueCount > 0 && (
              <button
                type="button"
                disabled={isSyncingQueue}
                onClick={handleSyncQueue}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                <span>ĐỒNG BỘ {queueCount} SỰ KIỆN HÀNG ĐỢI</span>
              </button>
            )}
          </div>
        )}

        {/* Mode Selector Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div
            onClick={() => handleToggleMode('cloud')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              dataMode === 'cloud'
                ? 'bg-purple-950/30 border-purple-500/80 shadow-md'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-purple-400" />
                Chế độ Google Sheets Cloud
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${dataMode === 'cloud' ? 'bg-purple-400' : 'bg-slate-600'}`} />
            </div>
            <p className="text-[11px] text-slate-400">
              Đồng bộ dữ liệu phiên chơi, kho câu hỏi trực tiếp vào Google Sheets theo thời gian thực.
            </p>
          </div>

          <div
            onClick={() => handleToggleMode('local')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              dataMode === 'local'
                ? 'bg-blue-950/30 border-blue-500/80 shadow-md'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-400" />
                Chế độ Lưu trữ Cục bộ (Local)
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${dataMode === 'local' ? 'bg-blue-400' : 'bg-slate-600'}`} />
            </div>
            <p className="text-[11px] text-slate-400">
              Không gửi dữ liệu ra ngoài Internet, lưu trong trình duyệt lớp học. Chạy nhanh, ổn định khi mạng yếu.
            </p>
          </div>
        </div>

        {/* URL Configuration Input */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-slate-300">
            Đường dẫn Google Apps Script Web App (/exec):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrlInput}
              onChange={(e) => setApiUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveApiUrl}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer transition-all shrink-0"
            >
              Lưu URL
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {backupSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{backupSuccessMsg}</span>
        </div>
      )}

      {/* Backup & Restore Grid (Requirements 26 & 27) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BACKUP BOX (Requirement 26) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  📦 SAO LƯU HỆ THỐNG (BACKUP)
                </h3>
                <p className="text-xs text-slate-400">Xuất toàn bộ 10 bảng dữ liệu EDUPLAY ra tệp JSON</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tệp sao lưu chứa đầy đủ: Cài đặt hệ thống, danh mục game, lớp học, bộ câu hỏi, lịch sử phiên chơi, đội thi đấu, điểm số và giấy chứng nhận.
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tiêu chuẩn bảo mật lớp học:
              </span>
              <p>Tuyệt đối không xuất dữ liệu camera, hình ảnh hay thông tin nhận diện học sinh.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportBackup}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'ĐANG XUẤT SAO LƯU...' : '📦 XUẤT FILE SAO LƯU JSON'}</span>
            </button>
          </div>
        </div>

        {/* RESTORE BOX (Requirement 27) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  📥 KHÔI PHỤC DỮ LIỆU (RESTORE)
                </h3>
                <p className="text-xs text-slate-400">Nạp lại hệ thống từ tệp sao lưu JSON đã lưu</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Hỗ trợ kiểm tra tính hợp lệ của cấu trúc trước khi phục hồi. Bạn có thể chọn ghi đè cập nhật hoặc chỉ nạp những bản ghi mới.
            </p>

            {/* File Input Selection */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                fileInputRef.current?.click();
              }}
              className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl text-xs text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>{restoreFile ? restoreFile.name : 'Chọn tệp sao lưu .json từ máy tính...'}</span>
            </button>

            {/* Error message */}
            {restoreError && (
              <div className="p-3 bg-rose-950/20 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            {/* Success message */}
            {restoreSuccessMsg && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{restoreSuccessMsg}</span>
              </div>
            )}

            {/* Preview & Options when file is valid */}
            {backupPreview && (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold">Ngày tạo bản sao lưu:</span>
                  <span className="text-slate-400">{new Date(backupPreview.exportedAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold">Tổng số bản ghi:</span>
                  <span className="font-black text-cyan-400">{backupPreview.totalItems} mục</span>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Chế độ khôi phục:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        restoreMode === 'merge'
                          ? 'bg-cyan-950/30 border-cyan-500 text-white font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <p className="font-bold">Ghi đè / Cập nhật</p>
                      <p className="text-[10px] opacity-70">Làm mới dữ liệu trùng</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreMode('skip_existing')}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        restoreMode === 'skip_existing'
                          ? 'bg-cyan-950/30 border-cyan-500 text-white font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <p className="font-bold">Bỏ qua bản ghi cũ</p>
                      <p className="text-[10px] opacity-70">Chỉ thêm mục mới</p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={!backupPreview || isRestoring}
              onClick={handleConfirmRestore}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Upload className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
              <span>{isRestoring ? 'ĐANG KHÔI PHỤC DỮ LIỆU...' : 'XÁC NHẬN KHÔI PHỤC BACKUP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
