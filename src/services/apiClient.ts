/**
 * ==============================================================================
 * 🎓 EDUPLAY - API CLIENT & SYNC ENGINE
 * Architecture: Hybrid Local/Cloud with Offline Fallback & Event Deduplication
 * ==============================================================================
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface ApiRequestOptions {
  timeoutMs?: number;
  retries?: number;
  skipQueueOnFail?: boolean;
}

export type DataMode = 'local' | 'cloud';

export interface SyncStatus {
  mode: DataMode;
  isOnline: boolean;
  isCloudConfigured: boolean;
  isCloudReachable: boolean;
  pendingEventsCount: number;
  lastSyncTime: number | null;
  lastError: string | null;
}

export interface PendingScoreEvent {
  eventKey: string;
  action: string;
  data: any;
  timestamp: number;
  retries: number;
}

const PENDING_QUEUE_KEY = 'eduplay_pending_events_queue_v1';
const DATA_MODE_OVERRIDE_KEY = 'eduplay_user_data_mode_override';
const DEFAULT_TIMEOUT_MS = 12000;

class EduplayApiClient {
  private apiUrl: string;
  private currentMode: DataMode;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isCloudReachable: boolean = true;
  private lastError: string | null = null;
  private lastSyncTime: number | null = null;
  private listeners: Array<(status: SyncStatus) => void> = [];

  constructor() {
    // 1. Resolve API URL from Vite environment variable
    const envUrl = (import.meta as any).env?.VITE_APPS_SCRIPT_API_URL || '';
    this.apiUrl = typeof envUrl === 'string' ? envUrl.trim() : '';

    // 2. Resolve initial Data Mode (Check localStorage override or env var)
    const savedMode = typeof localStorage !== 'undefined' ? localStorage.getItem(DATA_MODE_OVERRIDE_KEY) as DataMode : null;
    const envMode = (import.meta as any).env?.VITE_DATA_MODE as DataMode;

    if (savedMode === 'cloud' || savedMode === 'local') {
      this.currentMode = savedMode;
    } else if (envMode === 'cloud') {
      this.currentMode = 'cloud';
    } else {
      this.currentMode = 'local';
    }

    // 3. Listen to browser online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyStatusChange();
        this.flushPendingQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.isCloudReachable = false;
        this.notifyStatusChange();
      });
    }
  }

  /**
   * Subscribe to connection status changes
   */
  public subscribe(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    callback(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.listeners.forEach(cb => {
      try {
        cb(status);
      } catch (err) {
        console.error('Error in status subscriber:', err);
      }
    });
  }

  public getStatus(): SyncStatus {
    return {
      mode: this.currentMode,
      isOnline: this.isOnline,
      isCloudConfigured: !!this.apiUrl,
      isCloudReachable: this.isCloudReachable && this.isOnline,
      pendingEventsCount: this.getPendingEvents().length,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }

  public getMode(): DataMode {
    return this.currentMode;
  }

  public setMode(mode: DataMode): void {
    this.currentMode = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DATA_MODE_OVERRIDE_KEY, mode);
    }
    this.notifyStatusChange();
  }

  public setApiUrl(url: string): void {
    this.apiUrl = url.trim();
    this.notifyStatusChange();
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Central Core API Request
   * Note: POST with Content-Type text/plain avoids CORS preflight OPTIONS failures
   * on Google Apps Script Web Apps.
   */
  public async apiRequest<T = any>(
    action: string,
    data: any = {},
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    // If not in cloud mode or no API URL configured, return graceful local hint
    if (this.currentMode !== 'cloud' || !this.apiUrl) {
      return {
        success: false,
        error: 'LOCAL_MODE',
        message: 'Ứng dụng đang chạy ở chế độ Cục bộ (Local Mode).',
      };
    }

    if (!this.isOnline) {
      this.handleOfflineFailure(action, data, options);
      return {
        success: false,
        error: 'NETWORK_OFFLINE',
        message: 'Mất kết nối Internet. Dữ liệu đã được lưu tạm để đồng bộ sau.',
      };
    }

    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    const maxRetries = options.retries !== undefined ? options.retries : (this.isReadAction(action) ? 2 : 0);

    let attempts = 0;
    while (attempts <= maxRetries) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Apps Script compatible POST payload
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          // Using text/plain prevents CORS preflight in Apps Script
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: action,
            data: data || {},
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const json: ApiResponse<T> = await response.json();

        // Successful communication
        this.isCloudReachable = true;
        this.lastError = null;
        this.lastSyncTime = Date.now();
        this.notifyStatusChange();

        return json;
      } catch (err: any) {
        console.warn(`[EDUPLAY API] Attempt ${attempts} failed for action "${action}":`, err);
        
        if (attempts > maxRetries) {
          this.isCloudReachable = false;
          this.lastError = err?.message || 'Không thể kết nối máy chủ Google Sheets';
          this.notifyStatusChange();

          // If this was a score or mutation event, queue it locally
          this.handleOfflineFailure(action, data, options);

          return {
            success: false,
            error: 'CONNECTION_FAILED',
            message: this.lastError || 'Lỗi kết nối máy chủ đám mây.',
          };
        }

        // Wait brief delay before retry
        await new Promise(res => setTimeout(res, 800 * attempts));
      }
    }

    return {
      success: false,
      error: 'UNKNOWN_REQUEST_FAILURE',
      message: 'Yêu cầu không thể hoàn tất.',
    };
  }

  private isReadAction(action: string): boolean {
    return (
      action.endsWith('.get') ||
      action.endsWith('.list') ||
      action.endsWith('.listByClass') ||
      action.endsWith('.listByBank') ||
      action.endsWith('.listBySession') ||
      action.endsWith('.top3')
    );
  }

  private handleOfflineFailure(action: string, data: any, options: ApiRequestOptions): void {
    if (options.skipQueueOnFail) return;

    // Only queue non-read events that mutate scores or state
    if (this.isReadAction(action)) return;

    const eventKey = data?.eventKey || `queue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pendingEvents = this.getPendingEvents();

    // Prevent duplicate entries in offline queue
    if (!pendingEvents.some(p => p.eventKey === eventKey)) {
      pendingEvents.push({
        eventKey: eventKey,
        action: action,
        data: data,
        timestamp: Date.now(),
        retries: 0,
      });
      this.savePendingEvents(pendingEvents);
      this.notifyStatusChange();
    }
  }

  // ==========================================
  // PENDING QUEUE & RE-SYNC
  // ==========================================

  public getPendingEvents(): PendingScoreEvent[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(PENDING_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private savePendingEvents(events: PendingScoreEvent[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(events));
      }
    } catch (e) {
      console.error('Error saving pending events queue', e);
    }
  }

  /**
   * Manually or automatically flush the offline queue when connection restores
   */
  public async flushPendingQueue(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline || !this.apiUrl || this.currentMode !== 'cloud') {
      return { synced: 0, failed: 0 };
    }

    const queue = this.getPendingEvents();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: PendingScoreEvent[] = [];

    for (const item of queue) {
      try {
        const res = await this.apiRequest(item.action, item.data, {
          skipQueueOnFail: true,
          retries: 1,
        });

        if (res.success || res.error === 'DUPLICATE_SCORE_EVENT') {
          // Successfully synced (or already recorded on server)
          synced++;
        } else {
          item.retries = (item.retries || 0) + 1;
          if (item.retries < 5) {
            remaining.push(item);
          }
          failed++;
        }
      } catch {
        item.retries = (item.retries || 0) + 1;
        if (item.retries < 5) {
          remaining.push(item);
        }
        failed++;
      }
    }

    this.savePendingEvents(remaining);
    this.notifyStatusChange();
    return { synced, failed };
  }
}

export const apiClient = new EduplayApiClient();
