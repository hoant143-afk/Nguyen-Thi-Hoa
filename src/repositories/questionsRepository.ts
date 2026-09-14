import { apiClient } from '../services/apiClient';
import { Question, QuestionBankLesson } from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';
import { DEFAULT_QUESTION_BANKS } from '../data/questionBanksData';
import { QuestionBankRepository } from './questionBankRepository';

export const STORAGE_KEY_QUESTIONS = 'eduplay_questions';
export const STORAGE_KEY_PROCESSED_IMPORTS = 'eduplay_processed_import_ids';

export interface ImportBatchResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

function getProcessedImport(importId?: string): ImportBatchResult | null {
  if (!importId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROCESSED_IMPORTS);
    if (raw) {
      const map = JSON.parse(raw);
      if (map && map[importId]) {
        return map[importId];
      }
    }
  } catch (e) {
    console.warn('Failed to read processed imports', e);
  }
  return null;
}

function markImportProcessed(importId: string | undefined, result: ImportBatchResult): void {
  if (!importId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROCESSED_IMPORTS);
    const map = raw ? JSON.parse(raw) : {};
    map[importId] = result;
    localStorage.setItem(STORAGE_KEY_PROCESSED_IMPORTS, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save processed import id', e);
  }
}

function initializeDefaultQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUESTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse existing eduplay_questions', e);
  }

  // Seed from default banks and default questions
  const initial: Question[] = [];

  DEFAULT_QUESTION_BANKS.forEach((bank) => {
    if (Array.isArray(bank.questions)) {
      bank.questions.forEach((q, idx) => {
        initial.push({
          ...q,
          id: q.id || (idx + 1),
          bankId: bank.id,
          subject: bank.subject,
          grade: bank.grade,
        });
      });
    }
  });

  // Default demo bank
  DEFAULT_QUESTIONS.forEach((q, idx) => {
    initial.push({
      ...q,
      id: q.id || 1000 + idx,
      bankId: 'bank_tinhoc5_demo',
      subject: 'Tin học',
      grade: 5,
    });
  });

  try {
    localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(initial));
  } catch (err) {
    console.warn('Failed to seed eduplay_questions', err);
  }

  return initial;
}

export class QuestionsRepository {
  /**
   * List questions belonging to a specific bankId
   */
  public static async listByBank(bankId: string): Promise<Question[]> {
    if (!bankId) return [];

    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any[]>('questions.listByBank', { bankId });
        if (res.success && Array.isArray(res.data)) {
          const mapped: Question[] = res.data.map((q, idx) => {
            const optA = q.options?.A || q.optionA || (Array.isArray(q.options) ? q.options[0] : '') || '';
            const optB = q.options?.B || q.optionB || (Array.isArray(q.options) ? q.options[1] : '') || '';
            const optC = q.options?.C || q.optionC || (Array.isArray(q.options) ? q.options[2] : '') || '';
            const optD = q.options?.D || q.optionD || (Array.isArray(q.options) ? q.options[3] : '') || '';

            let correctIndex: 0 | 1 | 2 | 3 = 0;
            if (typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3) {
              correctIndex = q.correctAnswer as 0 | 1 | 2 | 3;
            } else if (typeof q.correctAnswer === 'string') {
              const upper = q.correctAnswer.trim().toUpperCase();
              if (upper === 'B' || upper === '1') correctIndex = 1;
              else if (upper === 'C' || upper === '2') correctIndex = 2;
              else if (upper === 'D' || upper === '3') correctIndex = 3;
            }

            return {
              id: Number(q.id) || Number(q.order) || (idx + 1),
              bankId: String(q.bankId || bankId),
              question: q.question || '',
              options: [optA, optB, optC, optD],
              correctAnswer: correctIndex,
              explanation: q.explanation || '',
              category: q.category || q.topic || 'Tin học',
              subject: q.subject || 'Tin học',
              grade: q.grade || 5,
              topic: q.topic || '',
              difficulty: q.difficulty || 'MEDIUM',
              normalPoints: Number(q.normalPoints) || 10,
              specialPoints: Number(q.specialPoints) || 20,
              stealPoints: Number(q.stealPoints) || 5,
              isSpecial: Boolean(q.isSpecial),
              enabled: q.enabled !== false,
            };
          });

          // Cache locally for this bank
          this.cacheQuestionsForBank(bankId, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Failed to load questions by bank from cloud, falling back to local', err);
      }
    }

    // Local lookup
    const all = initializeDefaultQuestions();
    const filtered = all.filter((q) => String(q.bankId) === String(bankId));

    if (filtered.length > 0) {
      return filtered;
    }

    // Secondary fallback: check legacy QuestionBankRepository
    const legacyLesson = QuestionBankRepository.getLessonById(bankId);
    if (legacyLesson && Array.isArray(legacyLesson.questions) && legacyLesson.questions.length > 0) {
      return legacyLesson.questions.map((q) => ({
        ...q,
        bankId: bankId,
      }));
    }

    return [];
  }

  /**
   * Get single question by ID
   */
  public static async get(id: string | number): Promise<Question | null> {
    if (!id) return null;

    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any>('questions.get', { id });
        if (res.success && res.data) {
          const q = res.data;
          return {
            id: Number(q.id) || 1,
            bankId: q.bankId,
            question: q.question,
            options: [q.options?.A || '', q.options?.B || '', q.options?.C || '', q.options?.D || ''],
            correctAnswer: (q.correctAnswer === 'B' ? 1 : q.correctAnswer === 'C' ? 2 : q.correctAnswer === 'D' ? 3 : 0) as 0 | 1 | 2 | 3,
            explanation: q.explanation || '',
            category: q.category || 'Tin học',
            isSpecial: Boolean(q.isSpecial),
          };
        }
      } catch (err) {
        console.warn('Failed to get question from cloud', err);
      }
    }

    const all = initializeDefaultQuestions();
    return all.find((q) => String(q.id) === String(id)) || null;
  }

  /**
   * Import batch of questions into a specific bank
   */
  public static async importBatch(
    bankId: string,
    rows: any[],
    mode: string = 'CREATE',
    options?: {
      fileName?: string;
      fileType?: string;
      importId?: string;
    }
  ): Promise<ImportBatchResult> {
    if (!bankId) {
      throw new Error('Bank ID là bắt buộc khi import câu hỏi.');
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: ['Không có dòng dữ liệu nào để import.'],
      };
    }

    // Check Idempotency (Requirement N)
    if (options?.importId) {
      const existingResult = getProcessedImport(options.importId);
      if (existingResult) {
        console.log(`[QuestionsRepository] ImportId ${options.importId} already processed, returning cached result.`);
        return existingResult;
      }
    }

    // Format rows into standard question format
    const formattedQuestions: Question[] = rows.map((r, idx) => {
      let optA = '';
      let optB = '';
      let optC = '';
      let optD = '';

      if (Array.isArray(r.options)) {
        optA = String(r.options[0] || '');
        optB = String(r.options[1] || '');
        optC = String(r.options[2] || '');
        optD = String(r.options[3] || '');
      } else if (r.options && typeof r.options === 'object') {
        optA = String(r.options.A || '');
        optB = String(r.options.B || '');
        optC = String(r.options.C || '');
        optD = String(r.options.D || '');
      } else {
        optA = String(r.optionA || '');
        optB = String(r.optionB || '');
        optC = String(r.optionC || '');
        optD = String(r.optionD || '');
      }

      let correctIndex: 0 | 1 | 2 | 3 = 0;
      if (typeof r.correctAnswer === 'number' && r.correctAnswer >= 0 && r.correctAnswer <= 3) {
        correctIndex = r.correctAnswer as 0 | 1 | 2 | 3;
      } else if (typeof r.correctAnswer === 'string') {
        const str = r.correctAnswer.trim().toUpperCase();
        if (str === 'B' || str === '1') correctIndex = 1;
        else if (str === 'C' || str === '2') correctIndex = 2;
        else if (str === 'D' || str === '3') correctIndex = 3;
      }

      return {
        id: Number(r.id) || Date.now() + idx + Math.floor(Math.random() * 1000),
        bankId: bankId, // GUARANTEED: BANK ID INTEGRITY (Requirement G)
        question: String(r.question || '').trim(),
        options: [optA, optB, optC, optD],
        correctAnswer: correctIndex,
        explanation: String(r.explanation || '').trim(),
        category: String(r.category || r.topic || 'Tin học').trim(),
        subject: String(r.subject || 'Tin học').trim(),
        grade: r.grade || 5,
        topic: String(r.topic || '').trim(),
        difficulty: r.difficulty || 'MEDIUM',
        normalPoints: Number(r.normalPoints) || 10,
        specialPoints: Number(r.specialPoints) || 20,
        stealPoints: Number(r.stealPoints) || 5,
        isSpecial: Boolean(r.isSpecial),
        enabled: r.enabled !== false,
      };
    });

    // Cloud Mode Implementation (Requirement E & F)
    if (apiClient.getMode() === 'cloud') {
      try {
        const cloudRows = formattedQuestions.map((q, idx) => ({
          order: idx + 1,
          subject: q.subject,
          grade: q.grade,
          topic: q.topic,
          question: q.question,
          optionA: q.options[0],
          optionB: q.options[1],
          optionC: q.options[2],
          optionD: q.options[3],
          correctAnswer: q.correctAnswer === 0 ? 'A' : q.correctAnswer === 1 ? 'B' : q.correctAnswer === 2 ? 'C' : 'D',
          explanation: q.explanation,
          difficulty: q.difficulty,
          normalPoints: q.normalPoints,
          specialPoints: q.specialPoints,
          isSpecial: q.isSpecial,
        }));

        const res = await apiClient.apiRequest<ImportBatchResult>('questions.importBatch', {
          bankId,
          mode: mode.toUpperCase().includes('UPDATE') ? 'UPDATE' : mode.toUpperCase().includes('SKIP') ? 'SKIP' : 'CREATE',
          rows: cloudRows,
          fileName: options?.fileName || 'import.xlsx',
          fileType: options?.fileType || 'XLSX',
        });

        if (!res.success || !res.data) {
          throw new Error(res.error || res.message || 'Lỗi lưu câu hỏi trên Apps Script Google Sheets.');
        }

        const cloudResult: ImportBatchResult = {
          total: Number(res.data.total) || formattedQuestions.length,
          created: Number(res.data.created) || 0,
          updated: Number(res.data.updated) || 0,
          skipped: Number(res.data.skipped) || 0,
          failed: Number(res.data.failed) || 0,
          errors: Array.isArray(res.data.errors) ? res.data.errors : [],
        };

        // Cache locally as well
        this.applyLocalImport(bankId, formattedQuestions, mode);

        if (options?.importId) {
          markImportProcessed(options.importId, cloudResult);
        }

        return cloudResult;
      } catch (err: any) {
        console.error('Cloud questions.importBatch failed:', err);
        throw err;
      }
    }

    // Local Mode Implementation (Requirement D & F)
    const localResult = this.applyLocalImport(bankId, formattedQuestions, mode);

    if (options?.importId) {
      markImportProcessed(options.importId, localResult);
    }

    return localResult;
  }

  /**
   * Internal helper: persists questions to local storage for a specific bank
   */
  public static applyLocalImport(
    bankId: string,
    newQuestions: Question[],
    mode: string
  ): ImportBatchResult {
    const all = initializeDefaultQuestions();
    const normMode = mode.toUpperCase();

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    // Filter questions not belonging to this bank
    let otherBankQuestions = all.filter((q) => String(q.bankId) !== String(bankId));
    let bankQuestions = all.filter((q) => String(q.bankId) === String(bankId));

    if (normMode === 'REPLACE_ALL') {
      bankQuestions = [];
    }

    newQuestions.forEach((nq, idx) => {
      if (!nq.question || nq.options.filter(Boolean).length < 2) {
        failed++;
        errors.push(`Dòng ${idx + 1}: Câu hỏi thiếu nội dung hoặc không đủ phương án lựa chọn.`);
        return;
      }

      const cleanQ = nq.question.trim().toLowerCase();
      const existingIndex = bankQuestions.findIndex((q) => q.question.trim().toLowerCase() === cleanQ);

      if (existingIndex >= 0) {
        if (normMode === 'SKIP') {
          skipped++;
          return;
        } else if (normMode === 'UPDATE' || normMode === 'UPDATE_DUPLICATE') {
          bankQuestions[existingIndex] = {
            ...bankQuestions[existingIndex],
            ...nq,
            id: bankQuestions[existingIndex].id, // preserve existing ID
            bankId: bankId,
          };
          updated++;
          return;
        }
      }

      // Default append/create
      bankQuestions.push(nq);
      created++;
    });

    const combined = [...otherBankQuestions, ...bankQuestions];

    try {
      localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(combined));
    } catch (e) {
      console.warn('Failed to save questions to localStorage', e);
      errors.push('Lỗi lưu trữ cục bộ LocalStorage: đầy bộ nhớ hoặc quyền bị hạn chế.');
    }

    // Sync legacy QuestionBankRepository lesson questions
    try {
      const legacyLesson = QuestionBankRepository.getLessonById(bankId);
      if (legacyLesson) {
        legacyLesson.questions = bankQuestions;
        QuestionBankRepository.saveLesson(legacyLesson);
      }
    } catch (e) {
      console.warn('Failed to sync questions to legacy lesson', e);
    }

    return {
      total: newQuestions.length,
      created,
      updated,
      skipped,
      failed,
      errors,
    };
  }

  private static cacheQuestionsForBank(bankId: string, questions: Question[]): void {
    try {
      const all = initializeDefaultQuestions();
      const others = all.filter((q) => String(q.bankId) !== String(bankId));
      const updated = [...others, ...questions];
      localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(updated));

      // Also update legacy repository
      const legacyLesson = QuestionBankRepository.getLessonById(bankId);
      if (legacyLesson) {
        legacyLesson.questions = questions;
        QuestionBankRepository.saveLesson(legacyLesson);
      }
    } catch (e) {
      console.warn('Failed to cache questions locally', e);
    }
  }

  // Compatibility helpers
  public static async listQuestions(bankId: string = 'bank_tinhoc5_demo'): Promise<Question[]> {
    return this.listByBank(bankId);
  }

  public static async createQuestion(bankId: string, question: Omit<Question, 'id'>, order?: number): Promise<Question> {
    const res = await this.importBatch(bankId, [{ ...question, order: order || 1 }], 'CREATE');
    if (res.created > 0 || res.updated > 0) {
      const questions = await this.listByBank(bankId);
      return questions[questions.length - 1] || { ...question, id: Date.now() };
    }
    return { ...question, id: Date.now() };
  }
}

export const questionsRepository = QuestionsRepository;

export async function refreshQuestions(bankId: string): Promise<Question[]> {
  return QuestionsRepository.listByBank(bankId);
}
