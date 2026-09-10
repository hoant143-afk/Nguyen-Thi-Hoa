export interface ImportHistoryEntry {
  id: string;
  fileName: string;
  fileType: 'CSV' | 'XLSX' | 'XLS';
  target: 'QUESTIONS' | 'TEAMS';
  importedRows: number;
  skippedRows: number;
  errorRows: number;
  importedAt: number;
}

export type QuestionImportMode = 'APPEND' | 'UPDATE_DUPLICATE' | 'REPLACE_ALL';

export interface ColumnMapping {
  order?: string;
  subject?: string;
  grade?: string;
  topic?: string;
  questionType?: string;
  question?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  explanation?: string;
  difficulty?: string;
  normalPoints?: string;
  stealPoints?: string;
  specialPoints?: string;
  isSpecial?: string;
  enabled?: string;
  tags?: string;
}

export type RowValidationStatus = 'VALID' | 'WARNING' | 'ERROR';

export interface ValidatedQuestionRow {
  rowNumber: number;
  originalData: Record<string, any>;
  status: RowValidationStatus;
  statusText: string;
  isDuplicate: boolean;
  duplicateAction: 'NEW' | 'UPDATE' | 'SKIP';
  errorMessages: string[];
  parsedQuestion?: {
    id?: number;
    question: string;
    options: [string, string, string, string];
    correctAnswer: 0 | 1 | 2 | 3;
    category: string;
    subject?: string;
    grade?: string;
    topic?: string;
    questionType?: string;
    explanation: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    normalPoints?: number;
    stealPoints?: number;
    specialPoints?: number;
    isSpecial?: boolean;
    enabled?: boolean;
    tags?: string[];
  };
}

export interface TeamImportItem {
  id: string;
  teamName: string;
  teamColor: string;
  markerColor?: string;
  badge?: string;
  selected: boolean;
  isValid: boolean;
  error?: string;
}
