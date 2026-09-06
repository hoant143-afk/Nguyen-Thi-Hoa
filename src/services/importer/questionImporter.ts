import * as XLSX from 'xlsx';
import { Question } from '../../types';
import {
  ColumnMapping,
  ImportHistoryEntry,
  QuestionImportMode,
  ValidatedQuestionRow,
} from './types';

export const IMPORT_HISTORY_STORAGE_KEY = 'eduplay_import_history_v1';

/**
 * Remove Vietnamese accents and special characters for fuzzy header matching
 */
export function normalizeHeaderKey(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Guess best field mapping based on header names
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const matchers: Record<keyof ColumnMapping, string[]> = {
    order: ['stt', 'order', 'no', 'thutu', 'id', 'sothutu', 'cauthu'],
    subject: ['subject', 'mon', 'monhoc', 'chuongtrinh'],
    grade: ['grade', 'lop', 'khoi', 'khoilop'],
    topic: ['topic', 'chude', 'bai', 'chuyende', 'phan', 'baihoc'],
    questionType: ['questiontype', 'loai', 'loaicauhoi', 'type', 'kieu'],
    question: ['question', 'cauhoi', 'noidung', 'cau', 'noidungcauhoi', 'cauhoitracnghiem'],
    optionA: ['optiona', 'dapana', 'phuongana', 'a', 'caua', 'luachona'],
    optionB: ['optionb', 'dapanb', 'phuonganb', 'b', 'caub', 'luachonb'],
    optionC: ['optionc', 'dapanc', 'phuonganc', 'c', 'cauc', 'luachonc'],
    optionD: ['optiond', 'dapand', 'phuongand', 'd', 'caud', 'luachond'],
    correctAnswer: ['correctanswer', 'dapandung', 'dapan', 'correct', 'answer', 'key', 'ketqua'],
    explanation: ['explanation', 'giaithich', 'huongdan', 'huongdangiai', 'note', 'ghichu', 'loigiai'],
    difficulty: ['difficulty', 'dokho', 'mucdo', 'level'],
    normalPoints: ['normalpoints', 'diem', 'points', 'diemchinh', 'point', 'diemso'],
    stealPoints: ['stealpoints', 'diemcuop', 'steal', 'cuop'],
    specialPoints: ['specialpoints', 'diemdacbiet', 'special', 'pointsx2'],
    isSpecial: ['isspecial', 'dacbiet', 'caudacbiet', 'specialquestion'],
    enabled: ['enabled', 'kichhoat', 'hieuluc', 'sudung', 'active'],
    tags: ['tags', 'the', 'tag', 'nhan', 'tukhoa'],
  };

  for (const rawHeader of headers) {
    const norm = normalizeHeaderKey(rawHeader);
    for (const [field, keywords] of Object.entries(matchers) as [keyof ColumnMapping, string[]][]) {
      if (!mapping[field]) {
        if (keywords.some((k) => norm === k || norm.startsWith(k) || norm.includes(k))) {
          mapping[field] = rawHeader;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Parses correct answer string to 0, 1, 2, 3
 */
export function parseCorrectAnswer(
  val: any,
  options: [string, string, string, string]
): { index: 0 | 1 | 2 | 3; error?: string } {
  if (val === undefined || val === null || val === '') {
    return { index: 0, error: 'Chưa có đáp án đúng' };
  }

  const str = String(val).trim();
  const upper = str.toUpperCase();

  // Letter match
  if (upper === 'A' || upper === '1' || upper === '0' || upper === 'ĐÁP ÁN A' || upper === 'DAPAN A') {
    return { index: 0 };
  }
  if (upper === 'B' || upper === '2' || upper === 'ĐÁP ÁN B' || upper === 'DAPAN B') {
    return { index: 1 };
  }
  if (upper === 'C' || upper === '3' || upper === 'ĐÁP ÁN C' || upper === 'DAPAN C') {
    return { index: 2 };
  }
  if (upper === 'D' || upper === '4' || upper === 'ĐÁP ÁN D' || upper === 'DAPAN D') {
    return { index: 3 };
  }

  // Exact or fuzzy text match against one of the options
  const cleanStr = normalizeHeaderKey(str);
  for (let i = 0; i < 4; i++) {
    const optClean = normalizeHeaderKey(options[i]);
    if (optClean && (optClean === cleanStr || options[i].trim().toLowerCase() === str.toLowerCase())) {
      return { index: i as 0 | 1 | 2 | 3 };
    }
  }

  return { index: 0, error: `Đáp án "${str}" không khớp với A, B, C, D hoặc nội dung phương án nào` };
}

/**
 * Parse boolean helper
 */
export function parseBoolean(val: any, defaultVal: boolean): boolean {
  if (val === undefined || val === null || val === '') return defaultVal;
  const s = String(val).trim().toLowerCase();
  if (['true', '1', 'yes', 'có', 'co', 'đặc biệt', 'dac biet', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'không', 'khong', 'n'].includes(s)) return false;
  return defaultVal;
}

const parseDifficulty = (val: string): 'EASY' | 'MEDIUM' | 'HARD' => {
  const norm = val.trim().toUpperCase();
  if (norm.includes('EASY') || norm.includes('DE') || norm.includes('DỄ')) return 'EASY';
  if (norm.includes('HARD') || norm.includes('KHO') || norm.includes('KHÓ')) return 'HARD';
  return 'MEDIUM';
};

/**
 * Validate each row with detailed error reporting and duplicate detection
 */
export function validateImportRows(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  existingQuestions: Question[],
  mode: QuestionImportMode
): ValidatedQuestionRow[] {
  const validatedList: ValidatedQuestionRow[] = [];

  const existingMapByQuestion = new Map<string, Question>();
  const existingMapById = new Map<number, Question>();

  for (const q of existingQuestions) {
    if (q.question) {
      existingMapByQuestion.set(normalizeHeaderKey(q.question), q);
    }
    if (q.id) {
      existingMapById.set(q.id, q);
    }
  }

  rows.forEach((row, idx) => {
    const rowNumber = idx + 1;
    const errors: string[] = [];

    // Extract values based on mapping
    const getVal = (field: keyof ColumnMapping) => {
      const headerName = mapping[field];
      return headerName && row[headerName] !== undefined ? String(row[headerName]).trim() : '';
    };

    const questionText = getVal('question');
    const optA = getVal('optionA');
    const optB = getVal('optionB');
    const optC = getVal('optionC');
    const optD = getVal('optionD');
    const rawCorrectAnswer = getVal('correctAnswer');
    const explanation = getVal('explanation');
    const rawNormalPoints = getVal('normalPoints');
    const rawStealPoints = getVal('stealPoints');
    const rawSpecialPoints = getVal('specialPoints');
    const rawIsSpecial = getVal('isSpecial');
    const rawEnabled = getVal('enabled');
    const subject = getVal('subject') || 'Tin học';
    const grade = getVal('grade') || '5';
    const topic = getVal('topic') || '';
    const questionType = getVal('questionType') || 'multiple_choice';
    const rawOrder = getVal('order');
    const tagsStr = getVal('tags');

    // Validation checks
    if (!questionText) {
      errors.push('Nội dung câu hỏi không được để trống');
    }

    if (!optA || !optB) {
      errors.push('Cần có tối thiểu 2 phương án lựa chọn (A và B)');
    }

    const options: [string, string, string, string] = [
      optA || 'Phương án A',
      optB || 'Phương án B',
      optC || '',
      optD || '',
    ];

    const answerParsed = parseCorrectAnswer(rawCorrectAnswer, options);
    if (answerParsed.error) {
      errors.push(answerParsed.error);
    }

    // Number points validation
    let normalPoints = 10;
    if (rawNormalPoints !== '') {
      const n = Number(rawNormalPoints);
      if (isNaN(n) || n < 0) {
        errors.push('Điểm câu hỏi (normalPoints) phải là số không âm');
      } else {
        normalPoints = n;
      }
    }

    let stealPoints = 5;
    if (rawStealPoints !== '') {
      const n = Number(rawStealPoints);
      if (isNaN(n) || n < 0) {
        errors.push('Điểm cướp (stealPoints) phải là số không âm');
      } else {
        stealPoints = n;
      }
    }

    let specialPoints = 20;
    if (rawSpecialPoints !== '') {
      const n = Number(rawSpecialPoints);
      if (!isNaN(n) && n >= 0) {
        specialPoints = n;
      }
    }

    const isSpecial = parseBoolean(rawIsSpecial, false);
    const enabled = parseBoolean(rawEnabled, true);

    // Duplicate check
    const normalizedQ = normalizeHeaderKey(questionText);
    const existingMatch = existingMapByQuestion.get(normalizedQ);
    const isDuplicate = Boolean(existingMatch);

    let duplicateAction: 'NEW' | 'UPDATE' | 'SKIP' = 'NEW';
    if (isDuplicate) {
      if (mode === 'UPDATE_DUPLICATE') {
        duplicateAction = 'UPDATE';
      } else if (mode === 'APPEND') {
        duplicateAction = 'SKIP';
      } else {
        duplicateAction = 'NEW';
      }
    }

    let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
    let statusText = '✅ Hợp lệ';

    if (errors.length > 0) {
      status = 'ERROR';
      statusText = '❌ Sai định dạng';
    } else if (isDuplicate) {
      status = 'WARNING';
      statusText =
        mode === 'UPDATE_DUPLICATE'
          ? '🔄 Trùng - Sẽ cập nhật'
          : mode === 'APPEND'
          ? '⚠️ Trùng - Sẽ bỏ qua'
          : '⚠️ Câu hỏi đã tồn tại';
    }

    const parsedQuestion: ValidatedQuestionRow['parsedQuestion'] = {
      id: rawOrder && !isNaN(Number(rawOrder)) ? Number(rawOrder) : undefined,
      question: questionText,
      options,
      correctAnswer: answerParsed.index,
      category: (topic ? `${subject} ${grade} - ${topic}` : `${subject} ${grade}`) || 'Tin học 5',
      subject,
      grade,
      topic,
      questionType,
      explanation: explanation || '',
      difficulty: parseDifficulty(getVal('difficulty')),
      normalPoints,
      stealPoints,
      specialPoints,
      isSpecial,
      enabled,
      tags: tagsStr ? tagsStr.split(/[,;]/).map((t) => t.trim()).filter(Boolean) : undefined,
    };

    validatedList.push({
      rowNumber,
      originalData: row,
      status,
      statusText,
      isDuplicate,
      duplicateAction,
      errorMessages: errors,
      parsedQuestion: errors.length === 0 ? parsedQuestion : undefined,
    });
  });

  return validatedList;
}

/**
 * Generate CSV template with Vietnamese sample questions and BOM
 */
export function generateQuestionCsvTemplate(): string {
  const headers = [
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
    'stealPoints',
    'specialPoints',
    'isSpecial',
    'enabled',
    'tags',
  ];

  const sampleRows = [
    [
      '1',
      'Tin học',
      '5',
      'Scratch',
      'multiple_choice',
      '"Trong Scratch, nhân vật điều khiển được gọi là gì?"',
      '"Sprite"',
      '"Costume"',
      '"Backdrop"',
      '"Script"',
      'A',
      '"Sprite là tên gọi của nhân vật đồ họa tương tác trong Scratch."',
      'easy',
      '10',
      '5',
      '20',
      'FALSE',
      'TRUE',
      'Scratch,Nhân vật',
    ],
    [
      '2',
      'Tin học',
      '5',
      'Phần cứng máy tính',
      'multiple_choice',
      '"Đâu là thiết bị xuất dữ liệu giúp hiển thị kết quả ra ngoài?"',
      '"Bàn phím"',
      '"Chuột máy tính"',
      '"Màn hình"',
      '"Máy quét"',
      'C',
      '"Màn hình và máy in là các thiết bị xuất thông tin cơ bản."',
      'medium',
      '10',
      '5',
      '20',
      'FALSE',
      'TRUE',
      'Phần cứng,Thiết bị xuất',
    ],
    [
      '3',
      'Tin học',
      '5',
      'An toàn số',
      'multiple_choice',
      '"Hành động nào thể hiện em là một công dân số có trách nhiệm trên Internet?"',
      '"Chia sẻ mật khẩu cá nhân cho bạn bè cùng lớp"',
      '"Tôn trọng bản quyền và luôn hỏi ý kiến bố mẹ trước khi tải tệp lạ"',
      '"Bình luận tiêu cực, chế giễu hình ảnh người khác"',
      '"Đăng công khai số điện thoại và địa chỉ nhà lên mạng xã hội"',
      'B',
      '"Bảo vệ thông tin cá nhân và tôn trọng người khác là văn hóa mạng chuẩn mực."',
      'medium',
      '15',
      '10',
      '30',
      'TRUE',
      'TRUE',
      'An toàn số,Văn hóa mạng,Đặc biệt',
    ],
  ];

  const csvContent = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\r\n');

  // Prefix with UTF-8 BOM so Excel opens with correct Vietnamese accents
  return '\uFEFF' + csvContent;
}

/**
 * Generate Excel .xlsx template with formatted styling
 */
export function generateQuestionExcelTemplate(): Uint8Array {
  const data = [
    {
      order: 1,
      subject: 'Tin học',
      grade: '5',
      topic: 'Scratch',
      questionType: 'multiple_choice',
      question: 'Trong Scratch, nhân vật điều khiển được gọi là gì?',
      optionA: 'Sprite',
      optionB: 'Costume',
      optionC: 'Backdrop',
      optionD: 'Script',
      correctAnswer: 'A',
      explanation: 'Sprite là tên gọi của nhân vật đồ họa tương tác trong Scratch.',
      difficulty: 'easy',
      normalPoints: 10,
      stealPoints: 5,
      specialPoints: 20,
      isSpecial: false,
      enabled: true,
      tags: 'Scratch, Nhân vật',
    },
    {
      order: 2,
      subject: 'Tin học',
      grade: '5',
      topic: 'Phần cứng',
      questionType: 'multiple_choice',
      question: 'Đâu là thiết bị xuất dữ liệu giúp hiển thị kết quả ra ngoài?',
      optionA: 'Bàn phím',
      optionB: 'Chuột máy tính',
      optionC: 'Màn hình',
      optionD: 'Máy quét',
      correctAnswer: 'C',
      explanation: 'Màn hình và máy in là các thiết bị xuất thông tin cơ bản.',
      difficulty: 'medium',
      normalPoints: 10,
      stealPoints: 5,
      specialPoints: 20,
      isSpecial: false,
      enabled: true,
      tags: 'Phần cứng, Thiết bị xuất',
    },
    {
      order: 3,
      subject: 'Tin học',
      grade: '5',
      topic: 'An toàn số',
      questionType: 'multiple_choice',
      question: 'Hành động nào thể hiện em là một công dân số có trách nhiệm trên Internet?',
      optionA: 'Chia sẻ mật khẩu cá nhân cho bạn bè cùng lớp',
      optionB: 'Tôn trọng bản quyền và luôn hỏi ý kiến bố mẹ trước khi tải tệp lạ',
      optionC: 'Bình luận tiêu cực, chế giễu hình ảnh người khác',
      optionD: 'Đăng công khai số điện thoại và địa chỉ nhà lên mạng xã hội',
      correctAnswer: 'B',
      explanation: 'Bảo vệ thông tin cá nhân và tôn trọng người khác là văn hóa mạng chuẩn mực.',
      difficulty: 'hard',
      normalPoints: 15,
      stealPoints: 10,
      specialPoints: 30,
      isSpecial: true,
      enabled: true,
      tags: 'An toàn số, Đặc biệt',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tin học 5');

  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}

/**
 * Trigger browser file download for text or binary content
 */
export function downloadFile(content: string | Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Save record to Import History
 */
export function logImportHistory(entry: Omit<ImportHistoryEntry, 'id' | 'importedAt'>) {
  try {
    const raw = localStorage.getItem(IMPORT_HISTORY_STORAGE_KEY);
    const list: ImportHistoryEntry[] = raw ? JSON.parse(raw) : [];
    const newEntry: ImportHistoryEntry = {
      ...entry,
      id: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      importedAt: Date.now(),
    };
    const updated = [newEntry, ...list].slice(0, 30);
    localStorage.setItem(IMPORT_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save import history', err);
  }
}

/**
 * Get import history records
 */
export function getImportHistory(): ImportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(IMPORT_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
