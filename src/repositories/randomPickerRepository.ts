import { apiClient } from '../services/apiClient';

export class RandomPickerRepository {
  public static async recordPick(payload: {
    sessionId?: string;
    studentId?: string;
    studentName: string;
    pickNumber?: number;
    excludedAfterPick?: boolean;
    className?: string;
    actionType?: string;
  }): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('randomPicker.addPick', {
          sessionId: payload.sessionId || 'session_general',
          ...payload,
        });
        return res.data;
      } catch (err) {
        console.warn('Failed to record random pick to cloud', err);
      }
    }
    return null;
  }

  public static async listHistory(sessionId: string): Promise<any[]> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest<any[]>('randomPicker.listHistory', { sessionId });
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to load random picker history', err);
      }
    }
    return [];
  }
}
