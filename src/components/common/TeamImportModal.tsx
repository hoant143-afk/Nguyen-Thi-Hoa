import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Users,
  Layers,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseCsv } from '../../services/importer/csvParser';
import { extractSheetData, readExcelWorkbook } from '../../services/importer/excelParser';
import {
  downloadFile,
  logImportHistory,
} from '../../services/importer/questionImporter';
import {
  generateTeamCsvTemplate,
  generateTeamExcelTemplate,
  parseTeamRows,
} from '../../services/importer/teamImporter';
import { TeamImportItem } from '../../services/importer/types';
import { soundService } from '../../services/soundService';

interface TeamImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTeams: (
    teams: { name: string; color: string; markerColor?: string; badge?: string }[]
  ) => void;
  initialFile?: File | null;
}

export const TeamImportModal: React.FC<TeamImportModalProps> = ({
  isOpen,
  onClose,
  onApplyTeams,
  initialFile = null,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: string;
    type: string;
    rowsCount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedTeams, setParsedTeams] = useState<TeamImportItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Multi-sheet Excel state
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');

  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleResetFile = () => {
    setFile(null);
    setFileInfo(null);
    setParsedTeams([]);
    setErrorMessage(null);
    setWorkbook(null);
    setAvailableSheets([]);
    setActiveSheet('');
    if (modalFileInputRef.current) modalFileInputRef.current.value = '';
  };

  const processUploadedFile = async (selectedFile: File) => {
    if (!selectedFile) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setFile(selectedFile);

      const ext = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase();
      const isCsv = ext === '.csv';
      const isXlsx = ext === '.xlsx';
      const isXls = ext === '.xls';

      if (!isCsv && !isXlsx && !isXls) {
        throw new Error('❌ Định dạng file không được hỗ trợ. Vui lòng chọn tệp .csv, .xlsx hoặc .xls');
      }

      let rawRows: Record<string, any>[] = [];
      const typeStr = isCsv ? 'CSV' : isXlsx ? 'Excel (.xlsx)' : 'Excel (.xls)';

      if (isCsv) {
        let text = '';
        try {
          text = await selectedFile.text();
        } catch (err: any) {
          throw new Error('❌ Không thể đọc file.');
        }

        const parsed = parseCsv(text);
        rawRows = parsed.rows;
        setWorkbook(null);
        setAvailableSheets([]);
        setActiveSheet('');
      } else {
        // Read Excel
        let arrayBuffer: ArrayBuffer;
        try {
          arrayBuffer = await selectedFile.arrayBuffer();
        } catch (err: any) {
          throw new Error('❌ Không thể đọc file.');
        }

        let wbInfo: { workbook: XLSX.WorkBook; sheetNames: string[] };
        try {
          wbInfo = readExcelWorkbook(arrayBuffer);
        } catch (err: any) {
          throw new Error(`❌ Có lỗi khi đọc Excel: ${err?.message || 'Tệp Excel bị lỗi hoặc không thể phân tích.'}`);
        }

        if (!wbInfo.sheetNames || wbInfo.sheetNames.length === 0) {
          throw new Error('❌ File không có dữ liệu đội.');
        }

        setWorkbook(wbInfo.workbook);
        setAvailableSheets(wbInfo.sheetNames);

        // Auto select first sheet
        const firstSheet = wbInfo.sheetNames[0];
        setActiveSheet(firstSheet);
        const sheetData = extractSheetData(wbInfo.workbook, firstSheet);
        rawRows = sheetData.rows;
      }

      setFileInfo({
        name: selectedFile.name,
        size: formatFileSize(selectedFile.size),
        type: typeStr,
        rowsCount: rawRows.length,
      });

      // Parse and validate team rows
      const teams = parseTeamRows(rawRows);
      setParsedTeams(teams);
      soundService.playCorrect();
    } catch (err: any) {
      const msg = err.message || '❌ Không thể đọc file.';
      setErrorMessage(msg);
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Change active Excel sheet
  const handleSelectSheet = (sheetName: string) => {
    if (!workbook) return;
    try {
      soundService.playClick();
      setActiveSheet(sheetName);
      setErrorMessage(null);

      const sheetData = extractSheetData(workbook, sheetName);
      if (fileInfo) {
        setFileInfo({
          ...fileInfo,
          rowsCount: sheetData.rows.length,
        });
      }

      const teams = parseTeamRows(sheetData.rows);
      setParsedTeams(teams);
    } catch (err: any) {
      const msg = err.message || '❌ Có lỗi khi đọc dữ liệu sheet này.';
      setErrorMessage(msg);
      setParsedTeams([]);
    }
  };

  // Load initial file if passed from outside
  useEffect(() => {
    if (isOpen && initialFile) {
      processUploadedFile(initialFile);
    } else if (!isOpen) {
      handleResetFile();
    }
  }, [isOpen, initialFile]);

  if (!isOpen) return null;

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

  // Toggle selection
  const handleToggleSelectTeam = (id: string) => {
    soundService.playClick();
    setParsedTeams((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      const currentlySelectedCount = prev.filter((t) => t.selected).length;

      // If trying to select more than 4, prevent
      if (!target.selected && currentlySelectedCount >= 4) {
        alert('Hệ thống EDUPLAY hỗ trợ tối đa 4 đội thi đấu (2, 3 hoặc 4 đội).');
        return prev;
      }

      return prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t));
    });
  };

  const selectedTeams = useMemo(() => {
    return parsedTeams.filter((t) => t.selected);
  }, [parsedTeams]);

  const selectedCount = selectedTeams.length;
  const isSelectionValid = selectedCount >= 2 && selectedCount <= 4;

  const handleApply = () => {
    if (!isSelectionValid) {
      alert(
        selectedCount < 2
          ? 'Cần tối thiểu 2 đội để tham gia thi đấu.'
          : 'Hệ thống EDUPLAY hỗ trợ tối đa 4 đội thi đấu (2, 3 hoặc 4 đội).'
      );
      return;
    }
    soundService.playClick();

    // Log history
    logImportHistory({
      fileName: fileInfo?.name || 'teams_file',
      fileType: (fileInfo?.type?.includes('CSV') ? 'CSV' : 'XLSX') as any,
      target: 'TEAMS',
      importedRows: selectedCount,
      skippedRows: parsedTeams.length - selectedCount,
      errorRows: 0,
    });

    onApplyTeams(
      selectedTeams.map((t) => ({
        name: t.teamName,
        color: t.teamColor,
        markerColor: t.markerColor || t.teamColor,
        badge: t.badge,
      }))
    );
    onClose();
  };

  return (
    <div
      id="team-import-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="team-import-modal-card"
        className="bg-slate-900 border border-slate-700/80 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>📥 NHẬP ĐỘI TỪ CSV / EXCEL</span>
              </h2>
              <p className="text-xs text-slate-400">
                Hỗ trợ <code className="text-amber-300">teamName</code>,{' '}
                <code className="text-amber-300">teamColor</code>,{' '}
                <code className="text-amber-300">markerColor</code> (chọn từ 2 đến 4 đội)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Templates */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 pl-2 pr-1 flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Mẫu:
              </span>
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  downloadFile(generateTeamCsvTemplate(), 'eduplay_mau_doi.csv', 'text/csv;charset=utf-8;');
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  downloadFile(generateTeamExcelTemplate(), 'eduplay_mau_doi.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                }}
                className="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-lg cursor-pointer"
              >
                Excel
              </button>
            </div>

            <button
              id="team-import-close-btn"
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-4 bg-rose-950/80 border border-rose-500/60 rounded-2xl text-rose-200 text-xs flex items-start gap-3 shadow-lg">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm text-rose-300">{errorMessage}</p>
                <p className="text-[11px] text-rose-200/80 mt-1">
                  Vui lòng kiểm tra lại cấu trúc tệp hoặc tải tệp mẫu CSV / Excel ở góc trên bên phải để đối chiếu.
                </p>
              </div>
            </div>
          )}

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => modalFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-amber-400 bg-amber-950/20 scale-[0.99]'
                  : 'border-slate-700/80 bg-slate-950/60 hover:border-amber-500/50 hover:bg-slate-950/80'
              }`}
            >
              <input
                ref={modalFileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processUploadedFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1">
                <Upload className="w-7 h-7 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  KÉO & THẢ TỆP VÀO ĐÂY HOẶC <span className="text-amber-400 underline decoration-2">BẤM ĐỂ CHỌN TỆP</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Hỗ trợ .CSV, .XLSX, .XLS</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ví dụ: <code>Đội Tia Chớp,#2563EB,#2563EB</code> | <code>Đội Mặt Trời,#F97316,#F97316</code>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{fileInfo?.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                        {fileInfo?.type}
                      </span>
                      <span className="text-[10px] text-slate-400">({fileInfo?.size})</span>
                    </div>
                    <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                      ✓ Đã đọc {fileInfo?.rowsCount || 0} dòng dữ liệu ({parsedTeams.length} đội hợp lệ)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetFile}
                  className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Chọn tệp khác</span>
                </button>
              </div>

              {/* Multi-sheet Excel Selector */}
              {availableSheets.length > 1 && (
                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 uppercase tracking-wider">
                    <Layers className="w-4 h-4" />
                    <span>CHỌN SHEET CẦN NHẬP:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSheets.map((sheetName) => {
                      const isActive = activeSheet === sheetName;
                      return (
                        <button
                          key={sheetName}
                          type="button"
                          onClick={() => handleSelectSheet(sheetName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-[1.02]'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{sheetName}</span>
                          {isActive && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warning if > 4 teams */}
              {parsedTeams.length > 4 && (
                <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-2xl text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <p className="font-bold">
                      File có {parsedTeams.length} đội. Vui lòng chọn tối đa 4 đội để tham gia.
                    </p>
                    <p className="text-[11px] text-amber-300/80 mt-0.5">
                      EDUPLAY chỉ hỗ trợ <strong>2, 3 hoặc 4 đội</strong>. Thầy/cô vui lòng tick chọn các đội tham gia ở bảng bên dưới.
                    </p>
                  </div>
                </div>
              )}

              {/* Warning if < 2 teams */}
              {parsedTeams.length === 1 && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <p className="font-bold">File chỉ có 1 đội. Cần tối thiểu 2 đội để tham gia thi đấu.</p>
                  </div>
                </div>
              )}

              {/* PREVIEW TABLE (Requirement 6 & 7) */}
              {parsedTeams.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      BẢNG XEM TRƯỚC DANH SÁCH ĐỘI ({selectedCount}/4 đã chọn)
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        isSelectionValid ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isSelectionValid
                        ? `✓ Hợp lệ (${selectedCount} đội)`
                        : selectedCount < 2
                        ? '⚠️ Cần chọn tối thiểu 2 đội'
                        : '⚠️ Không chọn quá 4 đội'}
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-2xl max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-black uppercase text-slate-400 bg-slate-950/80 sticky top-0 z-10">
                          <th className="py-2.5 px-3 w-12 text-center">CHỌN</th>
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-4">TÊN ĐỘI</th>
                          <th className="py-2.5 px-4">MÀU ĐỘI</th>
                          <th className="py-2.5 px-4">MÀU THẺ</th>
                          <th className="py-2.5 px-3 text-center">TRẠNG THÁI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {parsedTeams.map((team, idx) => (
                          <tr
                            key={team.id}
                            onClick={() => handleToggleSelectTeam(team.id)}
                            className={`cursor-pointer transition-colors ${
                              team.selected
                                ? 'bg-amber-500/10'
                                : 'hover:bg-slate-950/40 opacity-60'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={team.selected}
                                onChange={() => {}}
                                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4 font-black text-white uppercase tracking-wide">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{team.badge}</span>
                                <span>{team.teamName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px]">
                              <div className="flex items-center gap-2">
                                <span
                                  style={{ backgroundColor: team.teamColor }}
                                  className="w-4 h-4 rounded-full border border-white/20 inline-block shrink-0 shadow-xs"
                                />
                                <span className="text-slate-300 font-bold">{team.teamColor}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px]">
                              <div className="flex items-center gap-2">
                                <span
                                  style={{ backgroundColor: team.markerColor || team.teamColor }}
                                  className="w-4 h-4 rounded-md border border-white/20 inline-block shrink-0 shadow-xs"
                                />
                                <span className="text-slate-300 font-bold">{team.markerColor || team.teamColor}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {team.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                  ✅ Hợp lệ
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-rose-400 font-bold text-xs bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-500/30"
                                  title={team.error}
                                >
                                  ⚠️ {team.error || 'Lỗi'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons (Requirement 6) */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400 font-medium">
            {selectedCount >= 2 && selectedCount <= 4
              ? `Đã chọn ${selectedCount} đội thi đấu (2-4 đội)`
              : 'Yêu cầu chọn tối thiểu 2 đội, tối đa 4 đội'}
          </span>

          <div className="flex items-center gap-2">
            <button
              id="team-import-cancel-btn"
              type="button"
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>❌ HỦY</span>
            </button>
            <button
              id="team-import-confirm-btn"
              type="button"
              disabled={!isSelectionValid || isProcessing}
              onClick={handleApply}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              <span>✅ XÁC NHẬN NHẬP ({selectedCount} ĐỘI)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
