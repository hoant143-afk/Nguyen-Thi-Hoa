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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Question } from '../../types';
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
import { EduplayStorage } from '../../services/eduplayStorage';
import { QuestionsRepository } from '../../repositories/questionsRepository';
import { apiClient } from '../../services/apiClient';

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newQuestions: Question[]) => void;
  currentQuestions: Question[];
}

export const QuestionImportModal: React.FC<QuestionImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentQuestions,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Loading indicator
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Reset current upload
  const handleResetFile = () => {
    setFile(null);
    setFileInfo(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Read file handler
  const processUploadedFile = async (selectedFile: File) => {
    try {
      setIsProcessing(true);
      soundService.playClick();
      setFile(selectedFile);

      const isCsv = selectedFile.name.toLowerCase().endsWith('.csv');
      const isXlsx = selectedFile.name.toLowerCase().endsWith('.xlsx');
      const isXls = selectedFile.name.toLowerCase().endsWith('.xls');

      if (!isCsv && !isXlsx && !isXls) {
        alert('Vui lòng chọn tệp định dạng .csv, .xlsx hoặc .xls');
        setIsProcessing(false);
        return;
      }

      setFileInfo({
        name: selectedFile.name,
        size: formatFileSize(selectedFile.size),
        type: isCsv ? 'CSV' : isXlsx ? 'Excel (.xlsx)' : 'Excel (.xls)',
      });

      if (isCsv) {
        // Parse CSV UTF-8
        const text = await selectedFile.text();
        const parsed = parseCsv(text);
        setRawHeaders(parsed.headers);
        setRawRows(parsed.rows);
        const autoMap = autoDetectColumnMapping(parsed.headers);
        setColumnMapping(autoMap);
      } else {
        // Read Excel
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
    } catch (err: any) {
      console.error('Lỗi khi đọc tệp:', err);
      alert(`Không thể đọc tệp: ${err.message || 'Tệp bị lỗi hoặc không đúng định dạng.'}`);
      handleResetFile();
    } finally {
      setIsProcessing(false);
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

  // Execute Import
  const handleConfirmImport = async () => {
    // Filter rows that can be imported
    const rowsToImport = validatedRows.filter((r) => {
      if (r.status === 'ERROR' || !r.parsedQuestion) return false;
      if (r.isDuplicate && importMode === 'APPEND') return false; // skip duplicates in append mode
      return true;
    });

    if (rowsToImport.length === 0) {
      alert('Không có câu hỏi hợp lệ nào để nhập.');
      return;
    }

    soundService.playClick();
    setIsProcessing(true);

    try {
      let finalQuestionsList: Question[] = [];

      const toQuestion = (pq: NonNullable<ValidatedQuestionRow['parsedQuestion']>, fallbackId: number): Question => ({
        id: pq.id || fallbackId,
        question: pq.question,
        options: [...pq.options],
        correctAnswer: pq.correctAnswer,
        category: pq.category || 'Tin học 5',
        explanation: pq.explanation || '',
        subject: pq.subject,
        grade: pq.grade,
        topic: pq.topic,
        questionType: pq.questionType,
        difficulty: pq.difficulty || 'MEDIUM',
        normalPoints: pq.normalPoints ?? 10,
        stealPoints: pq.stealPoints ?? 5,
        specialPoints: pq.specialPoints ?? 20,
        isSpecial: pq.isSpecial ?? false,
        enabled: pq.enabled ?? true,
      });

      if (importMode === 'REPLACE_ALL') {
        finalQuestionsList = rowsToImport.map((r, idx) => toQuestion(r.parsedQuestion!, idx + 1));
      } else if (importMode === 'UPDATE_DUPLICATE') {
        const workingMap = new Map<string, Question>();
        // Add existing questions
        currentQuestions.forEach((q) => {
          workingMap.set(q.question.trim().toLowerCase(), q);
        });

        // Upsert new/updated questions
        rowsToImport.forEach((r, idx) => {
          const qObj = r.parsedQuestion!;
          const key = qObj.question.trim().toLowerCase();
          const existing = workingMap.get(key);
          if (existing) {
            workingMap.set(key, {
              ...existing,
              ...toQuestion(qObj, existing.id),
              id: existing.id,
            });
          } else {
            workingMap.set(key, toQuestion(qObj, Date.now() + idx));
          }
        });
        finalQuestionsList = Array.from(workingMap.values());
      } else {
        // APPEND MODE: only add valid non-duplicate questions
        const newItems: Question[] = rowsToImport.map((r, idx) =>
          toQuestion(r.parsedQuestion!, Date.now() + idx)
        );
        finalQuestionsList = [...currentQuestions, ...newItems];
      }

      // Save locally to EduplayStorage
      EduplayStorage.saveQuestions(finalQuestionsList);

      // If in cloud mode, sync questions to cloud bank
      if (apiClient.getMode() === 'cloud') {
        try {
          for (const r of rowsToImport) {
            if (r.parsedQuestion) {
              const qConverted = toQuestion(r.parsedQuestion, Date.now());
              await QuestionsRepository.createQuestion('bank_imported', qConverted);
            }
          }
        } catch (cloudErr) {
          console.warn('Lỗi khi đồng bộ cloud:', cloudErr);
        }
      }

      // Log import history
      logImportHistory({
        fileName: fileInfo?.name || 'unknown_file',
        fileType: (fileInfo?.type?.includes('CSV') ? 'CSV' : 'XLSX') as any,
        target: 'QUESTIONS',
        importedRows: rowsToImport.length,
        skippedRows: stats.duplicates && importMode === 'APPEND' ? stats.duplicates : 0,
        errorRows: stats.error,
      });

      onImportSuccess(finalQuestionsList);
      onClose();
    } catch (err: any) {
      console.error('Lỗi lưu câu hỏi:', err);
      alert(`Đã xảy ra lỗi khi lưu: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
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
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Nhập Câu Hỏi Từ CSV / Excel</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                  .CSV • .XLSX • .XLS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Hỗ trợ tiếng Việt có dấu, tự nhận diện tiêu đề cột, preview & kiểm tra lỗi trước khi lưu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Template dropdown/buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 pl-2 pr-1 flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Mẫu:
              </span>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
                title="Tải tệp mẫu định dạng CSV tiếng Việt có BOM"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-lg transition-all cursor-pointer"
                title="Tải tệp mẫu định dạng Excel (.xlsx) 3 câu mẫu Tin học 5"
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

            {/* Close Modal Button */}
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
          {/* History Sub-drawer */}
          {showHistory && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-cyan-400 flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  Lịch sử nhập tệp gần đây
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-xs text-slate-500 hover:text-white"
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

          {/* STEP 1: UPLOAD AREA / FILE INFO */}
          {!file ? (
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
                  💡 Không yêu cầu thứ tự cột chuẩn. Hệ thống tự động nhận diện tiêu đề bằng tiếng Việt & tiếng Anh.
                </p>
              </div>
            </div>
          ) : (
            /* FILE INFO BANNER & CONTROLS */
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
                    <span className="text-sm font-bold text-white">{fileInfo?.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-semibold">
                      {fileInfo?.type}
                    </span>
                    <span className="text-xs text-slate-500">{fileInfo?.size}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Đã đọc được <strong className="text-cyan-300">{rawRows.length} dòng</strong> dữ liệu
                  </p>
                </div>
              </div>

              {/* Multi-sheet Selector (if Excel) */}
              <div className="flex items-center gap-2">
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-300">Sheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="bg-transparent text-xs font-bold text-cyan-400 focus:outline-none cursor-pointer"
                    >
                      {sheetNames.map((s) => (
                        <option key={s} value={s} className="bg-slate-900 text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Re-map button */}
                <button
                  type="button"
                  onClick={() => setShowMappingConfig(!showMappingConfig)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    showMappingConfig
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{showMappingConfig ? 'Ẩn cài đặt cột' : 'Tùy chỉnh cột'}</span>
                </button>

                {/* Re-upload button */}
                <button
                  type="button"
                  onClick={handleResetFile}
                  className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Chọn tệp khác</span>
                </button>
              </div>
            </div>
          )}

          {/* COLUMN MAPPING ACCORDION (If user wants to adjust) */}
          {file && showMappingConfig && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Settings className="w-4 h-4" />
                  Khớp Cột Dữ Liệu (Column Mapping)
                </h4>
                <span className="text-[11px] text-slate-400">
                  Hệ thống đã tự động nhận diện. Thầy/cô có thể chọn lại nếu muốn.
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

          {/* IMPORT MODE & STATS BAR */}
          {file && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Mode Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block uppercase">Chế độ nhập dữ liệu:</label>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        setImportMode('APPEND');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        importMode === 'APPEND'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ➕ Thêm Mới
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        setImportMode('UPDATE_DUPLICATE');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        importMode === 'UPDATE_DUPLICATE'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔄 Cập Nhật Nếu Trùng
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        setImportMode('REPLACE_ALL');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        importMode === 'REPLACE_ALL'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⚠️ Thay Thế Toàn Bộ
                    </button>
                  </div>
                </div>

                {/* Filter View Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block uppercase">Bộ lọc xem trước:</label>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterView('ALL')}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                        filterView === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tất cả ({stats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterView('VALID_ONLY')}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                        filterView === 'VALID_ONLY' ? 'bg-emerald-950 text-emerald-300' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hợp lệ ({stats.valid + stats.warning})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterView('ERROR_ONLY')}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                        filterView === 'ERROR_ONLY' ? 'bg-rose-950 text-rose-300' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Lỗi ({stats.error})
                    </button>
                  </div>
                </div>
              </div>

              {/* Statistics Pill Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-[11px] text-slate-400">Tổng số dòng đọc được</p>
                  <p className="text-lg font-black text-white">{stats.total}</p>
                </div>
                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30">
                  <p className="text-[11px] text-emerald-400">✅ Hợp lệ sẵn sàng nhập</p>
                  <p className="text-lg font-black text-emerald-300">{stats.valid}</p>
                </div>
                <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-500/30">
                  <p className="text-[11px] text-amber-400">⚠️ Trùng câu hỏi</p>
                  <p className="text-lg font-black text-amber-300">
                    {stats.duplicates} {importMode === 'UPDATE_DUPLICATE' ? '(Sẽ cập nhật)' : importMode === 'APPEND' ? '(Bỏ qua)' : ''}
                  </p>
                </div>
                <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-500/30">
                  <p className="text-[11px] text-rose-400">❌ Sai định dạng / Lỗi</p>
                  <p className="text-lg font-black text-rose-300">{stats.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW TABLE */}
          {file && (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Bảng Xem Trước Dữ Liệu ({displayedRows.length} dòng hiển thị)</span>
              </h4>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/80 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900/90 text-slate-300 font-bold uppercase sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="p-3 w-12 text-center">STT</th>
                      <th className="p-3 w-2/5">Câu hỏi & Chủ đề</th>
                      <th className="p-3">Các lựa chọn</th>
                      <th className="p-3 w-24 text-center">Đáp án</th>
                      <th className="p-3 w-20 text-center">Điểm</th>
                      <th className="p-3 w-36 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          Không có dòng nào phù hợp với bộ lọc hiển thị.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row) => {
                        const q = row.parsedQuestion;
                        return (
                          <tr
                            key={row.rowNumber}
                            className={`hover:bg-slate-900/60 transition-colors ${
                              row.status === 'ERROR'
                                ? 'bg-rose-950/20'
                                : row.status === 'WARNING'
                                ? 'bg-amber-950/20'
                                : ''
                            }`}
                          >
                            <td className="p-3 font-mono text-center text-slate-400 font-bold">
                              {row.rowNumber}
                            </td>

                            <td className="p-3 space-y-1">
                              <p className="font-semibold text-white leading-snug">
                                {q?.question || <span className="text-rose-400 italic">Trống nội dung</span>}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                {q?.category && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {q.category}
                                  </span>
                                )}
                                {q?.isSpecial && (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 font-bold">
                                    ★ Đặc biệt
                                  </span>
                                )}
                                {q?.explanation && (
                                  <span className="text-slate-400 italic truncate max-w-xs" title={q.explanation}>
                                    💡 {q.explanation}
                                  </span>
                                )}
                              </div>
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
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[10px] bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                    <AlertTriangle className="w-3 h-3" />
                                    {row.statusText}
                                  </span>
                                </div>
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

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {file ? (
              <span>
                Sẽ nhập{' '}
                <strong className="text-emerald-400 font-bold">
                  {validatedRows.filter((r) => r.status !== 'ERROR' && (importMode !== 'APPEND' || !r.isDuplicate)).length}
                </strong>{' '}
                câu hỏi hợp lệ vào Ngân hàng câu hỏi
              </span>
            ) : (
              <span>Vui lòng kéo hoặc chọn tệp để bắt đầu</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
            >
              HỦY
            </button>

            <button
              type="button"
              disabled={!file || stats.valid + (importMode === 'UPDATE_DUPLICATE' ? stats.warning : 0) === 0 || isProcessing}
              onClick={handleConfirmImport}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 cursor-pointer transition-all flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>NHẬP CÁC DÒNG HỢP LỆ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
