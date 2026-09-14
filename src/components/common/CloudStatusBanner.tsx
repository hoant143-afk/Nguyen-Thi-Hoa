import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiClient, SyncStatus } from '../../services/apiClient';
import { soundService } from '../../services/soundService';

export const CloudStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>(() => apiClient.getStatus());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsub = apiClient.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsub();
  }, []);

  const handleSyncNow = async () => {
    soundService.playClick();
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await apiClient.flushPendingQueue();
      if (res.failed === 0) {
        setSyncFeedback(`Đã đồng bộ ${res.synced} sự kiện!`);
      } else {
        setSyncFeedback(`Đã đồng bộ ${res.synced}, còn lại ${res.failed} đang chờ.`);
      }
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch {
      setSyncFeedback('Chưa thể kết nối lại.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Only show if Cloud mode is enabled and either offline, disconnected or has pending events
  const isCloudMode = status.mode === 'cloud';
  const hasConnectionIssue = isCloudMode && (!status.isOnline || !status.isCloudReachable);
  const hasPending = status.pendingEventsCount > 0;

  if (!hasConnectionIssue && !hasPending && !syncFeedback) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300">
      <div className={`p-3.5 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center justify-between gap-3 ${
        hasConnectionIssue
          ? 'bg-slate-900/95 border-amber-500/50 text-amber-200'
          : 'bg-slate-900/95 border-cyan-500/50 text-cyan-200'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            hasConnectionIssue ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
          }`}>
            {hasConnectionIssue ? <WifiOff className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black tracking-wide uppercase truncate flex items-center gap-1.5">
              <span>{hasConnectionIssue ? '⚠️ MẤT KẾT NỐI CLOUD' : '🔄 HÀNG ĐỢI ĐỒNG BỘ'}</span>
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {syncFeedback || (
                hasConnectionIssue
                  ? 'Trò chơi vẫn tiếp tục trên thiết bị.'
                  : `Đang lưu tạm ${status.pendingEventsCount} sự kiện trên thiết bị.`
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isSyncing}
          onClick={handleSyncNow}
          className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>ĐỒNG BỘ LẠI</span>
        </button>
      </div>
    </div>
  );
};
