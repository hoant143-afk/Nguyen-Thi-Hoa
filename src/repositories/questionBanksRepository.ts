import { QuestionBank, QuestionBankLesson, GradeLevel } from '../types';
import { apiClient } from '../services/apiClient';
import { QuestionBankRepository } from './questionBankRepository';
import { DEFAULT_QUESTION_BANKS } from '../data/questionBanksData';
import { QuestionsRepository } from './questionsRepository';

export interface SaveImportedBankPayload {
  bank: {
    name: string;
    subject?: string;
    grade?: string | number;
    topic?: string;
    description?: string;
    bankCode?: string;
  };
  questions: any[];
  import?: {
    importId?: string;
    fileName?: string;
    fileType?: string;
    mode?: string;
  };
}

export interface SaveImportedBankResult {
  success: boolean;
  bank: QuestionBank;
  importResult: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    errors?: string[];
  };
  partial?: boolean;
}

export const STORAGE_KEY_QUESTION_BANKS = 'eduplay_question_banks';

function initializeDefaultBanks(): QuestionBank[] {
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY_QUESTION_BANKS);
    if (existingRaw) {
      const parsed = JSON.parse(existingRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse existing eduplay_question_banks', e);
  }

  // Seed from DEFAULT_QUESTION_BANKS or legacy lessons
  const legacyLessons = QuestionBankRepository.getAllLessons();
  const source = legacyLessons && legacyLessons.length > 0 ? legacyLessons : DEFAULT_QUESTION_BANKS;

  const banks: QuestionBank[] = source.map((lesson) => ({
    id: lesson.id,
    bankCode: `BANK_${lesson.id}`,
    name: lesson.lessonTitle,
    lessonTitle: lesson.lessonTitle,
    subject: lesson.subject || 'Tin học',
    grade: lesson.grade || 5,
    topic: '',
    description: lesson.description || '',
    questionCount: Array.isArray(lesson.questions) ? lesson.questions.length : 0,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  try {
    localStorage.setItem(STORAGE_KEY_QUESTION_BANKS, JSON.stringify(banks));
  } catch (err) {
    console.warn('Failed to seed eduplay_question_banks', err);
  }

  return banks;
}

export class QuestionBanksRepository {
  /**
   * List all question banks
   */
  public static async list(): Promise<QuestionBank[]> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any[]>('questionBanks.list');
        if (res.success && Array.isArray(res.data)) {
          const mapped: QuestionBank[] = res.data.map((item) => ({
            id: String(item.id),
            bankCode: item.bankCode || '',
            name: item.name || item.lessonTitle || 'Chưa đặt tên',
            lessonTitle: item.lessonTitle || item.name || 'Chưa đặt tên',
            subject: item.subject || 'Tin học',
            grade: Number(item.grade) || 5,
            topic: item.topic || '',
            description: item.description || '',
            questionCount: Number(item.questionCount) || 0,
            enabled: item.enabled !== false,
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || Date.now(),
          }));

          // Cache locally
          try {
            localStorage.setItem(STORAGE_KEY_QUESTION_BANKS, JSON.stringify(mapped));
          } catch (e) {
            console.warn('Failed to cache question banks locally', e);
          }
          return mapped;
        }
      } catch (err) {
        console.warn('Failed to list question banks from cloud, falling back to local', err);
      }
    }

    // Local fallback
    return initializeDefaultBanks();
  }

  /**
   * Get single question bank by id
   */
  public static async get(id: string): Promise<QuestionBank | null> {
    if (!id) return null;

    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any>('questionBanks.get', { id });
        if (res.success && res.data) {
          const item = res.data;
          return {
            id: String(item.id),
            bankCode: item.bankCode || '',
            name: item.name || item.lessonTitle || '',
            lessonTitle: item.lessonTitle || item.name || '',
            subject: item.subject || 'Tin học',
            grade: Number(item.grade) || 5,
            topic: item.topic || '',
            description: item.description || '',
            questionCount: Number(item.questionCount) || 0,
            enabled: item.enabled !== false,
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || Date.now(),
          };
        }
      } catch (err) {
        console.warn('Failed to get question bank from cloud, falling back to local', err);
      }
    }

    const all = await this.list();
    return all.find((b) => b.id === id) || null;
  }

  /**
   * Create a question bank
   */
  public static async create(data: Partial<QuestionBank>): Promise<QuestionBank> {
    const rawName = (data.name || data.lessonTitle || '').trim();
    if (!rawName) {
      throw new Error('Tên ngân hàng câu hỏi (name) là bắt buộc.');
    }

    const grade = (data.grade as GradeLevel) || 5;
    const subject = (data.subject || 'Tin học').trim();
    const topic = (data.topic || '').trim();
    const description = (data.description || '').trim();

    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any>('questionBanks.create', {
          name: rawName,
          bankCode: data.bankCode || `BANK_${Date.now()}`,
          subject,
          grade,
          topic,
          description,
        });

        if (!res.success || !res.data) {
          throw new Error(res.error || res.message || 'Không thể tạo ngân hàng câu hỏi trên Cloud.');
        }

        const createdBank: QuestionBank = {
          id: String(res.data.id),
          bankCode: res.data.bankCode || `BANK_${res.data.id}`,
          name: res.data.name || rawName,
          lessonTitle: res.data.name || rawName,
          subject: res.data.subject || subject,
          grade: Number(res.data.grade) || grade,
          topic: res.data.topic || topic,
          description: res.data.description || description,
          questionCount: Number(res.data.questionCount) || 0,
          enabled: true,
          createdAt: res.data.createdAt || Date.now(),
          updatedAt: res.data.updatedAt || Date.now(),
        };

        // Cache in local repository
        this.saveLocalBank(createdBank);
        return createdBank;
      } catch (err: any) {
        console.error('Cloud createQuestionBank error:', err);
        throw err;
      }
    }

    // Local mode creation
    const newId = data.id || `bank_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newBank: QuestionBank = {
      id: newId,
      bankCode: data.bankCode || `BANK_${newId}`,
      name: rawName,
      lessonTitle: rawName,
      subject,
      grade,
      topic,
      description,
      questionCount: data.questionCount || 0,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveLocalBank(newBank);
    return newBank;
  }

  /**
   * Update question bank (e.g. updating questionCount or name)
   */
  public static async update(id: string, data: Partial<QuestionBank>): Promise<QuestionBank | null> {
    if (!id) throw new Error('Bank ID là bắt buộc để cập nhật.');

    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any>('questionBanks.update', {
          id,
          ...data,
        });
        if (!res.success) {
          console.warn('Cloud update returned false:', res.error);
        }
      } catch (err) {
        console.warn('Failed to update question bank in cloud', err);
      }
    }

    // Always update local storage
    const all = await this.list();
    const index = all.findIndex((b) => b.id === id);
    if (index >= 0) {
      all[index] = {
        ...all[index],
        ...data,
        updatedAt: Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_KEY_QUESTION_BANKS, JSON.stringify(all));
      } catch (e) {
        console.warn('Failed to persist updated bank to localStorage', e);
      }

      // Sync legacy lesson repository
      this.syncToLegacyRepository(all[index]);
      return all[index];
    }

    return null;
  }

  /**
   * Create an imported question bank and its questions atomically
   * (Complies with Requirement 5, 11, 12)
   */
  public static async createImportedBank(payload: SaveImportedBankPayload): Promise<SaveImportedBankResult> {
    const rawName = (payload.bank?.name || '').trim();
    if (!rawName) {
      throw new Error('⚠️ Vui lòng nhập tên bộ câu hỏi.');
    }

    if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
      throw new Error('⚠️ Không có câu hỏi nào trong danh sách để lưu.');
    }

    const subject = (payload.bank?.subject || 'Tin học').trim();
    const grade = (Number(payload.bank?.grade) as GradeLevel) || 5;
    const topic = (payload.bank?.topic || '').trim();
    const description = (payload.bank?.description || '').trim();

    // CLOUD MODE: Call Google Apps Script Web App action `questionBanks.saveImported`
    if (apiClient.getMode() === 'cloud') {
      if (!apiClient.getApiUrl()) {
        throw new Error('⚠️ Chưa cấu hình Google Apps Script API URL. Vui lòng thiết lập URL Web App trong phần Cài đặt.');
      }

      try {
        const res = await apiClient.apiRequest<any>('questionBanks.saveImported', {
          bank: {
            name: rawName,
            subject,
            grade,
            topic,
            description,
            bankCode: payload.bank?.bankCode,
          },
          questions: payload.questions,
          import: {
            importId: payload.import?.importId,
            fileName: payload.import?.fileName || 'cau_hoi.xlsx',
            fileType: payload.import?.fileType || 'XLSX',
            mode: payload.import?.mode || 'CREATE',
          },
        });

        if (!res.success) {
          throw new Error(res.error || res.message || 'Lỗi không xác định khi lưu vào Google Sheets.');
        }

        const data = res.data || res;
        const bankData = data.bank || {};
        const importResult = data.importResult || {
          total: payload.questions.length,
          created: payload.questions.length,
          updated: 0,
          skipped: 0,
          failed: 0,
          errors: [],
        };

        const createdBank: QuestionBank = {
          id: String(bankData.id || `bank_${Date.now()}`),
          bankCode: bankData.bankCode || `BANK_${Date.now()}`,
          name: bankData.name || rawName,
          lessonTitle: bankData.name || rawName,
          subject: bankData.subject || subject,
          grade: Number(bankData.grade) || grade,
          topic: bankData.topic || topic,
          description: bankData.description || description,
          questionCount: Number(bankData.questionCount) || Number(importResult.created) || payload.questions.length,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Cache bank and legacy lesson locally
        this.saveLocalBank(createdBank);

        // Also cache questions locally in repository for offline/instant access
        try {
          QuestionsRepository.applyLocalImport(createdBank.id, payload.questions, payload.import?.mode || 'CREATE');
        } catch (cacheErr) {
          console.warn('Questions local cache warning:', cacheErr);
        }

        const isPartial = Boolean((res as any).partial || data.partial || (importResult.failed > 0 && importResult.created > 0));

        return {
          success: true,
          bank: createdBank,
          importResult: {
            total: Number(importResult.total) || payload.questions.length,
            created: Number(importResult.created) || 0,
            updated: Number(importResult.updated) || 0,
            skipped: Number(importResult.skipped) || 0,
            failed: Number(importResult.failed) || 0,
            errors: Array.isArray(importResult.errors) ? importResult.errors : [],
          },
          partial: isPartial,
        };
      } catch (err: any) {
        console.error('Cloud createImportedBank error:', err);
        throw err;
      }
    }

    // LOCAL MODE: Save genuinely to localStorage (QUESTION_BANKS + QUESTIONS)
    const newId = `bank_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bankCode = payload.bank?.bankCode || `QB-${(subject || 'TINHOC').toUpperCase().substring(0, 8)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Attach bankId to questions
    const attachedQuestions = payload.questions.map((q, idx) => ({
      ...q,
      bankId: newId,
      id: Number(q.id) || Date.now() + idx,
    }));

    // Save questions into QUESTIONS repository
    const batchResult = await QuestionsRepository.importBatch(
      newId,
      attachedQuestions,
      payload.import?.mode || 'CREATE',
      {
        fileName: payload.import?.fileName || 'cau_hoi.xlsx',
        fileType: payload.import?.fileType || 'XLSX',
        importId: payload.import?.importId,
      }
    );

    const newBank: QuestionBank = {
      id: newId,
      bankCode,
      name: rawName,
      lessonTitle: rawName,
      subject,
      grade,
      topic,
      description,
      questionCount: batchResult.created + batchResult.updated,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveLocalBank(newBank);

    return {
      success: true,
      bank: newBank,
      importResult: {
        total: payload.questions.length,
        created: batchResult.created,
        updated: batchResult.updated,
        skipped: batchResult.skipped,
        failed: batchResult.failed,
        errors: batchResult.errors,
      },
      partial: batchResult.failed > 0 && batchResult.created > 0,
    };
  }

  /**
   * Disable a question bank (soft delete)
   */
  public static async disable(id: string): Promise<boolean> {
    if (!id) return false;

    if (apiClient.getMode() === 'cloud') {
      try {
        await apiClient.apiRequest('questionBanks.disable', { id });
      } catch (err) {
        console.warn('Failed to disable bank in cloud', err);
      }
    }

    await this.update(id, { enabled: false });
    return true;
  }

  /**
   * Internal helper to persist a bank locally and sync with legacy QuestionBankRepository
   */
  private static saveLocalBank(bank: QuestionBank): void {
    try {
      const existing = initializeDefaultBanks();
      const idx = existing.findIndex((b) => b.id === bank.id);
      if (idx >= 0) {
        existing[idx] = bank;
      } else {
        existing.unshift(bank);
      }
      localStorage.setItem(STORAGE_KEY_QUESTION_BANKS, JSON.stringify(existing));
      this.syncToLegacyRepository(bank);
    } catch (e) {
      console.warn('Failed to save local bank', e);
    }
  }

  private static syncToLegacyRepository(bank: QuestionBank): void {
    try {
      const legacyLesson: QuestionBankLesson = {
        id: bank.id,
        grade: (Number(bank.grade) as GradeLevel) || 5,
        subject: bank.subject,
        lessonNumber: 99,
        lessonTitle: bank.name || bank.lessonTitle || 'Ngân hàng câu hỏi',
        description: bank.description || '',
        questions: bank.questions || [],
      };
      QuestionBankRepository.saveLesson(legacyLesson);
    } catch (e) {
      console.warn('Failed to sync to legacy QuestionBankRepository', e);
    }
  }

  // Aliases for compatibility
  public static async listQuestionBanks(): Promise<QuestionBank[]> {
    return this.list();
  }

  public static async getQuestionBank(id: string): Promise<QuestionBank | null> {
    return this.get(id);
  }

  public static async createQuestionBank(data: any): Promise<QuestionBank> {
    return this.create(data);
  }
}

export const questionBanksRepository = QuestionBanksRepository;

export async function refreshQuestionBanks(): Promise<QuestionBank[]> {
  return QuestionBanksRepository.list();
}
