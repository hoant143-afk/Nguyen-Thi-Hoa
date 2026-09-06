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
  Users,
  Palette,
  RefreshCw,
  Trash2,
} from 'lucide-react';
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
    teams: { name: string; color: string; badge?: string }[]
  ) => void;
}

export const TeamImportModal: React.FC<TeamImportModalProps> = ({
  isOpen,
  onClose,
  onApplyTeams,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedTeams, setParsedTeams] = useState<TeamImportItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleResetFile = () => {
    setFile(null);
    setFileInfo(null);
    setParsedTeams([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processUploadedFile = async (selectedFile: File) => {
    try {
      setIsProcessing(true);
      soundService.playClick();
      setFile(selectedFile);

      const isCsv = selectedFile.name.toLowerCase().endsWith('.csv');
      const isXlsx = selectedFile.name.toLowerCase().endsWith('.xlsx');
      const isXls = selectedFile.name.toLowerCase().endsWith('.xls');

      if (!isCsv && !isXlsx && !isXls) {
        alert('Vui lòng chọn tệp .csv, .xlsx hoặc .xls');
        setIsProcessing(false);
        return;
      }

      setFileInfo({
        name: selectedFile.name,
        size: formatFileSize(selectedFile.size),
        type: isCsv ? 'CSV' : isXlsx ? 'Excel (.xlsx)' : 'Excel (.xls)',
      });

      let rawRows: Record<string, any>[] = [];

      if (isCsv) {
        const text = await selectedFile.text();
        const parsed = parseCsv(text);
        rawRows = parsed.rows;
      } else {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const wbInfo = readExcelWorkbook(arrayBuffer);
        if (wbInfo.sheetNames.length > 0) {
          const sheetData = extractSheetData(wbInfo.workbook, wbInfo.sheetNames[0]);
          rawRows = sheetData.rows;
        }
      }

      const teams = parseTeamRows(rawRows);
      if (teams.length === 0) {
        alert('Không tìm thấy danh sách đội trong tệp.');
        handleResetFile();
        return;
      }

      setParsedTeams(teams);
    } catch (err: any) {
      console.error('Lỗi khi đọc file đội:', err);
      alert(`Không thể đọc tệp: ${err.message || 'Tệp bị lỗi'}`);
      handleResetFile();
    } finally {
      setIsProcessing(false);
    }
  };

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
      alert('Vui lòng chọn từ 2 đến 4 đội để thi đấu.');
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
        badge: t.badge,
      }))
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Nhập Đội Thi Đấu Từ CSV / Excel</span>
              </h2>
              <p className="text-xs text-slate-400">
                Cấu trúc: <code className="text-amber-300">teamName</code>,{' '}
                <code className="text-amber-300">teamColor</code> (Chọn từ 2 đến 4 đội)
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
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-amber-400 bg-amber-950/20 scale-[0.99]'
                  : 'border-slate-700/80 bg-slate-950/60 hover:border-amber-500/50 hover:bg-slate-950/80'
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
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1">
                <Upload className="w-7 h-7 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  KÉO & THẢ TỆP VÀO ĐÂY HOẶC <span className="text-amber-400 underline decoration-2">BẤM ĐỂ CHỌN TỆP</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Hỗ trợ .CSV, .XLSX, .XLS</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ví dụ: <code>Sao Xanh,#2563EB</code> | <code>Tia Chớp,#F97316</code>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">{fileInfo?.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">({fileInfo?.size})</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetFile}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Chọn tệp khác</span>
                </button>
              </div>

              {/* Warning if > 4 teams */}
              {parsedTeams.length > 4 && (
                <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-2xl text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <p className="font-bold">File có {parsedTeams.length} đội (Hệ thống EDUPLAY hỗ trợ tối đa 4 đội).</p>
                    <p className="text-[11px] text-amber-300/80 mt-0.5">
                      Vui lòng tick chọn từ <strong>2 đến 4 đội</strong> ở danh sách bên dưới mà thầy/cô muốn sử dụng cho trận đấu.
                    </p>
                  </div>
                </div>
              )}

              {/* Teams Selection List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase">
                    Danh sách đội nhận diện ({selectedCount}/4 đã chọn)
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      isSelectionValid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isSelectionValid ? '✓ Số lượng đội hợp lệ (2-4 đội)' : '⚠️ Cần chọn 2, 3 hoặc 4 đội'}
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parsedTeams.map((team, idx) => (
                    <div
                      key={team.id}
                      onClick={() => handleToggleSelectTeam(team.id)}
                      style={{ borderColor: team.selected ? `${team.teamColor}aa` : undefined }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        team.selected
                          ? 'bg-slate-950/90 border-2'
                          : 'bg-slate-950/40 border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={team.selected}
                          onChange={() => {}}
                          className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                        />
                        <span
                          style={{ backgroundColor: team.teamColor }}
                          className="w-5 h-5 rounded-full inline-block shadow-sm"
                        />
                        <div>
                          <p className="text-xs font-black uppercase text-white tracking-wide">
                            {team.teamName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Màu: {team.teamColor}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-lg">{team.badge}</span>
                        {team.error && (
                          <span className="text-[10px] text-amber-400 max-w-xs truncate" title={team.error}>
                            ⚠️ {team.error}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400">
            {selectedCount >= 2 && selectedCount <= 4
              ? `Đã chọn ${selectedCount} đội thi đấu`
              : 'Chọn tối thiểu 2 đội, tối đa 4 đội'}
          </span>

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
              disabled={!isSelectionValid}
              onClick={handleApply}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              <span>ÁP DỤNG ({selectedCount} ĐỘI)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
