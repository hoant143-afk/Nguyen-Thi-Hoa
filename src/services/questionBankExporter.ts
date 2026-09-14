/**
 * ==============================================================================
 * 🎓 EDUPLAY - QUESTION BANK EXPORTER
 * Format: Standard 18-column header identical to import schema for seamless round-trip
 * order,subject,grade,topic,questionType,question,optionA,optionB,optionC,optionD,correctAnswer,explanation,difficulty,normalPoints,specialPoints,isSpecial,enabled,tags
 * ==============================================================================
 */

import * as XLSX from 'xlsx';
import { Question, QuestionBankLesson } from '../types';
import { downloadFile } from './importer/questionImporter';

export const STANDARD_QUESTION_HEADERS = [
  'order',
  'subject',
  'grade',
  'topic',
  'questionType',
  'question',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctAnswer',
  'explanation',
  'difficulty',
  'normalPoints',
  'specialPoints',
  'isSpecial',
  'enabled',
  'tags',
];

export class QuestionBankExporter {
  private static formatQuestionsToRows(bank: QuestionBankLesson, questions: Question[]) {
    return questions.map((q, idx) => {
      const optA = q.options?.[0] || '';
      const optB = q.options?.[1] || '';
      const optC = q.options?.[2] || '';
      const optD = q.options?.[3] || '';

      const correctLetter =
        q.correctAnswer === 0
          ? 'A'
          : q.correctAnswer === 1
          ? 'B'
          : q.correctAnswer === 2
          ? 'C'
          : 'D';

      return {
        order: idx + 1,
        subject: bank.subject || 'Tin học',
        grade: String(bank.grade || 5),
        topic: bank.topic || bank.lessonTitle,
        questionType: 'multiple_choice',
        question: q.question,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctAnswer: correctLetter,
        explanation: q.explanation || '',
        difficulty: 'medium',
        normalPoints: q.normalPoints || 10,
        specialPoints: (q.normalPoints || 10) * 2,
        isSpecial: false,
        enabled: true,
        tags: `${bank.subject || 'Tin học'}, Lớp ${bank.grade || 5}`,
      };
    });
  }

  /**
   * Export Question Bank to CSV file with UTF-8 BOM
   */
  public static exportToCsv(bank: QuestionBankLesson, questions: Question[]): void {
    const rows = this.formatQuestionsToRows(bank, questions);

    const escapeCsv = (val: any) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const headerLine = STANDARD_QUESTION_HEADERS.join(',');
    const dataLines = rows.map((row) => {
      return [
        row.order,
        escapeCsv(row.subject),
        row.grade,
        escapeCsv(row.topic),
        row.questionType,
        escapeCsv(row.question),
        escapeCsv(row.optionA),
        escapeCsv(row.optionB),
        escapeCsv(row.optionC),
        escapeCsv(row.optionD),
        row.correctAnswer,
        escapeCsv(row.explanation),
        row.difficulty,
        row.normalPoints,
        row.specialPoints,
        row.isSpecial ? 'TRUE' : 'FALSE',
        row.enabled ? 'TRUE' : 'FALSE',
        escapeCsv(row.tags),
      ].join(',');
    });

    // Add UTF-8 BOM for Vietnamese character display in Excel
    const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
    const safeTitle = (bank.lessonTitle || 'Bo_cau_hoi').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeTitle}_Lop${bank.grade || 5}.csv`;

    downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
  }

  /**
   * Export Question Bank to XLSX file
   */
  public static exportToXlsx(bank: QuestionBankLesson, questions: Question[]): void {
    const rows = this.formatQuestionsToRows(bank, questions);

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: STANDARD_QUESTION_HEADERS,
    });

    // Auto fit column widths
    const colWidths = STANDARD_QUESTION_HEADERS.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((r: any) => String(r[key] || '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    const sheetName = (bank.lessonTitle || 'Questions').slice(0, 31).replace(/[:\\/?*\[\]]/g, '_');
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const safeTitle = (bank.lessonTitle || 'Bo_cau_hoi').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeTitle}_Lop${bank.grade || 5}.xlsx`;

    const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    downloadFile(
      new Uint8Array(out),
      fileName,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }
}
