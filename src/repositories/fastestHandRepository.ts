import { apiClient } from '../services/apiClient';

export interface FastestHandBuzzPayload {
  sessionId: string;
  roundNumber: number;
  questionId?: string | number;
  teamId?: string;
  teamCode: string;
  buzzTimestamp?: number;
  responseTimeMs?: number;
}

export interface FastestHandAnswerPayload {
  sessionId: string;
  roundNumber: number;
  questionId?: string | number;
  teamId?: string;
  teamCode: string;
  answer: string;
  isCorrect?: boolean;
}

export class FastestHandRepository {
  /**
   * Records first buzz with server-side winner lock
   */
  public static async recordBuzz(payload: FastestHandBuzzPayload): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('fastestHand.buzz', payload);
        return res;
      } catch (err) {
        console.warn('Failed to record fastest hand buzz to cloud', err);
      }
    }
    return { success: true, data: payload };
  }

  /**
   * Submits answer for fastest hand round
   */
  public static async submitAnswer(payload: FastestHandAnswerPayload): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('fastestHand.answer', payload);
        return res;
      } catch (err) {
        console.warn('Failed to submit fastest hand answer to cloud', err);
      }
    }
    return { success: true, data: payload };
  }

  /**
   * Advances question/round in cloud session
   */
  public static async completeQuestion(sessionId: string, currentQuestion: number): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('fastestHand.question.complete', {
          sessionId,
          questionOrder: currentQuestion,
        });
        return res.data;
      } catch (err) {
        console.warn('Failed to advance fastest hand question in cloud', err);
      }
    }
    return null;
  }

  /**
   * Lists round history for session
   */
  public static async listHistory(sessionId: string): Promise<any[]> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest<any[]>('fastestHand.history.listBySession', { sessionId });
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to load fastest hand history from cloud', err);
      }
    }
    return [];
  }
}
