/**
 * ==============================================================================
 * 🎓 EDUPLAY - DATABASE BACKUP & RESTORE SERVICE
 * Architecture: Full snapshot export/import of all 10 core tables (No Camera Data)
 * ==============================================================================
 */

import { EduplayStorage, STORAGE_NAMESPACES } from './eduplayStorage';
import { apiClient } from './apiClient';
import { downloadFile } from './importer/questionImporter';
import { QuestionBankRepository } from '../repositories/questionBankRepository';
import { EDUPLAY_VERSION } from '../version';

export interface EduplayBackupData {
  appName: 'EDUPLAY';
  version: string;
  exportedAt: string;
  timestamp: number;
  data: {
    SETTINGS?: Record<string, any>;
    GAME_CATALOG?: any[];
    CLASSES?: any[];
    QUESTION_BANKS?: any[];
    QUESTIONS?: any[];
    GAME_SESSIONS?: any[];
    TEAMS?: any[];
    SCORE_EVENTS?: any[];
    GAME_RESULTS?: any[];
    CERTIFICATES?: any[];
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  itemCounts: Record<string, number>;
  data?: EduplayBackupData;
}

export interface BackupPreview {
  exportedAt: string;
  totalItems: number;
  itemCounts: Record<string, number>;
  version: string;
}

export type RestoreMode = 'MERGE' | 'SKIP_EXISTING';

export class BackupService {
  /**
   * Export all database records to JSON file
   */
  public static async exportBackup(): Promise<EduplayBackupData> {
    const isCloud = apiClient.getMode() === 'cloud' && apiClient.getStatus().isCloudReachable;

    let backup: EduplayBackupData = {
      appName: 'EDUPLAY',
      version: EDUPLAY_VERSION,
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      data: {},
    };

    // 1. If Cloud is reachable, try fetching from server
    if (isCloud) {
      try {
        const res = await apiClient.apiRequest<any>('database.exportBackup');
        if (res.success && res.data) {
          backup.data = res.data;
          this.downloadBackupFile(backup);
          return backup;
        }
      } catch (err) {
        console.warn('Cloud backup failed, falling back to local snapshot:', err);
      }
    }

    // 2. Local Fallback Snapshot: Collect from EduplayStorage
    const questions = EduplayStorage.getQuestions();
    const lessons = QuestionBankRepository.getLessons();
    const history = EduplayStorage.getHistory();
    const certificates = EduplayStorage.getGameData<any[]>('eduplay_issued_certificates_v1', []);
    const teamPresets = EduplayStorage.getGameData<any[]>('eduplay_team_presets', []);
    const scoreEvents = EduplayStorage.getGameData<any[]>('eduplay_score_events_log_v1', []);
    const settings = EduplayStorage.getSettings();

    backup.data = {
      SETTINGS: settings,
      CLASSES: [
        { id: 'c1', className: settings.defaultClassName || '5A1', grade: 5, teacherName: settings.teacherName || 'Thầy Hoàng', schoolName: settings.schoolName || 'Trường Chu Văn An' },
      ],
      QUESTION_BANKS: lessons.map((l) => ({
        id: l.id,
        name: l.lessonTitle,
        subject: l.subject,
        grade: l.grade,
        topic: l.topic,
        questionCount: l.questions.length,
        enabled: true,
        updatedAt: new Date().toISOString(),
      })),
      QUESTIONS: questions,
      GAME_SESSIONS: history,
      TEAMS: teamPresets,
      SCORE_EVENTS: scoreEvents,
      GAME_RESULTS: history.map((h) => ({
        id: `res_${h.id}`,
        sessionId: h.id,
        gameSlug: 'cam-race',
        winnerTeamName: h.winnerName,
        createdAt: h.startedAt,
      })),
      CERTIFICATES: certificates,
    };

    this.downloadBackupFile(backup);
    return backup;
  }

  private static downloadBackupFile(backup: EduplayBackupData) {
    const jsonStr = JSON.stringify(backup, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `EDUPLAY_BACKUP_${dateStr}_v${backup.version}.json`;
    downloadFile(jsonStr, fileName, 'application/json');
  }

  /**
   * Validate a loaded backup JSON file
   */
  public static validateBackupJson(jsonString: string): BackupValidationResult {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { isValid: false, error: 'Tệp không phải là đối tượng JSON hợp lệ', itemCounts: {} };
      }

      if (parsed.appName !== 'EDUPLAY' && !parsed.data) {
        return {
          isValid: false,
          error: 'Tệp không phải là bản sao lưu của hệ thống EDUPLAY (Thiếu chữ ký EDUPLAY).',
          itemCounts: {},
        };
      }

      const data = parsed.data || parsed;
      const counts: Record<string, number> = {
        SETTINGS: data.SETTINGS ? (typeof data.SETTINGS === 'object' ? Object.keys(data.SETTINGS).length : 0) : 0,
        CLASSES: Array.isArray(data.CLASSES) ? data.CLASSES.length : 0,
        QUESTION_BANKS: Array.isArray(data.QUESTION_BANKS) ? data.QUESTION_BANKS.length : 0,
        QUESTIONS: Array.isArray(data.QUESTIONS) ? data.QUESTIONS.length : 0,
        GAME_SESSIONS: Array.isArray(data.GAME_SESSIONS) ? data.GAME_SESSIONS.length : 0,
        TEAMS: Array.isArray(data.TEAMS) ? data.TEAMS.length : 0,
        SCORE_EVENTS: Array.isArray(data.SCORE_EVENTS) ? data.SCORE_EVENTS.length : 0,
        GAME_RESULTS: Array.isArray(data.GAME_RESULTS) ? data.GAME_RESULTS.length : 0,
        CERTIFICATES: Array.isArray(data.CERTIFICATES) ? data.CERTIFICATES.length : 0,
      };

      const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
      if (totalItems === 0) {
        return { isValid: false, error: 'Bản sao lưu không chứa bảng dữ liệu nào.', itemCounts: counts };
      }

      return {
        isValid: true,
        itemCounts: counts,
        data: parsed,
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `Lỗi đọc JSON: ${err?.message || 'Định dạng tệp không đúng'}`,
        itemCounts: {},
      };
    }
  }

  /**
   * Validate a loaded backup File
   */
  public static async validateBackupFile(file: File): Promise<{
    isValid: boolean;
    error?: string;
    preview?: BackupPreview;
    data?: EduplayBackupData;
  }> {
    try {
      const text = await file.text();
      const validation = this.validateBackupJson(text);
      if (!validation.isValid || !validation.data) {
        return {
          isValid: false,
          error: validation.error || 'Tệp sao lưu không hợp lệ',
        };
      }
      const totalItems = Object.values(validation.itemCounts).reduce((a, b) => a + b, 0);
      return {
        isValid: true,
        preview: {
          exportedAt: validation.data.exportedAt || new Date().toISOString(),
          totalItems,
          itemCounts: validation.itemCounts,
          version: validation.data.version || EDUPLAY_VERSION,
        },
        data: validation.data,
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `Không thể đọc tệp sao lưu: ${err?.message || err}`,
      };
    }
  }

  /**
   * Restore backup with MERGE or SKIP_EXISTING mode
   */
  public static async restoreBackup(
    backupOrFile: EduplayBackupData | File,
    mode: RestoreMode | 'merge' | 'skip_existing'
  ): Promise<{ success: boolean; itemCount: number; restoredCounts: Record<string, number>; message: string; error?: string }> {
    let backup: EduplayBackupData;
    if (typeof (backupOrFile as any).text === 'function') {
      try {
        const text = await (backupOrFile as File).text();
        const validation = this.validateBackupJson(text);
        if (!validation.isValid || !validation.data) {
          return {
            success: false,
            itemCount: 0,
            restoredCounts: {},
            message: validation.error || 'Tệp sao lưu không hợp lệ.',
            error: validation.error || 'Tệp sao lưu không hợp lệ.',
          };
        }
        backup = validation.data;
      } catch (err: any) {
        return {
          success: false,
          itemCount: 0,
          restoredCounts: {},
          message: err?.message || 'Lỗi đọc tệp',
          error: err?.message || 'Lỗi đọc tệp',
        };
      }
    } else {
      backup = backupOrFile as EduplayBackupData;
    }

    const normalizedMode: RestoreMode =
      typeof mode === 'string' && mode.toUpperCase() === 'MERGE' ? 'MERGE' : 'SKIP_EXISTING';
    const isCloud = apiClient.getMode() === 'cloud' && apiClient.getStatus().isCloudReachable;
    const restoredCounts: Record<string, number> = {};

    // 1. If Cloud mode, sync to server
    if (isCloud) {
      try {
        const res = await apiClient.apiRequest('database.restoreBackup', {
          backup: backup.data,
          mode,
        });
        if (res.success) {
          console.log('Cloud restore successful');
        }
      } catch (err) {
        console.warn('Cloud restore failed, proceeding with local restore:', err);
      }
    }

    // 2. Restore to Local Storage
    const data = backup.data || {};

    // Restore Settings
    if (data.SETTINGS && typeof data.SETTINGS === 'object') {
      const currentSettings = EduplayStorage.getSettings();
      const newSettings = mode === 'MERGE' ? { ...currentSettings, ...data.SETTINGS } : { ...data.SETTINGS, ...currentSettings };
      EduplayStorage.saveSettings(newSettings);
      restoredCounts['SETTINGS'] = Object.keys(data.SETTINGS).length;
    }

    // Restore Question Banks & Lessons
    if (Array.isArray(data.QUESTION_BANKS) && data.QUESTION_BANKS.length > 0) {
      const currentLessons = QuestionBankRepository.getLessons();
      let importedLessons = 0;
      data.QUESTION_BANKS.forEach((bank: any) => {
        const exists = currentLessons.some((l) => l.id === bank.id || l.lessonTitle === bank.name);
        if (!exists || mode === 'MERGE') {
          const bankQuestions = Array.isArray(data.QUESTIONS)
            ? data.QUESTIONS.filter((q: any) => q.bankId === bank.id || q.lessonId === bank.id)
            : [];
          QuestionBankRepository.saveLesson({
            id: bank.id || `bank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            lessonTitle: bank.name || 'Bộ câu hỏi khôi phục',
            subject: bank.subject || 'Tin học',
            grade: bank.grade || 5,
            topic: bank.topic || '',
            questions: bankQuestions,
            updatedAt: bank.updatedAt || new Date().toISOString(),
          });
          importedLessons++;
        }
      });
      restoredCounts['QUESTION_BANKS'] = importedLessons;
    }

    // Restore Questions
    if (Array.isArray(data.QUESTIONS) && data.QUESTIONS.length > 0) {
      const currentQuestions = EduplayStorage.getQuestions();
      if (mode === 'MERGE') {
        const mergedMap = new Map<number, any>();
        currentQuestions.forEach((q) => mergedMap.set(q.id, q));
        data.QUESTIONS.forEach((q: any) => {
          const id = Number(q.id) || Date.now() + Math.floor(Math.random() * 1000);
          mergedMap.set(id, { ...q, id });
        });
        const finalQuestions = Array.from(mergedMap.values());
        EduplayStorage.saveQuestions(finalQuestions);
        restoredCounts['QUESTIONS'] = data.QUESTIONS.length;
      } else {
        // SKIP_EXISTING
        const existingIds = new Set(currentQuestions.map((q) => q.id));
        const toAdd = data.QUESTIONS.filter((q: any) => !existingIds.has(Number(q.id)));
        EduplayStorage.saveQuestions([...currentQuestions, ...toAdd]);
        restoredCounts['QUESTIONS'] = toAdd.length;
      }
    }

    // Restore Sessions History
    if (Array.isArray(data.GAME_SESSIONS) && data.GAME_SESSIONS.length > 0) {
      const currentHistory = EduplayStorage.getHistory();
      const existingIds = new Set(currentHistory.map((h) => h.id));
      const newHistory = mode === 'MERGE'
        ? [...data.GAME_SESSIONS.filter((h: any) => !existingIds.has(h.id)), ...currentHistory]
        : [...currentHistory, ...data.GAME_SESSIONS.filter((h: any) => !existingIds.has(h.id))];
      EduplayStorage.setGameData(STORAGE_NAMESPACES.SESSION_HISTORY, newHistory);
      restoredCounts['GAME_SESSIONS'] = data.GAME_SESSIONS.length;
    }

    // Restore Certificates
    if (Array.isArray(data.CERTIFICATES) && data.CERTIFICATES.length > 0) {
      const currentCerts = EduplayStorage.getGameData<any[]>('eduplay_issued_certificates_v1', []);
      const existingCodes = new Set(currentCerts.map((c) => c.certificateCode || c.id));
      const added = data.CERTIFICATES.filter((c: any) => !existingCodes.has(c.certificateCode || c.id));
      EduplayStorage.setGameData('eduplay_issued_certificates_v1', [...currentCerts, ...added]);
      restoredCounts['CERTIFICATES'] = added.length;
    }

    // Restore Teams
    if (Array.isArray(data.TEAMS) && data.TEAMS.length > 0) {
      EduplayStorage.setGameData('eduplay_team_presets', data.TEAMS);
      restoredCounts['TEAMS'] = data.TEAMS.length;
    }

    const itemCount = Object.values(restoredCounts).reduce((a, b) => a + b, 0);
    return {
      success: true,
      itemCount,
      restoredCounts,
      message: `Khôi phục thành công theo chế độ ${normalizedMode === 'MERGE' ? 'Hợp nhất (Merge)' : 'Bỏ qua trùng lặp (Skip Existing)'}!`,
    };
  }
}
