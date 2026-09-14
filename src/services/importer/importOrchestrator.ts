import { QuestionBank, Question, GradeLevel, QuestionBankLesson } from '../../types';
import {
  questionBanksRepository,
  refreshQuestionBanks,
} from '../../repositories/questionBanksRepository';
import {
  questionsRepository,
  refreshQuestions,
  ImportBatchResult,
} from '../../repositories/questionsRepository';
import { QuestionBankRepository } from '../../repositories/questionBankRepository';

export interface ImportBankMetadata {
  name: string; // Required
  subject?: string;
  grade?: GradeLevel | number;
  topic?: string;
  description?: string;
  bankId?: string; // Optional: if editing an existing bank
  lessonNumber?: number;
}

export interface ImportOrchestratorOptions {
  mode?: 'CREATE' | 'SKIP' | 'UPDATE' | 'APPEND' | 'UPDATE_DUPLICATE' | 'REPLACE_ALL';
  fileName?: string;
  fileType?: string;
  clientImportId?: string;
  setActiveAsSelected?: boolean;
}

export interface SaveImportSummary {
  success: boolean;
  bankId: string;
  bank: QuestionBank;
  lesson: QuestionBankLesson;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  savedQuestions: Question[];
  partial?: boolean;
}

/**
 * Normalizes an arbitrary question row into a valid Question entity
 */
export function normalizeQuestionRow(raw: any, index: number, bankId?: string): Question | null {
  if (!raw) return null;

  // Question text
  const questionText = String(
    raw.question || raw.noidung || raw.cauhoi || raw.parsedQuestion?.question || ''
  ).trim();

  if (!questionText) return null;

  // Options parsing
  let optA = '';
  let optB = '';
  let optC = '';
  let optD = '';

  if (Array.isArray(raw.options)) {
    optA = String(raw.options[0] || '').trim();
    optB = String(raw.options[1] || '').trim();
    optC = String(raw.options[2] || '').trim();
    optD = String(raw.options[3] || '').trim();
  } else if (raw.parsedQuestion?.options && Array.isArray(raw.parsedQuestion.options)) {
    optA = String(raw.parsedQuestion.options[0] || '').trim();
    optB = String(raw.parsedQuestion.options[1] || '').trim();
    optC = String(raw.parsedQuestion.options[2] || '').trim();
    optD = String(raw.parsedQuestion.options[3] || '').trim();
  } else if (raw.options && typeof raw.options === 'object') {
    optA = String(raw.options.A || '').trim();
    optB = String(raw.options.B || '').trim();
    optC = String(raw.options.C || '').trim();
    optD = String(raw.options.D || '').trim();
  } else {
    optA = String(raw.optionA || raw.dapana || raw.phuongana || raw.a || '').trim();
    optB = String(raw.optionB || raw.dapanb || raw.phuonganb || raw.b || '').trim();
    optC = String(raw.optionC || raw.dapanc || raw.phuonganc || raw.c || '').trim();
    optD = String(raw.optionD || raw.dapand || raw.phuongand || raw.d || '').trim();
  }

  const validOptionsCount = [optA, optB, optC, optD].filter(Boolean).length;
  if (validOptionsCount < 2) {
    return null;
  }

  // Correct answer parsing: index 0, 1, 2, 3
  let correctIndex: 0 | 1 | 2 | 3 = 0;
  const rawCorrect = raw.correctAnswer !== undefined ? raw.correctAnswer : raw.parsedQuestion?.correctAnswer;

  if (typeof rawCorrect === 'number' && rawCorrect >= 0 && rawCorrect <= 3) {
    correctIndex = rawCorrect as 0 | 1 | 2 | 3;
  } else if (typeof rawCorrect === 'string') {
    const s = rawCorrect.trim().toUpperCase();
    if (s === 'B' || s === '1' || s === 'ĐÁP ÁN B' || s === 'DAPAN B') correctIndex = 1;
    else if (s === 'C' || s === '2' || s === 'ĐÁP ÁN C' || s === 'DAPAN C') correctIndex = 2;
    else if (s === 'D' || s === '3' || s === 'ĐÁP ÁN D' || s === 'DAPAN D') correctIndex = 3;
    else if (s === 'A' || s === '0' || s === 'ĐÁP ÁN A' || s === 'DAPAN A') correctIndex = 0;
  }

  const explanation = String(
    raw.explanation || raw.giaithich || raw.huongdan || raw.parsedQuestion?.explanation || ''
  ).trim();

  const difficulty = (raw.difficulty || raw.dokho || raw.parsedQuestion?.difficulty || 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD';
  const normalPoints = Number(raw.normalPoints || raw.diem || raw.points || raw.parsedQuestion?.normalPoints) || 10;
  const specialPoints = Number(raw.specialPoints || raw.diemdacbiet || raw.parsedQuestion?.specialPoints) || 20;
  const stealPoints = Number(raw.stealPoints || raw.diemcuop || raw.parsedQuestion?.stealPoints) || 5;
  const isSpecial = Boolean(raw.isSpecial || raw.dacbiet || raw.parsedQuestion?.isSpecial);

  return {
    id: Number(raw.id) || Date.now() + index,
    bankId: bankId || '',
    question: questionText,
    options: [optA, optB, optC, optD],
    correctAnswer: correctIndex,
    explanation,
    category: String(raw.category || raw.chude || raw.subject || 'Tin học').trim(),
    subject: String(raw.subject || 'Tin học').trim(),
    grade: raw.grade || 5,
    topic: String(raw.topic || raw.chude || '').trim(),
    difficulty,
    normalPoints,
    specialPoints,
    stealPoints,
    isSpecial,
    enabled: true,
  };
}

/**
 * Orchestrates the complete Question Bank Import Pipeline
 * 1. normalize rows
 * 2. validate rows
 * 3. create question bank
 * 4. lấy bankId
 * 5. attach bankId vào từng question
 * 6. persist batch
 * 7. verify result
 * 8. update questionCount
 * 9. reload repositories
 * 10. return save summary
 */
export async function saveImportedQuestionBank(
  metadata: ImportBankMetadata,
  rows: any[],
  options?: ImportOrchestratorOptions
): Promise<SaveImportSummary> {
  // Step 1: Normalize rows
  const normalizedList: Question[] = [];
  const validationErrors: string[] = [];

  rows.forEach((r, idx) => {
    const item = normalizeQuestionRow(r, idx);
    if (item) {
      normalizedList.push(item);
    } else {
      validationErrors.push(`Dòng ${idx + 1}: Thiếu nội dung câu hỏi hoặc không đủ ít nhất 2 phương án trả lời.`);
    }
  });

  // Step 2: Validate rows
  if (normalizedList.length === 0) {
    throw new Error('Không có câu hỏi hợp lệ để lưu. Vui lòng kiểm tra lại nội dung tệp.');
  }

  // Validate metadata (Requirement M: name bắt buộc)
  const bankName = (metadata.name || '').trim();
  if (!bankName) {
    throw new Error('Tên ngân hàng câu hỏi (name) là bắt buộc. Vui lòng nhập tên bộ câu hỏi trước khi lưu.');
  }

  const subject = (metadata.subject || 'Tin học').trim();
  const grade = (metadata.grade as GradeLevel) || 5;
  const topic = (metadata.topic || '').trim();
  const description = (metadata.description || '').trim();

  // Step 3: Create Question Bank & Import Questions
  const importId = options?.clientImportId || `imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const saveMode = options?.mode || 'CREATE';

  let bankId = metadata.bankId;
  let bank: QuestionBank;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = validationErrors.length;
  let allErrors = [...validationErrors];
  let isPartial = false;

  if (!bankId) {
    // Flow 1: New Question Bank -> Call createImportedBank (uses questionBanks.saveImported in cloud)
    const saveResult = await questionBanksRepository.createImportedBank({
      bank: {
        name: bankName,
        subject,
        grade,
        topic,
        description,
      },
      questions: normalizedList,
      import: {
        importId,
        fileName: options?.fileName || 'cau_hoi.xlsx',
        fileType: options?.fileType || 'XLSX',
        mode: saveMode,
      },
    });

    bank = saveResult.bank;
    bankId = bank.id;
    createdCount = saveResult.importResult.created;
    updatedCount = saveResult.importResult.updated;
    skippedCount = saveResult.importResult.skipped;
    failedCount += saveResult.importResult.failed;
    if (saveResult.importResult.errors) {
      allErrors.push(...saveResult.importResult.errors);
    }
    isPartial = Boolean(saveResult.partial);
  } else {
    // Flow 2: Existing Bank -> Update questions batch
    const existing = await questionBanksRepository.get(bankId);
    if (!existing) {
      throw new Error(`Không tìm thấy ngân hàng câu hỏi có ID: ${bankId}`);
    }
    bank = existing;

    const attachedQuestions: Question[] = normalizedList.map((q, idx) => ({
      ...q,
      bankId: bankId!,
      id: Number(q.id) || Date.now() + idx,
    }));

    const batchResult = await questionsRepository.importBatch(bankId, attachedQuestions, saveMode, {
      fileName: options?.fileName || 'cau_hoi.xlsx',
      fileType: options?.fileType || 'XLSX',
      importId,
    });

    createdCount = batchResult.created;
    updatedCount = batchResult.updated;
    skippedCount = batchResult.skipped;
    failedCount += batchResult.failed;
    allErrors.push(...batchResult.errors);
    isPartial = batchResult.failed > 0 && batchResult.created > 0;
  }

  // Step 4: Verify persistence (Requirement 20: verify via listByBank, no fake success)
  const savedQuestions = await questionsRepository.listByBank(bankId);

  if (savedQuestions.length === 0) {
    throw new Error(
      '⚠️ Dữ liệu chưa được xác minh. Vui lòng kiểm tra kết nối database.'
    );
  }

  // Step 5: Update questionCount (Requirement H)
  const actualCount = savedQuestions.length;
  await questionBanksRepository.update(bankId, {
    questionCount: actualCount,
  });
  bank.questionCount = actualCount;

  // Step 6: Reload repositories (Requirement 13: reload question banks, no F5 required)
  await refreshQuestionBanks();
  await refreshQuestions(bankId);

  // Synchronize with legacy QuestionBankLesson for games
  const legacyLesson: QuestionBankLesson = {
    id: bankId,
    grade,
    subject,
    lessonNumber: metadata.lessonNumber || 99,
    lessonTitle: bankName,
    description,
    questions: savedQuestions,
  };
  QuestionBankRepository.saveLesson(legacyLesson);

  if (options?.setActiveAsSelected !== false) {
    QuestionBankRepository.setSelectedLessonId(bankId);
  }

  // Step 7: Return Save Summary
  return {
    success: true,
    bankId,
    bank,
    lesson: legacyLesson,
    totalRows: rows.length,
    createdCount,
    updatedCount,
    skippedCount,
    failedCount,
    errors: allErrors,
    savedQuestions,
    partial: isPartial,
  };
}
