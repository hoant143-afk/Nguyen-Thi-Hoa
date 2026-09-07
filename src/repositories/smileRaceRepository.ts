import { apiClient } from '../services/apiClient';
import { EduplayStorage } from '../services/eduplayStorage';

export interface SmileRaceResultRecord {
  sessionId: string;
  questionId: number | string;
  winnerTeamId: string | null;
  winnerTeamName: string | null;
  winnerTimestamp: number | null;
  reactionTimeMs: number | null;
  smileScore: number | null;
  markerConfidence: number | null;
  isTie: boolean;
  detectionMethod: string;
  answerCorrect: boolean;
  stealTeamId: string | null;
  stealCorrect: boolean | null;
  pointsAwarded: number;
  playedAt: number;
}

const SMILE_RACE_RESULTS_KEY = 'eduplay_smile_race_results';
const SMILE_RACE_SETTINGS_KEY = 'eduplay_smile_race_settings';

export class SmileRaceRepository {
  public static loadSettings() {
    try {
      const data = localStorage.getItem(SMILE_RACE_SETTINGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }
    return null;
  }

  public static saveSettings(settings: any) {
    try {
      localStorage.setItem(SMILE_RACE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  public static recordRaceResult(record: SmileRaceResultRecord): void {
    try {
      const listStr = localStorage.getItem(SMILE_RACE_RESULTS_KEY);
      const list: SmileRaceResultRecord[] = listStr ? JSON.parse(listStr) : [];
      list.push(record);
      // Keep last 100
      if (list.length > 100) list.splice(0, list.length - 100);
      localStorage.setItem(SMILE_RACE_RESULTS_KEY, JSON.stringify(list));

      // Also record to Eduplay general game history
      EduplayStorage.addHistoryEntry({
        gameId: 'smile-race',
        gameName: 'SMILE RACE – Đại chiến Nụ cười',
        className: '5A1',
        timestamp: Date.now(),
        winner: record.winnerTeamName || 'Không có đội',
        summary: `Câu ${record.questionId}: ${record.winnerTeamName || 'Không có đội'} ${
          record.answerCorrect ? 'trả lời đúng (+ ' + record.pointsAwarded + 'đ)' : 'trả lời sai'
        }${record.stealTeamId ? ' (Có cướp quyền)' : ''}`,
        details: {
          sessionId: record.sessionId,
          winnerTeamName: record.winnerTeamName,
          reactionTimeMs: record.reactionTimeMs,
          smileScore: record.smileScore,
          pointsAwarded: record.pointsAwarded,
        },
      });

      // If Cloud Mode is active on Google Sheets, send metadata (Strictly no biometric/images)
      if (apiClient.getMode() === 'cloud') {
        apiClient.apiRequest('events.record', {
          sessionId: record.sessionId,
          gameSlug: 'smile-race',
          eventType: record.isTie ? 'TIE' : record.answerCorrect ? 'CORRECT' : 'WRONG',
          winnerTeamName: record.winnerTeamName,
          pointsAwarded: record.pointsAwarded,
          reactionTimeMs: record.reactionTimeMs,
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Failed to record Smile Race result', err);
    }
  }

  public static getRecentResults(sessionId?: string): SmileRaceResultRecord[] {
    try {
      const listStr = localStorage.getItem(SMILE_RACE_RESULTS_KEY);
      if (!listStr) return [];
      const list: SmileRaceResultRecord[] = JSON.parse(listStr);
      if (sessionId) {
        return list.filter((r) => r.sessionId === sessionId);
      }
      return list;
    } catch {
      return [];
    }
  }
}
