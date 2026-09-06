import { apiClient } from '../services/apiClient';

export interface CamRaceDetectionPayload {
  sessionId: string;
  questionId: string | number;
  questionOrder: number;
  winnerTeam: 'BLUE' | 'ORANGE' | 'TIE' | 'NONE';
  blueDetectedAt?: number | null;
  orangeDetectedAt?: number | null;
  timeDifferenceMs?: number | null;
  isTie?: boolean;
  isFalseStart?: boolean;
  detectionMethod?: 'CAMERA' | 'MANUAL';
  blueMarkerConfidence?: number;
  orangeMarkerConfidence?: number;
}

export interface CamRaceAnswerPayload {
  sessionId: string;
  questionId: string | number;
  teamCode: 'BLUE' | 'ORANGE';
  answer: string;
  answerType: 'RACE' | 'STEAL';
  roundNumber?: number;
}

export class CamRaceRepository {
  /**
   * Records webcam card detection race result (ONLY timing and winner team, NEVER video/frames/biometrics)
   */
  public static async recordRaceDetection(payload: CamRaceDetectionPayload): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('camRace.race.add', payload);
        return res.data;
      } catch (err) {
        console.warn('Failed to record cam race detection', err);
      }
    }
    return null;
  }

  /**
   * Submits selected answer for Cam Race question
   */
  public static async submitAnswer(payload: CamRaceAnswerPayload): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('camRace.answer.add', payload);
        return res.data;
      } catch (err) {
        console.warn('Failed to submit cam race answer to cloud', err);
      }
    }
    return null;
  }

  public static async completeQuestion(sessionId: string, currentQuestion: number): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('camRace.result.completeQuestion', {
          sessionId,
          currentQuestion,
        });
        return res.data;
      } catch (err) {
        console.warn('Failed to advance question in cloud', err);
      }
    }
    return null;
  }

  public static async listHistory(sessionId: string): Promise<any[]> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any[]>('camRace.history.listBySession', { sessionId });
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to list cam race history', err);
      }
    }
    return [];
  }
}
