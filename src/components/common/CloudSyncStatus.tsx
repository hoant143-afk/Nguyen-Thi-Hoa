import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  X,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { apiClient, SyncStatus } from '../../services/apiClient';

export const CloudSyncStatus: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>(apiClient.getStatus());
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>(apiClient.getApiUrl());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = apiClient.subscribe((newStatus) => {
      setStatus(newStatus);
      setCustomUrl(apiClient.getApiUrl());
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await apiClient.flushPendingQueue();
      setSyncFeedback(`Đã đồng bộ ${result.synced} sự kiện (${result.failed} lỗi)`);
    } catch (e: any) {
      setSyncFeedback('Lỗi đồng bộ: ' + (e?.message || 'Không rõ'));
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleSaveConfig = () => {
    apiClient.setApiUrl(customUrl);
    setShowConfigModal(false);
  };

  return (
    <>
      {/* Top Banner Warning if in Cloud Mode but disconnected */}
      {status.mode === 'cloud' && !status.isCloudReachable && (
        <div className="bg-amber-950/80 border-b border-amber-600/50 text-amber-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Mất kết nối Google Sheets:</strong> EDUPLAY đang tạm thời lưu kết quả trên trình duyệt. Sẽ tự động tải lên khi có mạng.
            </span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Đang thử lại...' : 'Thử kết nối lại'}
          </button>
        </div>
      )}

      {/* Header Indicator Button */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setShowConfigModal(true)}
          title="Cấu hình kết nối Google Sheet / Local Database"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            status.mode === 'cloud'
              ? status.isCloudReachable
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/40'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80'
          }`}
        >
          {status.mode === 'cloud' ? (
            status.isCloudReachable ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Sheets Cloud</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )
          ) : (
            <>
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Local Storage</span>
            </>
          )}

          {status.pendingEventsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-amber-500 text-slate-950 font-bold rounded-full">
              {status.pendingEventsCount}
            </span>
          )}
        </button>
      </div>

      {/* Modal Dialog for Mode Selection & Apps Script Web App URL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Dữ liệu & Kết nối Cloud</h3>
                  <p className="text-xs text-slate-400">Đồng bộ Google Sheets Database qua Apps Script API</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Chế độ lưu trữ dữ liệu
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => apiClient.setMode('local')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    status.mode === 'local'
                      ? 'bg-blue-600/20 border-blue-500 text-slate-100 ring-2 ring-blue-500/20'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">💻 Local Mode</span>
                    {status.mode === 'local' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className="text-xs text-slate-400">
                    Lưu trữ trên trình duyệt (Offline). Phù hợp chơi nhanh không cần Internet.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => apiClient.setMode('cloud')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    status.mode === 'cloud'
                      ? 'bg-emerald-600/20 border-emerald-500 text-slate-100 ring-2 ring-emerald-500/20'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">☁️ Cloud Mode</span>
                    {status.mode === 'cloud' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-slate-400">
                    Kết nối đồng bộ trực tiếp với Google Sheets qua Apps Script Web App.
                  </p>
                </button>
              </div>
            </div>

            {/* Cloud URL Configuration */}
            {status.mode === 'cloud' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Google Apps Script Web App URL (/exec)
                  </label>
                  <span className={`text-[11px] px-2 py-0.5 rounded ${
                    status.isCloudReachable
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-amber-950 text-amber-300 border border-amber-700'
                  }`}>
                    {status.isCloudReachable ? '● Đã kết nối' : '○ Chưa kết nối'}
                  </span>
                </div>

                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 Deploy file <code>EduplayDatabase.gs</code> trong Google Apps Script dưới dạng <strong>Web App</strong> (Execute as: <em>Me</em>, Who has access: <em>Anyone</em>) rồi dán link /exec vào đây.
                </p>

                {/* Queue & Resync status */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Hàng đợi chờ đồng bộ: <strong>{status.pendingEventsCount}</strong> sự kiện</span>
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing || status.pendingEventsCount === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-40 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    Đồng bộ ngay
                  </button>
                </div>

                {syncFeedback && (
                  <div className="text-xs text-emerald-400 font-medium">
                    {syncFeedback}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
