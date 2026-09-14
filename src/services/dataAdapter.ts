/**
 * ==============================================================================
 * 🎓 EDUPLAY - UNIFIED DATA ADAPTER (LOCAL & CLOUD)
 * Central data layer: Components interact via this adapter without worrying
 * about whether data is served from localStorage or Google Apps Script.
 * ==============================================================================
 */

import { apiClient, DataMode, SyncStatus } from './apiClient';
import { EduplayStorage, STORAGE_NAMESPACES } from './eduplayStorage';
import { QuestionBankRepository } from '../repositories/questionBankRepository';
import { QuestionBanksRepository } from '../repositories/questionBanksRepository';
import { QuestionsRepository } from '../repositories/questionsRepository';
import { SessionsRepository, CloudSession } from '../repositories/sessionsRepository';
import { ScoresRepository } from '../repositories/scoresRepository';
import { CertificateRepository, CertificatePayload } from '../repositories/certificateRepository';
import { BackupService, EduplayBackupData, RestoreMode } from './backupService';
import { Question, QuestionBankLesson, CertificateRecord } from '../types';
import { EDUPLAY_VERSION } from '../version';

export interface HealthCheckResult {
  status: 'CONNECTED' | 'ERROR' | 'LOCAL_ACTIVE';
  mode: DataMode;
  message: string;
  version: string;
  timestamp: string;
  responseTimeMs?: number;
}

export class EduplayDataAdapter {
  // ==========================================
  // MODE & CONNECTION STATUS
  // ==========================================
  public getMode(): DataMode {
    return apiClient.getMode();
  }

  public setMode(mode: DataMode): void {
    apiClient.setMode(mode);
  }

  public getStatus(): SyncStatus {
    return apiClient.getStatus();
  }

  public subscribeStatus(cb: (status: SyncStatus) => void): () => void {
    return apiClient.subscribe(cb);
  }

  /**
   * Health Check testing Cloud or Local availability
   */
  public async checkHealth(): Promise<HealthCheckResult> {
    const mode = this.getMode();
    const startTime = Date.now();

    if (mode === 'local') {
      return {
        status: 'LOCAL_ACTIVE',
        mode: 'local',
        message: 'Hệ thống đang hoạt động ổn định ở chế độ Cục bộ (Local Mode).',
        version: EDUPLAY_VERSION,
        timestamp: new Date().toISOString(),
        responseTimeMs: 0,
      };
    }

    try {
      // First attempt system.health
      const res = await apiClient.apiRequest('system.health', {}, { timeoutMs: 7000, retries: 1 });
      const elapsed = Date.now() - startTime;

      if (res.success) {
        return {
          status: 'CONNECTED',
          mode: 'cloud',
          message: '🟢 DATABASE CLOUD ĐÃ KẾT NỐI (Google Sheets Apps Script)',
          version: res.data?.version || EDUPLAY_VERSION,
          timestamp: res.data?.timestamp || new Date().toISOString(),
          responseTimeMs: elapsed,
        };
      }

      // Fallback probe settings.get if older script deployment without system.health
      const fallback = await apiClient.apiRequest('settings.get', {}, { timeoutMs: 7000, retries: 0 });
      if (fallback.success) {
        return {
          status: 'CONNECTED',
          mode: 'cloud',
          message: '🟢 DATABASE CLOUD ĐÃ KẾT NỐI (Qua API settings.get)',
          version: EDUPLAY_VERSION,
          timestamp: new Date().toISOString(),
          responseTimeMs: Date.now() - startTime,
        };
      }

      return {
        status: 'ERROR',
        mode: 'cloud',
        message: res.error || fallback.error || '🔴 CHƯA KẾT NỐI DATABASE (Lỗi phản hồi từ máy chủ)',
        version: EDUPLAY_VERSION,
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        status: 'ERROR',
        mode: 'cloud',
        message: `🔴 CHƯA KẾT NỐI DATABASE: ${err?.message || 'Không thể kết nối đến Web App URL'}`,
        version: EDUPLAY_VERSION,
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
      };
    }
  }

  // ==========================================
  // QUESTION BANKS
  // ==========================================
  public async listQuestionBanks(): Promise<QuestionBankLesson[]> {
    if (this.getMode() === 'cloud') {
      try {
        const cloudBanks = await QuestionBanksRepository.list();
        if (cloudBanks && cloudBanks.length > 0) {
          return cloudBanks.map((b: any) => ({
            id: b.id,
            lessonTitle: b.name || b.bankCode || 'Bộ câu hỏi',
            subject: b.subject || 'Tin học',
            grade: b.grade || 5,
            topic: b.topic || '',
            description: b.description || '',
            enabled: b.enabled !== false,
            questions: [],
            updatedAt: b.updatedAt || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('Failed to load banks from cloud, using local fallback', err);
      }
    }
    return QuestionBankRepository.getLessons();
  }

  public async getQuestionsByBank(bankId: string): Promise<Question[]> {
    if (this.getMode() === 'cloud') {
      try {
        const questions = await QuestionsRepository.listByBank(bankId);
        if (questions && questions.length > 0) {
          return questions;
        }
      } catch (err) {
        console.warn('Failed to load questions by bank from cloud', err);
      }
    }
    const lesson = QuestionBankRepository.getLessonById(bankId);
    return lesson?.questions || [];
  }

  public async saveQuestionBank(bank: QuestionBankLesson, questions?: Question[]): Promise<boolean> {
    if (questions) {
      bank.questions = questions;
    }
    // 1. Always save local for instantaneous response & offline resilience
    QuestionBankRepository.saveLesson(bank);

    // 2. If Cloud mode, sync to server
    if (this.getMode() === 'cloud') {
      try {
        await QuestionBanksRepository.create({
          bankCode: bank.id,
          name: bank.lessonTitle,
          subject: bank.subject,
          grade: bank.grade,
          topic: bank.topic,
          description: bank.description,
          questionCount: bank.questions.length,
          enabled: bank.enabled !== false,
        });
      } catch (err) {
        console.warn('Cloud save question bank warning:', err);
      }
    }
    return true;
  }

  public async updateQuestionBankInfo(
    bankId: string,
    updates: { name?: string; topic?: string; subject?: string; grade?: any; description?: string }
  ): Promise<boolean> {
    const lesson = QuestionBankRepository.getLessonById(bankId);
    if (lesson) {
      const updated: QuestionBankLesson = {
        ...lesson,
        lessonTitle: updates.name || lesson.lessonTitle,
        topic: updates.topic !== undefined ? updates.topic : lesson.topic,
        subject: updates.subject || lesson.subject,
        grade: updates.grade !== undefined ? (Number(updates.grade) as any) : lesson.grade,
        description: updates.description !== undefined ? updates.description : lesson.description,
        updatedAt: new Date().toISOString(),
      };
      QuestionBankRepository.saveLesson(updated);
    }

    if (this.getMode() === 'cloud') {
      try {
        await QuestionBanksRepository.update(bankId, updates);
      } catch (err) {
        console.warn('Cloud update bank warning:', err);
      }
    }
    return true;
  }

  public async toggleDisableBank(bankId: string, enabled: boolean): Promise<boolean> {
    const lesson = QuestionBankRepository.getLessonById(bankId);
    if (lesson) {
      lesson.enabled = enabled;
      lesson.updatedAt = new Date().toISOString();
      QuestionBankRepository.saveLesson(lesson);
    }

    if (this.getMode() === 'cloud') {
      try {
        if (!enabled) {
          await QuestionBanksRepository.disable(bankId);
        } else {
          await QuestionBanksRepository.update(bankId, { enabled: true });
        }
      } catch (err) {
        console.warn('Cloud disable bank warning:', err);
      }
    }
    return true;
  }

  public async duplicateBank(bankId: string): Promise<QuestionBankLesson | null> {
    const lesson = QuestionBankRepository.getLessonById(bankId);
    if (!lesson) return null;

    const newId = `bank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const clonedQuestions: Question[] = lesson.questions.map((q, idx) => ({
      ...q,
      id: Date.now() + idx,
      lessonId: newId,
    }));

    const newLesson: QuestionBankLesson = {
      ...lesson,
      id: newId,
      lessonTitle: `${lesson.lessonTitle} (Bản sao)`,
      questions: clonedQuestions,
      updatedAt: new Date().toISOString(),
    };

    QuestionBankRepository.saveLesson(newLesson);

    if (this.getMode() === 'cloud') {
      try {
        await QuestionBanksRepository.create({
          bankCode: newId,
          name: newLesson.lessonTitle,
          subject: newLesson.subject,
          grade: newLesson.grade,
          topic: newLesson.topic,
          description: newLesson.description,
          questionCount: clonedQuestions.length,
          enabled: true,
        });
      } catch (err) {
        console.warn('Cloud duplicate bank warning:', err);
      }
    }
    return newLesson;
  }

  // ==========================================
  // SESSIONS & RESULTS
  // ==========================================
  public async listSessions(): Promise<any[]> {
    if (this.getMode() === 'cloud') {
      try {
        const cloudSessions = await SessionsRepository.listSessions();
        if (cloudSessions && cloudSessions.length > 0) {
          return cloudSessions;
        }
      } catch (err) {
        console.warn('Failed to list sessions from cloud:', err);
      }
    }
    return EduplayStorage.getHistory();
  }

  public async createSession(params: any): Promise<CloudSession | null> {
    return SessionsRepository.createSession(params);
  }

  public async finishSession(sessionId: string, params?: any): Promise<any> {
    return SessionsRepository.finalizeSession(params ? { sessionId, ...params } : sessionId);
  }

  // ==========================================
  // CERTIFICATES
  // ==========================================
  public async listCertificates(): Promise<any[]> {
    const local = EduplayStorage.getGameData<any[]>('eduplay_issued_certificates_v1', []);
    if (this.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any[]>('certificates.list');
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Cloud list certificates warning:', err);
      }
    }
    return local;
  }

  public async issueCertificate(payload: CertificatePayload | CertificateRecord): Promise<any> {
    // 1. Save local
    const current = EduplayStorage.getGameData<any[]>('eduplay_issued_certificates_v1', []);
    const newCert = {
      ...payload,
      id: (payload as any).id || `cert_${Date.now()}`,
      issuedAt: (payload as any).issuedDate || new Date().toISOString(),
    };
    EduplayStorage.setGameData('eduplay_issued_certificates_v1', [newCert, ...current]);

    // 2. Issue to cloud
    if (this.getMode() === 'cloud') {
      try {
        const cloudPayload: CertificatePayload = {
          sessionId: (payload as any).sessionId || (payload as any).gameId || `sess_${Date.now()}`,
          recipientName: (payload as any).recipientName || (payload as any).teamName || 'Đội',
          recipientType: (payload as any).recipientType || 'TEAM',
          awardTitle: (payload as any).awardTitle || 'QUÁN QUÂN',
          score: (payload as any).score || 0,
          schoolName: (payload as any).schoolName || '',
        };
        await CertificateRepository.issueCertificate(cloudPayload);
      } catch (err) {
        console.warn('Cloud issue certificate warning:', err);
      }
    }
    return newCert;
  }

  // ==========================================
  // BACKUP & RESTORE
  // ==========================================
  public async exportBackup(): Promise<EduplayBackupData> {
    return BackupService.exportBackup();
  }

  public async restoreBackup(backup: EduplayBackupData, mode: RestoreMode) {
    return BackupService.restoreBackup(backup, mode);
  }

  // ==========================================
  // API URL & CONFIG
  // ==========================================
  public getApiUrl(): string {
    return apiClient.getApiUrl();
  }

  public setApiUrl(url: string): void {
    apiClient.setApiUrl(url);
  }

  // ==========================================
  // OFFLINE SYNC
  // ==========================================
  public async flushPendingQueue(): Promise<{ synced: number; failed: number; flushedCount: number }> {
    const res = await apiClient.flushPendingQueue();
    return {
      ...res,
      flushedCount: res.synced,
    };
  }

  public getPendingEventsCount(): number {
    return apiClient.getPendingEvents().length;
  }

  public getPendingQueueCount(): number {
    return this.getPendingEventsCount();
  }
}

export const dataAdapter = new EduplayDataAdapter();
