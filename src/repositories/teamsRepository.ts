import { apiClient } from '../services/apiClient';

export interface CloudTeam {
  id: string;
  sessionId: string;
  teamCode: string;
  teamName: string;
  teamColor: string;
  score: number;
  rank: number;
  raceWins?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  stealWins?: number;
  specialCorrect?: number;
}

export class TeamsRepository {
  public static async listBySession(sessionId: string): Promise<CloudTeam[]> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest<CloudTeam[]>('teams.listBySession', { sessionId });
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to list teams by session', err);
      }
    }
    return [];
  }

  public static async getScores(sessionId: string): Promise<Record<string, number>> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest<Record<string, number>>('teams.getScore', { sessionId });
        if (res.success && res.data) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to get team scores', err);
      }
    }
    return {};
  }
}
