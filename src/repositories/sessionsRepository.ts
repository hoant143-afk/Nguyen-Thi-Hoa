import { apiClient } from '../services/apiClient';

export interface CloudSession {
  id: string;
  sessionCode: string;
  gameSlug: string;
  activityName: string;
  className: string;
  status: string;
  currentRound: number;
  currentQuestion: number;
  totalQuestions: number;
  startedAt: string;
  finishedAt?: string;
  winnerTeamId?: string;
  winnerName?: string;
  teams?: any[];
}

export class SessionsRepository {
  public static async createSession(params: {
    gameSlug?: string;
    gameCode?: string;
    sessionId?: string;
    status?: string;
    teamCount?: number;
    teams?: any[];
    activityName?: string;
    classId?: string;
    className?: string;
    totalQuestions?: number;
    blueTeamName?: string;
    orangeTeamName?: string;
  }): Promise<CloudSession | null> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<CloudSession>('sessions.create', {
          gameSlug: params.gameSlug || params.gameCode?.toLowerCase() || 'game',
          ...params,
        });
        if (res.success && res.data) {
          // Store active session id locally for recovery
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('eduplay_active_cloud_session_id', res.data.id);
          }
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to create cloud session', err);
      }
    }
    return null;
  }

  public static async finalizeSession(params: string | { sessionId: string; [key: string]: any }): Promise<any> {
    const id = typeof params === 'string' ? params : params.sessionId;
    const payload = typeof params === 'string' ? { id } : { id, ...params };
    if (apiClient.getMode() === 'cloud' && id) {
      try {
        const res = await apiClient.apiRequest('sessions.finish', payload);
        return res.data;
      } catch (err) {
        console.warn('Failed to finalize cloud session', err);
      }
    }
    return null;
  }

  public static async finishSession(sessionId: string): Promise<any> {
    return this.finalizeSession(sessionId);
  }

  public static async updateSession(sessionId: string, updates: Record<string, any>): Promise<any> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest('sessions.update', { id: sessionId, ...updates });
        return res.data;
      } catch (err) {
        console.warn('Failed to update cloud session', err);
      }
    }
    return null;
  }

  public static async listSessions(): Promise<CloudSession[]> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<CloudSession[]>('sessions.list');
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to load sessions from cloud', err);
      }
    }
    return [];
  }
}
