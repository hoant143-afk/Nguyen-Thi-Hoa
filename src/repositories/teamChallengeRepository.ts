import { apiClient } from '../services/apiClient';

export interface TeamChallengeAnswerPayload {
  sessionId: string;
  roundNumber?: number;
  questionId?: string | number;
  teamId: string;
  answer: string;
  isCorrect?: boolean;
  points?: number;
}

export interface TeamChallengeScorePayload {
  sessionId: string;
  teamId: string;
  points: number;
  note?: string;
}

export class TeamChallengeRepository {
  public static async submitAnswer(payload: TeamChallengeAnswerPayload): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('teamChallenge.answer.add', payload);
        return res.data;
      } catch (err) {
        console.warn('Failed to submit team challenge answer to cloud', err);
      }
    }
    return null;
  }

  public static async addScore(payload: TeamChallengeScorePayload): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('teamChallenge.score.add', payload);
        return res.data;
      } catch (err) {
        console.warn('Failed to add score for team challenge in cloud', err);
      }
    }
    return null;
  }

  public static async completeRound(sessionId: string, roundNumber: number): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('teamChallenge.round.complete', {
          sessionId,
          roundNumber,
        });
        return res.data;
      } catch (err) {
        console.warn('Failed to complete team challenge round in cloud', err);
      }
    }
    return null;
  }

  public static async listHistory(sessionId: string): Promise<any[]> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest<any[]>('teamChallenge.history.listBySession', { sessionId });
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to load team challenge history from cloud', err);
      }
    }
    return [];
  }
}
