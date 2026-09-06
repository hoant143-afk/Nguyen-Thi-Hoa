import { apiClient } from '../services/apiClient';

export interface ScoreEventPayload {
  sessionId: string;
  gameSlug: string;
  roundNumber?: number;
  questionId?: string | number;
  teamCode: string;
  eventType: 'CORRECT' | 'WRONG' | 'RACE_CORRECT' | 'RACE_WRONG' | 'STEAL_CORRECT' | 'STEAL_WRONG' | 'SPECIAL_CORRECT' | 'BONUS' | 'PENALTY' | 'MANUAL_ADJUSTMENT' | 'WHEEL_REWARD';
  points?: number;
  eventKey?: string;
  note?: string;
}

export class ScoresRepository {
  public static async addScoreEvent(payload: {
    sessionId: string;
    gameCode?: string;
    gameSlug?: string;
    teamCode: string;
    teamName?: string;
    deltaPoints: number;
    totalScoreAfter?: number;
    roundNumber?: number;
    reason?: string;
  }): Promise<any> {
    return this.recordScore({
      sessionId: payload.sessionId,
      gameSlug: payload.gameSlug || payload.gameCode?.toLowerCase() || 'game',
      teamCode: payload.teamCode,
      points: payload.deltaPoints,
      roundNumber: payload.roundNumber,
      eventType: payload.deltaPoints >= 0 ? 'BONUS' : 'PENALTY',
      note: payload.reason,
    });
  }

  public static async recordScore(payload: ScoreEventPayload): Promise<any> {
    const eventKey = payload.eventKey || `${payload.sessionId}_${payload.questionId || 'rnd'}_${payload.teamCode}_${payload.eventType}_${Date.now()}`;
    
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('scores.addEvent', {
          ...payload,
          eventKey,
        });
        return res.data;
      } catch (err) {
        console.warn('Failed to record score event to cloud, queued offline', err);
      }
    }
    return null;
  }

  public static async getScoresBySession(sessionId: string): Promise<any[]> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest<any[]>('scores.getBySession', { sessionId });
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to get scores by session', err);
      }
    }
    return [];
  }
}
