import { apiClient } from '../services/apiClient';

export interface RandomTeamPickPayload {
  sessionId: string;
  pickNumber?: number;
  pickType?: 'TEAM' | 'QUESTION' | 'CHALLENGE' | 'REWARD';
  selectedTeamId?: string;
  selectedTeamName: string;
  selectedValue?: string;
  excludedAfterPick?: boolean;
}

export class RandomTeamRepository {
  public static async recordPick(payload: RandomTeamPickPayload): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('randomTeam.pick.add', payload);
        return res.data;
      } catch (err) {
        console.warn('Failed to record random team pick to cloud', err);
      }
    }
    return null;
  }

  public static async listHistory(sessionId: string): Promise<any[]> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest<any[]>('randomTeam.history.listBySession', { sessionId });
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to load random team history from cloud', err);
      }
    }
    return [];
  }

  public static async resetSession(sessionId: string): Promise<any> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest('randomTeam.resetSession', { sessionId });
        return res.data;
      } catch (err) {
        console.warn('Failed to reset random team session in cloud', err);
      }
    }
    return null;
  }
}
