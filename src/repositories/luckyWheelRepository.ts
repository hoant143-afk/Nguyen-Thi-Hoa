import { apiClient } from '../services/apiClient';

export class LuckyWheelRepository {
  public static async logSpin(payload: {
    sessionId?: string;
    segmentLabel?: string;
    rewardType?: string;
    appliedTarget?: string;
  }): Promise<any> {
    return this.recordSpin({
      sessionId: payload.sessionId,
      selectedName: payload.segmentLabel,
      rewardTitle: payload.appliedTarget,
      reward: payload.rewardType,
    });
  }

  public static async recordSpin(payload: {
    sessionId?: string;
    spinNumber?: number;
    wheelType?: string;
    selectedId?: string;
    selectedName?: string;
    reward?: string;
    rewardTitle?: string;
    points?: number;
    teamCode?: string;
  }): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('luckyWheel.addSpin', {
          sessionId: payload.sessionId || 'session_general',
          selectedName: payload.selectedName || payload.rewardTitle || 'Mục quay',
          reward: payload.reward || payload.rewardTitle || '',
          ...payload,
        });
        return res.data;
      } catch (err) {
        console.warn('Failed to record lucky wheel spin to cloud', err);
      }
    }
    return null;
  }

  public static async listHistory(sessionId: string): Promise<any[]> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest<any[]>('luckyWheel.listHistory', { sessionId });
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to load lucky wheel history', err);
      }
    }
    return [];
  }
}
