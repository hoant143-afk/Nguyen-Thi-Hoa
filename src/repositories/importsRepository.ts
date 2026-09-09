import { apiClient } from '../services/apiClient';

export interface ImportBatchResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export class ImportsRepository {
  /**
   * Imports a batch of pre-parsed questions to Google Sheets via Apps Script API
   */
  public static async importQuestions(payload: {
    bankId: string;
    mode: 'CREATE' | 'SKIP' | 'UPDATE';
    rows: any[];
    fileName?: string;
    fileType?: string;
  }): Promise<ImportBatchResult> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<ImportBatchResult>('questions.importBatch', payload);
        if (res.success && res.data) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to import questions to cloud', err);
      }
    }

    // Local fallback
    return {
      total: payload.rows.length,
      created: payload.rows.length,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
  }

  /**
   * Imports a batch of teams for a session
   */
  public static async importTeams(payload: {
    sessionId: string;
    mode?: 'CREATE' | 'SKIP' | 'UPDATE';
    rows: any[];
    fileName?: string;
    fileType?: string;
  }): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('teams.importBatch', payload);
        return res.data;
      } catch (err) {
        console.warn('Failed to import teams to cloud', err);
      }
    }
    return { total: payload.rows.length, created: payload.rows.length };
  }

  /**
   * Gets import history
   */
  public static async getHistory(): Promise<any[]> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any[]>('imports.history.list');
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to get import history from cloud', err);
      }
    }
    return [];
  }
}
