import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Settings,
  History,
  RefreshCw,
  Eye,
  Trash2,
  ChevronDown,
  Layers,
  Save,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Question, GradeLevel, QuestionBankLesson } from '../../types';
import { parseCsv } from '../../services/importer/csvParser';
import { extractSheetData, readExcelWorkbook } from '../../services/importer/excelParser';
import {
  autoDetectColumnMapping,
  downloadFile,
  generateQuestionCsvTemplate,
  generateQuestionExcelTemplate,
  getImportHistory,
  logImportHistory,
  validateImportRows,
} from '../../services/importer/questionImporter';
import {
  ColumnMapping,
  ImportHistoryEntry,
  QuestionImportMode,
  ValidatedQuestionRow,
} from '../../services/importer/types';
import { soundService } from '../../services/soundService';
import {
  saveImportedQuestionBank,
  SaveImportSummary,
} from '../../services/importer/importOrchestrator';

export type ImportStage = 'IDLE' | 'PARSING' | 'FILE_PARSED' | 'SAVING' | 'DATA_SAVED' | 'ERROR';

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newQuestions: Question[]) => void;
  onImportLessonSuccess?: (newLesson: QuestionBankLesson, newQuestions: Question[]) => void;
  currentQuestions: Question[];
  initialLessonTitle?: string;
  initialGrade?: GradeLevel;
  initialSubject?: string;
  initialTopic?: string;
  targetLessonId?: string;
  saveAsLesson?: boolean;
}

export const QuestionImportModal: React.FC<QuestionImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onImportLessonSuccess,
  currentQuestions,
  initialLessonTitle = '',
  initialGrade = 5,
  initialSubject = 'Tin học',
  initialTopic = '',
  targetLessonId,
}) => {
  // Stage separation: FILE_PARSED vs DATA_SAVED (Requirement A)
  const [importStage, setImportStage] = useState<ImportStage>('IDLE');
  const [saveSummary, setSaveSummary] = useState<SaveImportSummary | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form Fields before Save (Requirement M)
  const [bankName, setBankName] = useState<string>(initialLessonTitle);
  const [bankGrade, setBankGrade] = useState<GradeLevel>(initialGrade);
  const [bankSubject, setBankSubject] = useState<string>(initialSubject);
  const [bankTopic, setBankTopic] = useState<string>(initialTopic);
  const [bankDescription, setBankDescription] = useState<string>('');
  const [nameTouched, setNameTouched] = useState<boolean>(false);
  const [showErrorsList, setShowErrorsList] = useState<boolean>(false);
  const importIdRef = useRef<string | null>(null);

  // Workbook / sheets state
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Raw data from current file/sheet
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  // Mapping & Mode
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [showMappingConfig, setShowMappingConfig] = useState(false);
  const [importMode, setImportMode] = useState<QuestionImportMode>('APPEND');
  const [filterView, setFilterView] = useState<'ALL' | 'VALID_ONLY' | 'ERROR_ONLY'>('ALL');

  // History modal
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<ImportHistoryEntry[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Reset upload state
  const handleResetFile = () => {
    setFile(null);
    setFileInfo(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setImportStage('IDLE');
    setSaveSummary(null);
    setSaveErrorMessage(null);
    setNameTouched(false);
    setShowErrorsList(false);
    importIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Read file handler (Stage: PARSING -> FILE_PARSED)
  const processUploadedFile = async (selectedFile: File) => {
    try {
      setImportStage('PARSING');
      setSaveErrorMessage(null);
      setSaveSummary(null);
      soundService.playClick();
      setFile(selectedFile);

      const isCsv = selectedFile.name.toLowerCase().endsWith('.csv');
      const isXlsx = selectedFile.name.toLowerCase().endsWith('.xlsx');
      const isXls = selectedFile.name.toLowerCase().endsWith('.xls');

      if (!isCsv && !isXlsx && !isXls) {
        alert('Vui lòng chọn tệp định dạng .csv, .xlsx hoặc .xls');
        setImportStage('IDLE');
        return;
      }

      setFileInfo({
        name: selectedFile.name,
        size: formatFileSize(selectedFile.size),
        type: isCsv ? 'CSV' : isXlsx ? 'Excel (.xlsx)' : 'Excel (.xls)',
      });

      // Auto-detect bank name, grade, subject from file name if empty
      const cleanBaseName = selectedFile.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();

      if (!bankName) {
        setBankName(cleanBaseName);
      }

      const gradeMatch = cleanBaseName.match(/(?:khoi|khối|lop|lớp|k)\s*([1-9])/i);
      if (gradeMatch) {
        const detectedGrade = parseInt(gradeMatch[1], 10) as GradeLevel;
        if (detectedGrade >= 1 && detectedGrade <= 9) {
          setBankGrade(detectedGrade);
        }
      }

      const lowerBase = cleanBaseName.toLowerCase();
      if (lowerBase.includes('toán') || lowerBase.includes('toan')) setBankSubject('Toán');
      else if (lowerBase.includes('tiếng việt') || lowerBase.includes('tieng viet')) setBankSubject('Tiếng Việt');
      else if (lowerBase.includes('tiếng anh') || lowerBase.includes('tieng anh') || lowerBase.includes('english')) setBankSubject('Tiếng Anh');
      else if (lowerBase.includes('khoa học') || lowerBase.includes('khoa hoc')) setBankSubject('Khoa học');
      else if (lowerBase.includes('lịch sử') || lowerBase.includes('địa lý') || lowerBase.includes('dia ly')) setBankSubject('Lịch sử & Địa lý');
      else if (lowerBase.includes('tin học') || lowerBase.includes('tin hoc')) setBankSubject('Tin học');

      if (isCsv) {
        const text = await selectedFile.text();
        const parsed = parseCsv(text);
        setRawHeaders(parsed.headers);
        setRawRows(parsed.rows);
        const autoMap = autoDetectColumnMapping(parsed.headers);
        setColumnMapping(autoMap);
      } else {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const wbInfo = readExcelWorkbook(arrayBuffer);
        setWorkbook(wbInfo.workbook);
        setSheetNames(wbInfo.sheetNames);

        if (wbInfo.sheetNames.length > 0) {
          const firstSheet = wbInfo.sheetNames[0];
          setSelectedSheet(firstSheet);
          const sheetData = extractSheetData(wbInfo.workbook, firstSheet);
          setRawHeaders(sheetData.headers);
          setRawRows(sheetData.rows);
          const autoMap = autoDetectColumnMapping(sheetData.headers);
          setColumnMapping(autoMap);
        }
      }

      // Transition to FILE_PARSED (File parsed successfully, waiting for user confirmation before saving)
      setImportStage('FILE_PARSED');
    } catch (err: any) {
      console.error('Lỗi khi đọc tệp:', err);
      setImportStage('ERROR');
      setSaveErrorMessage(`Không thể đọc tệp: ${err.message || 'Tệp bị lỗi hoặc không đúng định dạng.'}`);
      handleResetFile();
    }
  };

  // Switch Excel sheet
  const handleSheetChange = (sheetName: string) => {
    if (!workbook) return;
    soundService.playClick();
    setSelectedSheet(sheetName);
    const sheetData = extractSheetData(workbook, sheetName);
    setRawHeaders(sheetData.headers);
    setRawRows(sheetData.rows);
    const autoMap = autoDetectColumnMapping(sheetData.headers);
    setColumnMapping(autoMap);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Validated rows
  const validatedRows: ValidatedQuestionRow[] = useMemo(() => {
    if (rawRows.length === 0) return [];
    return validateImportRows(rawRows, columnMapping, currentQuestions, importMode);
  }, [rawRows, columnMapping, currentQuestions, importMode]);

  // Statistics
  const stats = useMemo(() => {
    const total = validatedRows.length;
    const valid = validatedRows.filter((r) => r.status === 'VALID').length;
    const warning = validatedRows.filter((r) => r.status === 'WARNING').length;
    const error = validatedRows.filter((r) => r.status === 'ERROR').length;
    const duplicates = validatedRows.filter((r) => r.isDuplicate).length;
    return { total, valid, warning, error, duplicates };
  }, [validatedRows]);

  // Filtered rows for display
  const displayedRows = useMemo(() => {
    if (filterView === 'VALID_ONLY') {
      return validatedRows.filter((r) => r.status === 'VALID' || r.status === 'WARNING');
    }
    if (filterView === 'ERROR_ONLY') {
      return validatedRows.filter((r) => r.status === 'ERROR');
    }
    return validatedRows;
  }, [validatedRows, filterView]);

  // Validation before saving (Requirement M)
  const isNameValid = bankName.trim().length > 0;
  const rowsToSave = useMemo(() => {
    return validatedRows.filter((r) => {
      if (r.status === 'ERROR' || !r.parsedQuestion) return false;
      if (r.isDuplicate && importMode === 'APPEND') return false;
      return true;
    });
  }, [validatedRows, importMode]);

  const canSave = isNameValid && rowsToSave.length > 0 && importStage !== 'SAVING';

  // ORCHESTRATION EXECUTION: saveImportedQuestionBank (Requirement B & L)
  const handleSaveQuestionBank = async () => {
    setNameTouched(true);
    if (!isNameValid) {
      soundService.playWrong();
      setSaveErrorMessage('⚠️ Vui lòng nhập tên bộ câu hỏi.');
      return;
    }

    if (rowsToSave.length === 0) {
      soundService.playWrong();
      setSaveErrorMessage('Không có câu hỏi hợp lệ nào để lưu.');
      return;
    }

    soundService.playClick();
    setImportStage('SAVING');
    setSaveErrorMessage(null);

    // Requirement 10: Giữ cùng importId trong toàn bộ lần retry của cùng 1 lần import
    if (!importIdRef.current) {
      importIdRef.current = `import_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    try {
      // Execute 10-step persistence orchestration
      const summary = await saveImportedQuestionBank(
        {
          name: bankName.trim(),
          subject: bankSubject.trim() || 'Tin học',
          grade: bankGrade,
          topic: bankTopic.trim(),
          description: bankDescription.trim() || `Bộ câu hỏi nhập từ tệp ${fileInfo?.name || 'Excel/CSV'}`,
          bankId: targetLessonId,
        },
        rowsToSave.map((r) => r.parsedQuestion),
        {
          mode: importMode,
          fileName: fileInfo?.name,
          fileType: fileInfo?.type.includes('CSV') ? 'CSV' : 'XLSX',
          clientImportId: importIdRef.current,
          setActiveAsSelected: true,
        }
      );

      // Log import history
      logImportHistory({
        fileName: fileInfo?.name || 'unknown_file',
        fileType: (fileInfo?.type?.includes('CSV') ? 'CSV' : 'XLSX') as any,
        target: 'QUESTIONS',
        importedRows: summary.createdCount + summary.updatedCount,
        skippedRows: summary.skippedCount,
        errorRows: summary.failedCount,
      });

      if (summary.partial) {
        soundService.playWrong();
      } else {
        soundService.playCorrect();
      }

      setSaveSummary(summary);
      // ONLY SHOW SUCCESS AFTER REPOSITORY PERSISTENCE COMMIT (Requirement A)
      setImportStage('DATA_SAVED');
    } catch (err: any) {
      console.error('Lỗi khi lưu bộ câu hỏi:', err);
      soundService.playWrong();
      setImportStage('ERROR');

      let userMsg = err.message || 'Lỗi không xác định khi commit dữ liệu.';
      if (userMsg.includes('Failed to fetch') || userMsg.includes('NETWORK_ERROR') || userMsg.includes('NetworkError')) {
        userMsg = 'Không thể kết nối máy chủ hoặc Google Apps Script (NETWORK_ERROR). Vui lòng kiểm tra đường truyền internet hoặc cài đặt URL Web App.';
      } else if (userMsg.includes('API_TIMEOUT') || userMsg.includes('timeout')) {
        userMsg = 'Thời gian phản hồi từ Google Apps Script quá lâu (API_TIMEOUT). Vui lòng thử bấm lưu lại.';
      } else if (userMsg.includes('DUPLICATE_IMPORT')) {
        userMsg = 'Giao dịch nhập câu hỏi này đã được xử lý trước đó (DUPLICATE_IMPORT).';
      } else if (userMsg.includes('Chưa cấu hình Google Apps Script API URL')) {
        userMsg = '⚠️ Chưa cấu hình Google Apps Script API URL. Vui lòng thiết lập URL Web App trong phần Cài đặt.';
      }
      setSaveErrorMessage(userMsg);
    }
  };

  // Complete and invoke callbacks
  const handleFinishAndUse = () => {
    if (!saveSummary) {
      onClose();
      return;
    }

    soundService.playClick();
    if (onImportLessonSuccess) {
      onImportLessonSuccess(saveSummary.lesson, saveSummary.savedQuestions);
    }
    onImportSuccess(saveSummary.savedQuestions);
    onClose();
  };

  // Download Templates
  const handleDownloadCsvTemplate = () => {
    soundService.playClick();
    const csvStr = generateQuestionCsvTemplate();
    downloadFile(csvStr, 'eduplay_mau_cau_hoi.csv', 'text/csv;charset=utf-8;');
  };

  const handleDownloadExcelTemplate = () => {
    soundService.playClick();
    const excelBytes = generateQuestionExcelTemplate();
    downloadFile(excelBytes, 'eduplay_mau_cau_hoi.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Upload className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Nhập & Lưu Ngân Hàng Câu Hỏi
                </h2>
                {importStage === 'FILE_PARSED' && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    TỆP ĐÃ ĐỌC • CHỜ LƯU
                  </span>
                )}
                {importStage === 'DATA_SAVED' && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    ĐÃ COMMIT XÁC NHẬN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Pipeline chuẩn hóa: Đọc tệp → Preview kiểm tra → Khai báo thông tin → Lưu bền vững vào Repository
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Template buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 pl-2 pr-1 flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Mẫu:
              </span>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
                title="Tải tệp mẫu định dạng CSV tiếng Việt"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-lg transition-all cursor-pointer"
                title="Tải tệp mẫu định dạng Excel (.xlsx)"
              >
                Excel (.xlsx)
              </button>
            </div>

            {/* View History Button */}
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                setHistoryList(getImportHistory());
                setShowHistory(!showHistory);
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
              title="Xem lịch sử các lần nhập tệp"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* History Drawer */}
          {showHistory && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-cyan-400 flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  Lịch sử nhập tệp gần đây
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-xs text-slate-500 hover:text-white cursor-pointer"
                >
                  Đóng
                </button>
              </div>
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Chưa có lịch sử nhập tệp nào.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
                  {historyList.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-300 font-bold">{h.fileName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                          {h.fileType}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">
                          {new Date(h.importedAt).toLocaleDateString('vi-VN')} {new Date(h.importedAt).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-right font-medium">
                        <span className="text-emerald-400">+{h.importedRows} câu</span>
                        {h.errorRows > 0 && <span className="text-rose-400">{h.errorRows} lỗi</span>}
                        {h.skippedRows > 0 && <span className="text-amber-400">{h.skippedRows} bỏ qua</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* STAGE A: DATA_SAVED CONFIRMATION SCREEN (Requirement 17 & 18) */}
          {/* ======================================================= */}
          {importStage === 'DATA_SAVED' && saveSummary && (
            <div
              className={`border rounded-3xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 ${
                saveSummary.partial
                  ? 'bg-slate-950 border-amber-500/60 shadow-xl shadow-amber-950/20'
                  : 'bg-slate-950 border-emerald-500/50 shadow-xl shadow-emerald-950/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-xl shrink-0 ${
                      saveSummary.partial
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    }`}
                  >
                    {saveSummary.partial ? (
                      <AlertCircle className="w-8 h-8 stroke-[2.5]" />
                    ) : (
                      <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white flex flex-wrap items-center gap-2">
                      {saveSummary.partial ? (
                        <>
                          <span className="text-amber-400">⚠️ ĐÃ LƯU MỘT PHẦN</span>
                          <span className="text-xs bg-amber-950 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold">
                            {saveSummary.totalRows} câu: {saveSummary.createdCount + saveSummary.updatedCount} thành công, {saveSummary.failedCount} lỗi
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-400">🎉 LƯU THÀNH CÔNG</span>
                          <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                            Đã lưu bền vững vào hệ thống
                          </span>
                        </>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {saveSummary.partial
                        ? 'Một số dòng câu hỏi bị lỗi hoặc thiếu dữ liệu. Các câu hợp lệ đã được lưu an toàn vào Google Sheet / Database.'
                        : 'Bộ câu hỏi đã được lưu thật vào QUESTION_BANKS và QUESTIONS. Dữ liệu sẽ tồn tại lâu dài và sẵn sàng cho các game.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>TẠO BỘ KHÁC</span>
                  </button>
                </div>
              </div>

              {/* Exact Summary Details Breakdown (Requirement 17) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1 sm:col-span-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Tên bộ câu hỏi
                  </div>
                  <div className="text-sm font-black text-cyan-300 truncate" title={saveSummary.bank.name}>
                    {saveSummary.bank.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    Khối {saveSummary.bank.grade} • {saveSummary.bank.subject}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">
                    Tổng số dòng
                  </div>
                  <div className="text-xl font-black text-white mt-1">
                    {saveSummary.totalRows}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase">
                    ✅ Đã lưu
                  </div>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {saveSummary.createdCount}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
                  <div className="text-[11px] font-bold text-cyan-400 uppercase">
                    🔄 Cập nhật
                  </div>
                  <div className="text-xl font-black text-cyan-300 mt-1">
                    {saveSummary.updatedCount}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
                  <div className="text-[11px] font-bold text-amber-400 uppercase">
                    ⏭ Bỏ qua
                  </div>
                  <div className="text-xl font-black text-amber-300 mt-1">
                    {saveSummary.skippedCount}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
                  <div className="text-[11px] font-bold text-rose-400 uppercase">
                    ❌ Lỗi
                  </div>
                  <div className={`text-xl font-black mt-1 ${saveSummary.failedCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {saveSummary.failedCount}
                  </div>
                </div>
              </div>

              {/* Error list toggle for Partial Success (Requirement 18) */}
              {saveSummary.partial && saveSummary.errors && saveSummary.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowErrorsList(!showErrorsList)}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer underline"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>{showErrorsList ? 'ẨN DANH SÁCH LỖI' : 'XEM LỖI CHI TIẾT'} ({saveSummary.errors.length})</span>
                    </button>
                    <span className="text-[11px] text-slate-500">
                      Các câu lỗi không được lưu vào cơ sở dữ liệu
                    </span>
                  </div>

                  {showErrorsList && (
                    <div className="max-h-48 overflow-y-auto bg-rose-950/30 border border-rose-500/30 rounded-2xl p-3 space-y-1.5 text-xs text-rose-200 animate-in fade-in">
                      {saveSummary.errors.map((err, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-rose-400 font-mono">•</span>
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons based on Partial vs Full (Requirement 17 & 18) */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {saveSummary.partial && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowErrorsList(!showErrorsList)}
                      className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/40 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>XEM LỖI</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveQuestionBank}
                      className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/20 cursor-pointer transition-all flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>THỬ LƯU LẠI</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleFinishAndUse}
                  className="px-7 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-emerald-500/20 cursor-pointer transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>XEM BỘ CÂU HỎI</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner if any */}
          {saveErrorMessage && (
            <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                  LỖI PERSISTENCE COMMIT
                </h4>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  {saveErrorMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSaveErrorMessage(null)}
                className="text-rose-400 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* UPLOAD AREA (When no file or idle) */}
          {!file && importStage !== 'DATA_SAVED' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/20 scale-[0.99]'
                  : 'border-slate-700/80 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-950/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processUploadedFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-1">
                <Upload className="w-8 h-8 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  KÉO & THẢ TỆP VÀO ĐÂY HOẶC <span className="text-cyan-400 underline decoration-2">BẤM ĐỂ CHỌN TỆP</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1.5">
                  Định dạng hỗ trợ: <strong className="text-slate-300">CSV (UTF-8)</strong>,{' '}
                  <strong className="text-slate-300">Excel (.xlsx)</strong>,{' '}
                  <strong className="text-slate-300">Excel (.xls)</strong>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Không tự động lưu ngay khi chọn tệp. Hệ thống sẽ cho phép xem trước, kiểm tra lỗi và nhập tên bộ câu hỏi.
                </p>
              </div>
            </div>
          )}

          {/* FILE INFO & SHEET SWITCHER */}
          {file && importStage !== 'DATA_SAVED' && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  {fileInfo?.type.includes('CSV') ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{fileInfo?.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-bold">
                      {fileInfo?.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Kích thước: {fileInfo?.size} • Tổng số dòng: <strong className="text-white">{rawRows.length}</strong>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Excel Sheet selector if multiple */}
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1">
                    <span className="text-xs text-slate-400 font-bold">Sheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="bg-transparent text-xs text-cyan-300 font-bold focus:outline-none cursor-pointer"
                    >
                      {sheetNames.map((name) => (
                        <option key={name} value={name} className="bg-slate-900 text-white">
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Toggle Column Mapping */}
                <button
                  type="button"
                  onClick={() => setShowMappingConfig(!showMappingConfig)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    showMappingConfig
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Cấu hình cột</span>
                </button>

                {/* Clear / Replace File */}
                <button
                  type="button"
                  onClick={handleResetFile}
                  className="p-2 text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 rounded-xl transition-all cursor-pointer"
                  title="Xóa tệp và chọn tệp khác"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SAVE FORM: REQUIRED METADATA BEFORE SAVING (Requirement M) */}
          {/* ============================================================ */}
          {file && importStage !== 'DATA_SAVED' && (
            <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Save className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black uppercase text-cyan-300 tracking-wider">
                    THÔNG TIN BỘ CÂU HỎI (BẮT BUỘC TRƯỚC KHI LƯU)
                  </h3>
                </div>
                <span className="text-[11px] text-cyan-400 font-bold">
                  Sẽ được lưu vào Kho câu hỏi & đồng bộ sẵn cho mọi Game
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                {/* 1. Tên bộ câu hỏi (Required) */}
                <div className="sm:col-span-5">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    1. Tên Bộ Câu Hỏi / Bài Học: <span className="text-rose-400 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      setNameTouched(true);
                    }}
                    onBlur={() => setNameTouched(true)}
                    placeholder="VD: Bài 1: Khám phá máy tính..."
                    className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs text-cyan-300 font-black focus:outline-none transition-all ${
                      nameTouched && !isNameValid
                        ? 'border-rose-500 focus:border-rose-400 bg-rose-950/20'
                        : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {nameTouched && !isNameValid && (
                    <p className="text-[10px] text-rose-400 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Tên bộ câu hỏi là bắt buộc, không được để trống.
                    </p>
                  )}
                </div>

                {/* 2. Khối lớp */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    2. Khối Lớp: <span className="text-rose-400 font-black">*</span>
                  </label>
                  <select
                    value={bankGrade}
                    onChange={(e) => setBankGrade(Number(e.target.value) as GradeLevel)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-black focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    {([1, 2, 3, 4, 5, 6, 7, 8, 9] as GradeLevel[]).map((g) => (
                      <option key={g} value={g} className="bg-slate-900 text-white">
                        Khối {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Môn học */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    3. Môn Học: <span className="text-rose-400 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankSubject}
                    onChange={(e) => setBankSubject(e.target.value)}
                    placeholder="VD: Tin học, Toán..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* 4. Chủ đề / Topic (Optional) */}
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    4. Chủ Đề (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={bankTopic}
                    onChange={(e) => setBankTopic(e.target.value)}
                    placeholder="VD: Chủ đề A: Máy tính & Em"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
                  />
                </div>

                {/* 5. Mô tả / Description (Optional) */}
                <div className="sm:col-span-12">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    5. Mô Tả (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={bankDescription}
                    onChange={(e) => setBankDescription(e.target.value)}
                    placeholder="VD: Bộ câu hỏi ôn tập giữa kỳ theo chương trình mới..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* COLUMN MAPPING ACCORDION */}
          {file && showMappingConfig && importStage !== 'DATA_SAVED' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Settings className="w-4 h-4" />
                  Khớp Cột Dữ Liệu (Column Mapping)
                </h4>
                <span className="text-[11px] text-slate-400">
                  Hệ thống đã tự động nhận diện. Thầy/cô có thể tùy chỉnh nếu cần.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                {[
                  { key: 'question', label: 'Nội dung câu hỏi (*)', required: true },
                  { key: 'optionA', label: 'Phương án A (*)', required: true },
                  { key: 'optionB', label: 'Phương án B (*)', required: true },
                  { key: 'optionC', label: 'Phương án C' },
                  { key: 'optionD', label: 'Phương án D' },
                  { key: 'correctAnswer', label: 'Đáp án đúng (*)', required: true },
                  { key: 'explanation', label: 'Giải thích' },
                  { key: 'topic', label: 'Chủ đề / Bài' },
                  { key: 'subject', label: 'Môn học' },
                  { key: 'grade', label: 'Khối lớp' },
                  { key: 'normalPoints', label: 'Điểm câu hỏi' },
                  { key: 'stealPoints', label: 'Điểm cướp' },
                  { key: 'isSpecial', label: 'Câu đặc biệt (x2)' },
                  { key: 'difficulty', label: 'Độ khó' },
                ].map((item) => (
                  <div key={item.key} className="space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      {item.label} {item.required && <span className="text-rose-400">*</span>}
                    </label>
                    <select
                      value={columnMapping[item.key as keyof ColumnMapping] || ''}
                      onChange={(e) => {
                        setColumnMapping({
                          ...columnMapping,
                          [item.key]: e.target.value,
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">-- Bỏ qua / Mặc định --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: PREVIEW & STATS TABLE (Stage: FILE_PARSED)       */}
          {/* ======================================================== */}
          {file && importStage !== 'DATA_SAVED' && (
            <div className="space-y-4">
              {/* Toolbar & Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                {/* Stats Chips */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="px-3 py-1 bg-slate-900 text-slate-300 rounded-xl border border-slate-800">
                    Tổng dòng: <strong>{stats.total}</strong>
                  </span>
                  <span className="px-3 py-1 bg-emerald-950/60 text-emerald-300 rounded-xl border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Hợp lệ: <strong>{stats.valid}</strong>
                  </span>
                  {stats.warning > 0 && (
                    <span className="px-3 py-1 bg-amber-950/60 text-amber-300 rounded-xl border border-amber-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Cảnh báo: <strong>{stats.warning}</strong>
                    </span>
                  )}
                  {stats.error > 0 && (
                    <span className="px-3 py-1 bg-rose-950/60 text-rose-300 rounded-xl border border-rose-500/30 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Lỗi: <strong>{stats.error}</strong>
                    </span>
                  )}
                  {stats.duplicates > 0 && (
                    <span className="px-3 py-1 bg-purple-950/60 text-purple-300 rounded-xl border border-purple-500/30">
                      Trùng lặp: <strong>{stats.duplicates}</strong>
                    </span>
                  )}
                </div>

                {/* Filter view & mode */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterView('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        filterView === 'ALL' ? 'bg-cyan-600 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tất cả ({stats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterView('VALID_ONLY')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        filterView === 'VALID_ONLY' ? 'bg-emerald-600 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hợp lệ ({stats.valid + stats.warning})
                    </button>
                    {stats.error > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterView('ERROR_ONLY')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          filterView === 'ERROR_ONLY' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Chỉ dòng lỗi ({stats.error})
                      </button>
                    )}
                  </div>

                  {/* Duplicate Strategy */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                    <span>Xử lý trùng:</span>
                    <select
                      value={importMode}
                      onChange={(e) => setImportMode(e.target.value as QuestionImportMode)}
                      className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs rounded-xl px-2 py-1 focus:outline-none"
                    >
                      <option value="APPEND">Bỏ qua câu trùng</option>
                      <option value="UPDATE_DUPLICATE">Cập nhật nội dung câu trùng</option>
                      <option value="REPLACE_ALL">Ghi đè toàn bộ</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400 z-10">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-1/3">Nội dung câu hỏi</th>
                      <th className="p-3">Phương án lựa chọn (A, B, C, D)</th>
                      <th className="p-3 w-16 text-center">Đáp án</th>
                      <th className="p-3 w-16 text-center">Điểm</th>
                      <th className="p-3 w-28 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                          Không có dòng nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row) => {
                        const q = row.parsedQuestion;
                        return (
                          <tr
                            key={row.rowNumber}
                            className={`transition-colors hover:bg-slate-900/40 ${
                              row.status === 'ERROR'
                                ? 'bg-rose-950/10'
                                : row.status === 'WARNING'
                                ? 'bg-amber-950/10'
                                : ''
                            }`}
                          >
                            <td className="p-3 text-center font-mono text-slate-500 font-bold">
                              {row.rowNumber}
                            </td>

                            <td className="p-3 font-medium text-slate-200">
                              <p className="line-clamp-2 leading-relaxed">
                                {q?.question || <span className="text-rose-400 italic font-normal">Thiếu nội dung câu hỏi</span>}
                              </p>
                              {q?.explanation && (
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">
                                  💡 {q.explanation}
                                </p>
                              )}
                            </td>

                            <td className="p-3">
                              {q?.options ? (
                                <div className="grid grid-cols-2 gap-1 text-[11px]">
                                  {q.options.map((opt, optIdx) => (
                                    <div
                                      key={optIdx}
                                      className={`px-1.5 py-0.5 rounded truncate ${
                                        optIdx === q.correctAnswer
                                          ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/30'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      <strong>{String.fromCharCode(65 + optIdx)}:</strong> {opt || '-'}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {q ? (
                                <span className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40 inline-flex items-center justify-center font-black">
                                  {String.fromCharCode(65 + q.correctAnswer)}
                                </span>
                              ) : (
                                <span className="text-rose-400 font-bold">?</span>
                              )}
                            </td>

                            <td className="p-3 text-center font-mono font-bold text-cyan-300">
                              {q?.normalPoints ?? 10}đ
                            </td>

                            <td className="p-3 text-center">
                              {row.status === 'VALID' && (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px] bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Hợp lệ
                                </span>
                              )}
                              {row.status === 'WARNING' && (
                                <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[10px] bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="w-3 h-3" />
                                  {row.statusText}
                                </span>
                              )}
                              {row.status === 'ERROR' && (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[10px] bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                    <AlertCircle className="w-3 h-3" />
                                    Lỗi định dạng
                                  </span>
                                  {row.errorMessages.map((e, eIdx) => (
                                    <p key={eIdx} className="text-[10px] text-rose-400/90 leading-tight">
                                      {e}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* FOOTER ACTIONS (Requirement L: 💾 LƯU BỘ CÂU HỎI & HỦY) */}
        {/* ======================================================== */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {importStage === 'DATA_SAVED' ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Dữ liệu đã được lưu thành công vào Repository!
              </span>
            ) : file ? (
              <span>
                Sẵn sàng lưu{' '}
                <strong className="text-emerald-400 font-bold">
                  {rowsToSave.length}
                </strong>{' '}
                câu hỏi hợp lệ vào ngân hàng{' '}
                <strong className="text-cyan-300 font-bold">
                  "{bankName.trim() || 'Chưa đặt tên'}"
                </strong>
              </span>
            ) : (
              <span>Vui lòng chọn tệp CSV hoặc Excel để bắt đầu</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* HỦY Button */}
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
            >
              HỦY
            </button>

            {/* 💾 LƯU BỘ CÂU HỎI Button (Requirement L) */}
            {importStage !== 'DATA_SAVED' ? (
              <button
                type="button"
                disabled={!canSave}
                onClick={handleSaveQuestionBank}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 cursor-pointer transition-all flex items-center gap-2"
              >
                {importStage === 'SAVING' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>⏳ ĐANG LƯU...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 stroke-[2.5]" />
                    <span>💾 LƯU BỘ CÂU HỎI</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishAndUse}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>HOÀN TẤT & ĐÓNG</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
