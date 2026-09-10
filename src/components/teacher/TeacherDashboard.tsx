import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Users,
  HelpCircle,
  History,
  Settings,
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  Upload,
  Save,
  CheckCircle,
  FileText,
  BookOpen,
  Database,
  Cloud,
  RefreshCw,
  Copy,
  ExternalLink,
  Palette,
  Sparkles,
  Trophy,
  Layers,
  ChevronRight,
  Check,
  Search,
  Eye,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  X,
} from 'lucide-react';
import { Classroom, DEFAULT_TEAM_PRESETS, TEAM_COLOR_OPTIONS, TeamPreset } from '../../data/classData';
import { GradeLevel, Question, QuestionBankLesson, Team, TeamCount } from '../../types';
import { EduplayStorage } from '../../services/eduplayStorage';
import { soundService } from '../../services/soundService';
import { apiClient, SyncStatus } from '../../services/apiClient';
import { QuestionImportModal } from '../common/QuestionImportModal';
import { TeamImportModal } from '../common/TeamImportModal';
import { QuestionBankRepository } from '../../repositories/questionBankRepository';
import {
  autoDetectColumnMapping,
  downloadFile,
  generateQuestionCsvTemplate,
  generateQuestionExcelTemplate,
  validateImportRows,
} from '../../services/importer/questionImporter';
import { extractSheetData, readExcelWorkbook } from '../../services/importer/excelParser';
import { parseCsv } from '../../services/importer/csvParser';

interface TeacherDashboardProps {
  onBackToEduplay: () => void;
}

const FAST_PRESET_PACKS = [
  {
    name: '🎨 4 Màu Tiêu Chuẩn',
    desc: 'Đội Xanh, Đội Cam, Đội Xanh Lá, Đội Tím',
    teams: [
      { name: 'ĐỘI XANH', color: '#3b82f6', badge: '🔵' },
      { name: 'ĐỘI CAM', color: '#f97316', badge: '🟠' },
      { name: 'ĐỘI XANH LÁ', color: '#22c55e', badge: '🟢' },
      { name: 'ĐỘI TÍM', color: '#a855f7', badge: '🟣' },
    ],
  },
  {
    name: '🚀 Đội Công Nghệ',
    desc: 'Cyber Bots, Code Masters, AI Explorers, Robo Warriors',
    teams: [
      { name: 'CYBER BOTS', color: '#06b6d4', badge: '🤖' },
      { name: 'CODE MASTERS', color: '#f59e0b', badge: '💻' },
      { name: 'AI EXPLORERS', color: '#8b5cf6', badge: '🚀' },
      { name: 'ROBO WARRIORS', color: '#ec4899', badge: '⚡' },
    ],
  },
  {
    name: '🦁 Linh Thú Rừng Xanh',
    desc: 'Rồng Xanh, Hổ Trắng, Phượng Hoàng, Đại Bàng',
    teams: [
      { name: 'RỒNG XANH', color: '#0ea5e9', badge: '🐉' },
      { name: 'HỔ TRẮNG', color: '#f59e0b', badge: '🐯' },
      { name: 'PHƯỢNG HOÀNG', color: '#ef4444', badge: '🦅' },
      { name: 'ĐẠI BÀNG VÀNG', color: '#10b981', badge: '⚡' },
    ],
  },
  {
    name: '🔥 Tứ Đại Nguyên Tố',
    desc: 'Đội Lửa, Đội Nước, Đội Gió, Đội Đất',
    teams: [
      { name: 'ĐỘI LỬA', color: '#ef4444', badge: '🔥' },
      { name: 'ĐỘI NƯỚC', color: '#0ea5e9', badge: '💧' },
      { name: 'ĐỘI GIÓ', color: '#22c55e', badge: '🍃' },
      { name: 'ĐỘI ĐẤT', color: '#f59e0b', badge: '🌍' },
    ],
  },
];

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onBackToEduplay }) => {
  const [activeTab, setActiveTab] = useState<'TEAMS' | 'QUESTIONS' | 'HISTORY' | 'DATABASE'>('TEAMS');
  const [defaultTeamCount, setDefaultTeamCount] = useState<TeamCount>(() => {
    const saved = EduplayStorage.getGameData<number>('eduplay_default_team_count', 4);
    return (saved === 2 || saved === 3 || saved === 4) ? (saved as TeamCount) : 4;
  });
  const [configuredTeams, setConfiguredTeams] = useState<TeamPreset[]>(() => {
    return EduplayStorage.getGameData('eduplay_team_presets', DEFAULT_TEAM_PRESETS);
  });
  const [teamImportFile, setTeamImportFile] = useState<File | null>(null);
  const teamFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportTeamsClick = () => {
    soundService.playClick();
    if (teamFileInputRef.current) {
      teamFileInputRef.current.value = '';
      teamFileInputRef.current.click();
    }
  };

  const handleTeamFileSelected = (file: File) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      alert('❌ Định dạng file không được hỗ trợ. Vui lòng chọn tệp .csv, .xlsx hoặc .xls');
      return;
    }
    setTeamImportFile(file);
    setShowTeamImportModal(true);
  };

  const [questions, setQuestions] = useState<Question[]>(() => EduplayStorage.getQuestions());
  const [history, setHistory] = useState(() => EduplayStorage.getHistory());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(apiClient.getStatus());
  const [cloudUrlInput, setCloudUrlInput] = useState<string>(apiClient.getApiUrl());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  useEffect(() => {
    const unsub = apiClient.subscribe(setSyncStatus);
    return () => unsub();
  }, []);

  const [newQuestionForm, setNewQuestionForm] = useState<Partial<Question>>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    category: 'Tin học 5',
    explanation: '',
    normalPoints: 10,
    stealPoints: 5,
  });

  const [showAddQuestionModal, setShowAddQuestionModal] = useState<boolean>(false);
  const [showQuestionImportModal, setShowQuestionImportModal] = useState<boolean>(false);
  const [showTeamImportModal, setShowTeamImportModal] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Grade 1-9 & Lesson Hierarchy State
  const [bankLessons, setBankLessons] = useState<QuestionBankLesson[]>(() => QuestionBankRepository.getLessons());
  const [activeGrade, setActiveGrade] = useState<GradeLevel>(5);
  const [activeSubject, setActiveSubject] = useState<string>('Tất cả môn');
  const [searchLessonQuery, setSearchLessonQuery] = useState<string>('');
  const [selectedGameLessonId, setSelectedGameLessonId] = useState<string>(() => QuestionBankRepository.getSelectedLessonId());
  const [currentOpenLesson, setCurrentOpenLesson] = useState<QuestionBankLesson | null>(null);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState<boolean>(false);
  const [newLessonForm, setNewLessonForm] = useState<{
    lessonTitle: string;
    subject: string;
    grade: GradeLevel;
    description: string;
  }>({
    lessonTitle: '',
    subject: 'Tin học',
    grade: 5,
    description: '',
  });

  // New lesson Excel upload state
  const [newLessonExcelFile, setNewLessonExcelFile] = useState<{ name: string; size: string } | null>(null);
  const [newLessonUploadedQuestions, setNewLessonUploadedQuestions] = useState<Question[]>([]);
  const [isParsingNewLessonExcel, setIsParsingNewLessonExcel] = useState<boolean>(false);
  const [newLessonExcelError, setNewLessonExcelError] = useState<string | null>(null);
  const [isDraggingExcelOverCreate, setIsDraggingExcelOverCreate] = useState<boolean>(false);
  const [showNewLessonPreview, setShowNewLessonPreview] = useState<boolean>(false);
  const newLessonFileInputRef = useRef<HTMLInputElement>(null);

  const openCreateLessonModal = (grade?: GradeLevel) => {
    soundService.playClick();
    const targetGrade = grade || activeGrade;
    setNewLessonForm({
      lessonTitle: '',
      subject: activeSubject !== 'Tất cả môn' ? activeSubject : 'Tin học',
      grade: targetGrade,
      description: '',
    });
    setNewLessonUploadedQuestions([]);
    setNewLessonExcelFile(null);
    setNewLessonExcelError(null);
    setShowNewLessonPreview(false);
    setShowCreateLessonModal(true);
  };

  const handleDownloadSampleExcel = () => {
    soundService.playClick();
    const excelBytes = generateQuestionExcelTemplate();
    downloadFile(excelBytes, 'mau_cau_hoi_trac_nghiem.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const handleDownloadSampleCsv = () => {
    soundService.playClick();
    const csvStr = generateQuestionCsvTemplate();
    downloadFile(csvStr, 'mau_cau_hoi_trac_nghiem.csv', 'text/csv;charset=utf-8;');
  };

  const handleProcessExcelForNewLesson = async (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      setNewLessonExcelError('Chỉ hỗ trợ tệp định dạng Excel (.xlsx, .xls) hoặc .csv');
      return;
    }

    soundService.playClick();
    setIsParsingNewLessonExcel(true);
    setNewLessonExcelError(null);

    try {
      let headers: string[] = [];
      let rows: Record<string, any>[] = [];

      if (ext === '.csv') {
        const text = await file.text();
        const csvData = parseCsv(text);
        headers = csvData.headers;
        rows = csvData.rows;
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const wbInfo = readExcelWorkbook(arrayBuffer);
        if (wbInfo.sheetNames.length === 0) {
          throw new Error('Tệp Excel không chứa trang tính (sheet) nào.');
        }
        const sheetData = extractSheetData(wbInfo.workbook, wbInfo.sheetNames[0]);
        headers = sheetData.headers;
        rows = sheetData.rows;
      }

      if (rows.length === 0) {
        throw new Error('Tệp không có dữ liệu câu hỏi nào.');
      }

      const mapping = autoDetectColumnMapping(headers);
      const validated = validateImportRows(rows, mapping, [], 'APPEND');
      const validQuestions: Question[] = [];

      const baseTimestamp = Date.now();
      validated.forEach((r, idx) => {
        if (r.status !== 'ERROR' && r.parsedQuestion) {
          const pq = r.parsedQuestion;
          validQuestions.push({
            id: pq.id || baseTimestamp + idx,
            question: pq.question,
            options: [...pq.options],
            correctAnswer: pq.correctAnswer,
            category: pq.category || `${newLessonForm.subject} ${newLessonForm.grade}`,
            explanation: pq.explanation || '',
            normalPoints: pq.normalPoints || 10,
            stealPoints: pq.stealPoints || 5,
            specialPoints: pq.specialPoints || 20,
            isSpecial: pq.isSpecial || false,
            grade: newLessonForm.grade,
            difficulty: (pq.difficulty as 'EASY' | 'HARD' | 'MEDIUM') || 'MEDIUM',
          });
        }
      });

      if (validQuestions.length === 0) {
        throw new Error('Không trích xuất được câu hỏi hợp lệ nào. Vui lòng kiểm tra tiêu đề cột theo file mẫu.');
      }

      setNewLessonUploadedQuestions(validQuestions);
      setNewLessonExcelFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
      });

      // Auto-suggest lesson title if empty
      if (!newLessonForm.lessonTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setNewLessonForm((prev) => ({
          ...prev,
          lessonTitle: cleanName,
        }));
      }

      soundService.playCorrect();
    } catch (err: any) {
      console.error('Lỗi khi đọc file Excel:', err);
      setNewLessonExcelError(err.message || 'Lỗi đọc tệp Excel.');
      setNewLessonUploadedQuestions([]);
      setNewLessonExcelFile(null);
    } finally {
      setIsParsingNewLessonExcel(false);
    }
  };

  const handleRemoveNewLessonExcel = () => {
    soundService.playClick();
    setNewLessonExcelFile(null);
    setNewLessonUploadedQuestions([]);
    setNewLessonExcelError(null);
    setShowNewLessonPreview(false);
    if (newLessonFileInputRef.current) {
      newLessonFileInputRef.current.value = '';
    }
  };

  const refreshLessons = () => {
    setBankLessons(QuestionBankRepository.getLessons());
    if (currentOpenLesson) {
      const updated = QuestionBankRepository.getLessonById(currentOpenLesson.id);
      if (updated) setCurrentOpenLesson(updated);
    }
  };

  const handleApplyImportedTeams = (
    importedTeams: { name: string; color: string; markerColor?: string; badge?: string }[]
  ) => {
    soundService.playClick();
    const count = Math.min(4, Math.max(2, importedTeams.length)) as TeamCount;
    setDefaultTeamCount(count);
    EduplayStorage.setGameData('eduplay_default_team_count', count);

    const updated: TeamPreset[] = [...configuredTeams];
    importedTeams.forEach((imp, idx) => {
      if (idx < 4) {
        if (updated[idx]) {
          updated[idx] = {
            ...updated[idx],
            defaultName: imp.name,
            color: imp.color,
            accentColor: imp.markerColor || imp.color,
            badge: imp.badge || updated[idx].badge,
          };
        } else {
          const code = (`TEAM${idx + 1}`) as 'TEAM1' | 'TEAM2' | 'TEAM3' | 'TEAM4';
          updated.push({
            code,
            defaultName: imp.name,
            color: imp.color,
            accentColor: imp.markerColor || imp.color,
            badge: imp.badge || '⚡',
          });
        }
      }
    });

    setConfiguredTeams(updated);
    EduplayStorage.setGameData('eduplay_team_presets', updated);
    setSaveSuccessMsg(`Đã nhập thành công ${importedTeams.length} đội từ tệp!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveTeamsConfig = () => {
    soundService.playClick();
    EduplayStorage.setGameData('eduplay_team_presets', configuredTeams);
    setSaveSuccessMsg('Đã lưu cấu hình danh sách Đội mặc định thành công!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleApplyFastPack = (pack: typeof FAST_PRESET_PACKS[0]) => {
    soundService.playClick();
    const updated = configuredTeams.map((t, idx) => {
      const p = pack.teams[idx];
      if (p) {
        return {
          ...t,
          defaultName: p.name,
          color: p.color,
          badge: p.badge,
        };
      }
      return t;
    });
    setConfiguredTeams(updated);
    EduplayStorage.setGameData('eduplay_team_presets', updated);
    setSaveSuccessMsg(`Đã áp dụng mẫu [${pack.name}]!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSelectGameLesson = (lesson: QuestionBankLesson) => {
    soundService.playClick();
    QuestionBankRepository.setSelectedLessonId(lesson.id);
    setSelectedGameLessonId(lesson.id);
    setQuestions(lesson.questions);
    EduplayStorage.saveQuestions(lesson.questions);
    setSaveSuccessMsg(`Đã chọn bài [${lesson.lessonTitle}] cho trận đấu!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleCreateLesson = () => {
    if (!newLessonForm.lessonTitle.trim()) {
      alert('Vui lòng nhập tên bài học.');
      return;
    }
    soundService.playClick();

    const assignedQuestions: Question[] = newLessonUploadedQuestions.map((q) => ({
      ...q,
      grade: newLessonForm.grade,
      category: `${newLessonForm.subject} ${newLessonForm.grade}`,
    }));

    const newLesson: QuestionBankLesson = {
      id: `lesson_${Date.now()}`,
      grade: newLessonForm.grade,
      subject: newLessonForm.subject.trim() || 'Tin học',
      lessonNumber: bankLessons.filter((l) => l.grade === newLessonForm.grade && l.subject === newLessonForm.subject).length + 1,
      lessonTitle: newLessonForm.lessonTitle.trim(),
      description: newLessonForm.description.trim(),
      questions: assignedQuestions,
    };
    QuestionBankRepository.saveLesson(newLesson);
    refreshLessons();
    setShowCreateLessonModal(false);
    setCurrentOpenLesson(newLesson);
    setNewLessonForm({
      lessonTitle: '',
      subject: 'Tin học',
      grade: activeGrade,
      description: '',
    });
    setNewLessonUploadedQuestions([]);
    setNewLessonExcelFile(null);
    setNewLessonExcelError(null);
    setShowNewLessonPreview(false);

    if (assignedQuestions.length > 0) {
      setSaveSuccessMsg(`Đã tạo thành công bài học [${newLesson.lessonTitle}] với ${assignedQuestions.length} câu hỏi từ Excel!`);
    } else {
      setSaveSuccessMsg(`Đã tạo bài học mới [${newLesson.lessonTitle}]! Hãy thêm câu hỏi vào bài này.`);
    }
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleCreateQuestion = () => {
    if (!newQuestionForm.question || !newQuestionForm.options?.every((o) => o.trim())) {
      alert('Vui lòng nhập đầy đủ nội dung câu hỏi và 4 phương án lựa chọn.');
      return;
    }
    soundService.playClick();
    const newQ: Question = {
      id: Date.now(),
      question: newQuestionForm.question || '',
      options: newQuestionForm.options || ['', '', '', ''],
      correctAnswer: newQuestionForm.correctAnswer || 0,
      category: currentOpenLesson
        ? `${currentOpenLesson.subject} ${currentOpenLesson.grade}`
        : newQuestionForm.category || 'Tin học 5',
      explanation: newQuestionForm.explanation || '',
      normalPoints: 10,
      stealPoints: 5,
      grade: currentOpenLesson?.grade,
      lessonId: currentOpenLesson?.id,
    };

    if (currentOpenLesson) {
      const updatedQuestions = [...currentOpenLesson.questions, newQ];
      const updatedLesson = { ...currentOpenLesson, questions: updatedQuestions };
      QuestionBankRepository.saveLesson(updatedLesson);
      setCurrentOpenLesson(updatedLesson);
      refreshLessons();

      if (currentOpenLesson.id === selectedGameLessonId) {
        setQuestions(updatedQuestions);
        EduplayStorage.saveQuestions(updatedQuestions);
      }
    } else {
      const updated = [newQ, ...questions];
      setQuestions(updated);
      EduplayStorage.saveQuestions(updated);
    }

    setShowAddQuestionModal(false);
    setNewQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      category: 'Tin học 5',
      explanation: '',
      normalPoints: 10,
      stealPoints: 5,
    });
    setSaveSuccessMsg('Đã thêm câu hỏi mới!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleDeleteQuestion = (qId: number) => {
    soundService.playClick();
    if (currentOpenLesson) {
      const updatedQuestions = currentOpenLesson.questions.filter((q) => q.id !== qId);
      const updatedLesson = { ...currentOpenLesson, questions: updatedQuestions };
      QuestionBankRepository.saveLesson(updatedLesson);
      setCurrentOpenLesson(updatedLesson);
      refreshLessons();

      if (currentOpenLesson.id === selectedGameLessonId) {
        setQuestions(updatedQuestions);
        EduplayStorage.saveQuestions(updatedQuestions);
      }
    } else {
      const updated = questions.filter((q) => q.id !== qId);
      setQuestions(updated);
      EduplayStorage.saveQuestions(updated);
    }
  };

  const handleExportQuestions = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `eduplay_questions_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundService.playClick();
              onBackToEduplay();
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Eduplay Home</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                <span>DASHBOARD GIÁO VIÊN</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                  Thi Đấu Theo Đội
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Quản lý Đội chơi • Ngân hàng câu hỏi • Google Sheets</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('TEAMS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'TEAMS'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Đội thi đấu (2-4 đội)</span>
          </button>
          <button
            onClick={() => setActiveTab('QUESTIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'QUESTIONS'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ngân hàng câu hỏi ({questions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử ván đấu</span>
          </button>
          <button
            onClick={() => setActiveTab('DATABASE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'DATABASE'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Google Sheets Cloud</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* TAB 1: TEAMS MANAGEMENT (No individual students) */}
        {activeTab === 'TEAMS' && (
          <div className="space-y-6">
            {/* Philosophy Banner */}
            <div className="bg-gradient-to-r from-blue-950/60 to-purple-950/60 border border-blue-500/30 rounded-3xl p-5 shadow-xl space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-black text-white uppercase">
                  Mô Hình Thi Đấu Theo Đội (2, 3 hoặc 4 Đội)
                </h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hệ thống EDUPLAY chuyển hoàn toàn sang cơ chế thi đua theo nhóm: Giáo viên không cần quản lý chi tiết từng học sinh. Trước mỗi trận đấu, giáo viên chỉ cần chọn số lượng đội (2, 3, hoặc 4 đội), đặt tên và phân màu sắc.
              </p>
            </div>

            {/* Quick Presets Pack selector */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Gợi Ý Mẫu Đội Nhanh Cho Lớp Học
                </h3>
                <span className="text-[11px] text-slate-400">Bấm để áp dụng nhanh</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {FAST_PRESET_PACKS.map((pack, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyFastPack(pack)}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl text-left transition-all hover:scale-[1.02] cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-white group-hover:text-cyan-300">
                        {pack.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{pack.desc}</p>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      {pack.teams.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          style={{ backgroundColor: t.color }}
                          className="w-4 h-4 rounded-full inline-block shadow-sm"
                          title={t.name}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Teams Configuration Editor (4 Default Teams) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                      <span>Cấu hình {defaultTeamCount} Đội chơi mặc định</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Các giá trị này sẽ tự động nạp sẵn khi bắt đầu bất kỳ trò chơi nào (Cam Race, Quiz Battle, Fastest Hand...)
                    </p>
                  </div>

                  {/* Team Count Selector (2, 3, 4 Đội) */}
                  <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                    {([2, 3, 4] as TeamCount[]).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          soundService.playClick();
                          setDefaultTeamCount(cnt);
                          EduplayStorage.setGameData('eduplay_default_team_count', cnt);
                        }}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                          defaultTeamCount === cnt
                            ? 'bg-cyan-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {cnt} ĐỘI
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Hidden Input for Team Import */}
                  <input
                    ref={teamFileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleTeamFileSelected(e.target.files[0]);
                      }
                      e.target.value = '';
                    }}
                  />
                  <button
                    id="btn-import-teams-excel-csv"
                    type="button"
                    onClick={handleImportTeamsClick}
                    className="px-4 py-2 bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>📥 Nhập Đội Từ CSV / Excel</span>
                  </button>
                  <button
                    id="btn-save-teams-config"
                    onClick={handleSaveTeamsConfig}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu Cấu Hình Đội</span>
                  </button>
                </div>
              </div>

              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  defaultTeamCount === 2
                    ? 'lg:grid-cols-2'
                    : defaultTeamCount === 3
                    ? 'lg:grid-cols-3'
                    : 'lg:grid-cols-4'
                } gap-4`}
              >
                {configuredTeams.slice(0, defaultTeamCount).map((team, idx) => (
                  <div
                    key={team.code || idx}
                    style={{ borderColor: `${team.color}55` }}
                    className="p-4 rounded-2xl bg-slate-950/80 border-2 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-400">
                        ĐỘI {idx + 1}
                      </span>
                      <span className="text-xl">{team.badge}</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Tên Đội:</label>
                      <input
                        type="text"
                        value={team.defaultName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfiguredTeams((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, defaultName: val } : t))
                          );
                        }}
                        style={{ color: team.color }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-bold text-sm focus:outline-none focus:border-cyan-400 uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Màu Sắc Đội:</label>
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        {TEAM_COLOR_OPTIONS.map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => {
                              setConfiguredTeams((prev) =>
                                prev.map((t, i) =>
                                  i === idx ? { ...t, color: c.color, badge: c.badge } : t
                                )
                              );
                            }}
                            style={{ backgroundColor: c.color }}
                            className={`w-6 h-6 rounded-full shrink-0 transition-transform ${
                              team.color === c.color ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-60 hover:opacity-100'
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUESTIONS */}
        {activeTab === 'QUESTIONS' && (
          <div className="space-y-5">
            {!currentOpenLesson ? (
              /* VIEW 1: LESSONS BROWSER BY GRADE 1-9 & SUBJECT */
              <div className="space-y-4">
                {/* Top Banner & Status */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-base font-black text-white uppercase tracking-tight">
                        NGÂN HÀNG CÂU HỎI THEO KHỐI (1 - 9) & BÀI HỌC
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Phân chia bài học theo từng Khối lớp (1 đến 9) và Môn học. Giáo viên chọn bài học để học sinh thi đấu trực tiếp.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        setCurrentOpenLesson(null);
                        setShowQuestionImportModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wide shrink-0"
                      title="Tải lên tệp Excel hoặc CSV để tạo bài học và lưu vào ngân hàng cho các game"
                    >
                      <Upload className="w-4 h-4 stroke-[2.5]" />
                      <span>📥 Tải Lên Bộ Câu Hỏi (CSV / Excel)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openCreateLessonModal(activeGrade)}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all uppercase tracking-wide shrink-0"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>+ Tạo Bài Học Mới (Khối {activeGrade})</span>
                    </button>
                  </div>
                </div>

                {/* Grade 1 - 9 Tabs Selector */}
                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase text-slate-400 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-cyan-400" />
                      <span>Chọn Khối lớp:</span>
                    </span>
                    <span className="text-[11px] text-cyan-400 font-bold">
                      Đang xem: Khối {activeGrade}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
                    {([1, 2, 3, 4, 5, 6, 7, 8, 9] as GradeLevel[]).map((grade) => {
                      const count = bankLessons.filter((l) => l.grade === grade).length;
                      const isActive = activeGrade === grade;

                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => {
                            soundService.playClick();
                            setActiveGrade(grade);
                            setActiveSubject('Tất cả môn');
                          }}
                          className={`py-2 px-1 rounded-xl font-black text-xs transition-all flex flex-col items-center justify-center cursor-pointer border ${
                            isActive
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span className="text-xs">Khối {grade}</span>
                          <span className={`text-[10px] ${isActive ? 'text-slate-950 font-bold' : 'text-slate-500'}`}>
                            {count} bài
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject Pills & Search */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl">
                  {/* Subject Filter */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    <span className="text-xs font-bold text-slate-400 mr-1 shrink-0 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-cyan-400" />
                      Môn:
                    </span>
                    {['Tất cả môn', ...QuestionBankRepository.getSubjectsByGrade(activeGrade)].map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => {
                          soundService.playClick();
                          setActiveSubject(subj);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activeSubject === subj
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchLessonQuery}
                      onChange={(e) => setSearchLessonQuery(e.target.value)}
                      placeholder="Tìm bài học..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Lessons Grid */}
                <div className="space-y-3">
                  {(() => {
                    let list = QuestionBankRepository.getLessonsByGradeAndSubject(activeGrade, activeSubject);
                    if (searchLessonQuery.trim()) {
                      const q = searchLessonQuery.toLowerCase().trim();
                      list = list.filter(
                        (l) =>
                          l.lessonTitle.toLowerCase().includes(q) ||
                          l.subject.toLowerCase().includes(q) ||
                          (l.description && l.description.toLowerCase().includes(q))
                      );
                    }

                    if (list.length === 0) {
                      return (
                        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
                          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
                          <p className="text-sm font-bold text-slate-400">
                            Chưa có bài học nào cho Khối {activeGrade} ({activeSubject}).
                          </p>
                          <button
                            type="button"
                            onClick={() => openCreateLessonModal(activeGrade)}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Tạo bài học đầu tiên ngay</span>
                          </button>
                        </div>
                      );
                    }

                    return list.map((lesson) => {
                      const isSelectedForGame = lesson.id === selectedGameLessonId;

                      return (
                        <div
                          key={lesson.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            isSelectedForGame
                              ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/30'
                              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[11px] font-black">
                                Khối {lesson.grade}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                                {lesson.subject}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-semibold">
                                {lesson.questions.length} câu hỏi
                              </span>
                              {isSelectedForGame && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>ĐANG CHỌN CHO GAME</span>
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-black text-white leading-snug">
                              {lesson.lessonTitle}
                            </h4>

                            {lesson.description && (
                              <p className="text-xs text-slate-400">
                                {lesson.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!isSelectedForGame && (
                              <button
                                type="button"
                                onClick={() => handleSelectGameLesson(lesson)}
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-500/50 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Chọn thi đấu</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                soundService.playClick();
                                setCurrentOpenLesson(lesson);
                              }}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Quản lý & Sửa ({lesson.questions.length} câu)</span>
                              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              /* VIEW 2: LESSON QUESTION EDITOR */
              <div className="space-y-4">
                {/* Back to lessons list Header */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        setCurrentOpenLesson(null);
                        refreshLessons();
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>← Quay lại danh sách bài học</span>
                    </button>

                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-cyan-400">Khối {currentOpenLesson.grade}</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-bold text-amber-400">{currentOpenLesson.subject}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 font-semibold">{currentOpenLesson.questions.length} câu hỏi</span>
                      </div>
                      <h3 className="text-base font-black text-white mt-0.5">
                        {currentOpenLesson.lessonTitle}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {currentOpenLesson.id === selectedGameLessonId ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Bộ câu hỏi trận đấu hiện tại</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectGameLesson(currentOpenLesson)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow transition-all"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Đặt làm bộ câu hỏi trận đấu</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        setShowQuestionImportModal(true);
                      }}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 stroke-[3]" />
                      <span>📥 Nhập từ CSV / Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAddQuestionModal(true)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3] text-cyan-400" />
                      <span>+ Thêm câu hỏi vào bài này</span>
                    </button>
                  </div>
                </div>

                {/* Questions List of Current Lesson */}
                {currentOpenLesson.questions.length === 0 ? (
                  <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
                    <p className="text-sm font-bold text-slate-400">
                      Bài học này chưa có câu hỏi nào.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddQuestionModal(true)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Thêm câu hỏi đầu tiên</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentOpenLesson.questions.map((q, qIdx) => (
                      <div
                        key={q.id || qIdx}
                        className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-xs font-black">
                              Câu {qIdx + 1}
                            </span>
                            {q.category && (
                              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                                {q.category}
                              </span>
                            )}
                            {q.isSpecial && (
                              <span className="text-xs bg-purple-950 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md font-bold">
                                ★ Đặc biệt (x2)
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                            title="Xóa câu hỏi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <h4 className="text-sm font-bold text-white">{q.question}</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-xl border flex items-center gap-2 ${
                                optIdx === q.correctAnswer
                                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-300">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                            💡 Giải thích: {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase">
                Lịch sử các ván đấu đã diễn ra ({history.length} ván)
              </h3>
              <button
                onClick={() => {
                  EduplayStorage.addHistoryEntry({
                    gameId: 'quiz-battle',
                    gameName: 'ĐẤU TRÍ ĐỒNG ĐỘI',
                    className: 'Toàn khối',
                    timestamp: Date.now(),
                    winner: 'ĐỘI XANH',
                    summary: 'Điểm số: ĐỘI XANH (40đ) • ĐỘI CAM (20đ) • ĐỘI TÍM (10đ)',
                  });
                  setHistory(EduplayStorage.getHistory());
                }}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                + Thêm ván mẫu
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">Chưa có ván đấu nào được ghi lại.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-cyan-400">{h.gameName}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 font-semibold">{h.className}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{new Date(h.timestamp).toLocaleTimeString('vi-VN')}</span>
                      </div>
                      <p className="text-slate-300 mt-1">{h.summary}</p>
                    </div>

                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full font-bold">
                      🏆 {h.winner}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DATABASE & CLOUD */}
        {activeTab === 'DATABASE' && (
          <div className="space-y-6">
            {/* Cloud Status Banner */}
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-400" />
                      HỆ THỐNG DỮ LIỆU GOOGLE SHEETS CLOUD
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      syncStatus.mode === 'cloud'
                        ? syncStatus.isCloudReachable
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {syncStatus.mode === 'cloud'
                        ? (syncStatus.isCloudReachable ? '● Cloud Đang hoạt động' : '○ Mất kết nối Cloud')
                        : '💻 Local Mode (Trình duyệt)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Kiến trúc: EDUPLAY Web ↔ Google Apps Script API (/exec) ↔ 16 Bảng dữ liệu Google Sheets
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      apiClient.setMode(syncStatus.mode === 'cloud' ? 'local' : 'cloud');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                      syncStatus.mode === 'cloud'
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 hover:bg-blue-600/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    Chuyển sang: {syncStatus.mode === 'cloud' ? '💻 Chế độ Local' : '☁️ Chế độ Cloud'}
                  </button>

                  <button
                    type="button"
                    disabled={isSyncing || syncStatus.pendingEventsCount === 0}
                    onClick={async () => {
                      soundService.playClick();
                      setIsSyncing(true);
                      await apiClient.flushPendingQueue();
                      setIsSyncing(false);
                      setSaveSuccessMsg('Đã hoàn tất đồng bộ hàng đợi ngoại tuyến!');
                      setTimeout(() => setSaveSuccessMsg(null), 3000);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Đồng bộ hàng đợi ({syncStatus.pendingEventsCount})</span>
                  </button>
                </div>
              </div>

              {/* Web App URL Config */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  Đường dẫn Google Apps Script Web App (/exec):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cloudUrlInput}
                    onChange={(e) => setCloudUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      apiClient.setApiUrl(cloudUrlInput);
                      setSaveSuccessMsg('Đã cập nhật URL Google Apps Script Web App!');
                      setTimeout(() => setSaveSuccessMsg(null), 3000);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
                  >
                    Lưu URL
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Biến môi trường hiện tại: <code className="text-cyan-400">VITE_APPS_SCRIPT_API_URL</code>. Thầy cô có thể ghi đè bằng ô nhập trên.
                </p>
              </div>

              {/* 16 Sheet Schemas Grid */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  16 Bảng dữ liệu chuẩn hóa của hệ sinh thái EDUPLAY:
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {[
                    { name: 'SETTINGS', desc: '13 tham số hệ thống' },
                    { name: 'GAME_CATALOG', desc: '6 game tương tác' },
                    { name: 'CLASSES', desc: 'Danh sách khối/lớp' },
                    { name: 'STUDENTS', desc: '(Bảo lưu) Hồ sơ' },
                    { name: 'QUESTION_BANKS', desc: 'Ngân hàng đề thi' },
                    { name: 'QUESTIONS', desc: 'Bộ câu hỏi trắc nghiệm' },
                    { name: 'GAME_SESSIONS', desc: 'Phiên trận đấu (2-4 đội)' },
                    { name: 'TEAMS', desc: 'Đội thi đấu & điểm số' },
                    { name: 'PARTICIPANTS', desc: '(Bảo lưu) Người chơi' },
                    { name: 'SCORE_EVENTS', desc: 'Lịch sử cộng/trừ điểm' },
                    { name: 'GAME_RESULTS', desc: 'Bảng xếp hạng chung cuộc' },
                    { name: 'CAM_RACE_RESULTS', desc: 'Lịch sử nhận diện thẻ' },
                    { name: 'LUCKY_WHEEL_HISTORY', desc: 'Lịch sử quay may mắn' },
                    { name: 'RANDOM_PICKER_HISTORY', desc: 'Lịch sử chọn ngẫu nhiên' },
                    { name: 'CERTIFICATES', desc: 'Chứng nhận khen thưởng' },
                    { name: 'APP_LOGS', desc: 'Nhật ký lỗi & sự kiện' },
                  ].map((table) => (
                    <div key={table.name} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                      <p className="font-bold text-cyan-400 font-mono text-[11px]">{table.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{table.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD QUESTION */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white uppercase">Thêm câu hỏi trắc nghiệm mới</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nội dung câu hỏi:</label>
                <textarea
                  rows={2}
                  value={newQuestionForm.question}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question: e.target.value })}
                  placeholder="Ví dụ: Đâu là thiết bị xuất của máy tính?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {['A', 'B', 'C', 'D'].map((label, idx) => (
                  <div key={label}>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Phương án {label}:</label>
                    <input
                      type="text"
                      value={newQuestionForm.options?.[idx] || ''}
                      onChange={(e) => {
                        const newOpts = [...(newQuestionForm.options || ['', '', '', ''])];
                        newOpts[idx] = e.target.value;
                        setNewQuestionForm({ ...newQuestionForm, options: newOpts });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Đáp án đúng:</label>
                <select
                  value={newQuestionForm.correctAnswer}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, correctAnswer: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value={0}>A</option>
                  <option value={1}>B</option>
                  <option value={2}>C</option>
                  <option value={3}>D</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Chủ đề:</label>
                <input
                  type="text"
                  value={newQuestionForm.category}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateQuestion}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Lưu câu hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION IMPORT MODAL */}
      <QuestionImportModal
        isOpen={showQuestionImportModal}
        onClose={() => setShowQuestionImportModal(false)}
        currentQuestions={currentOpenLesson ? currentOpenLesson.questions : questions}
        targetLessonId={currentOpenLesson?.id}
        initialLessonTitle={currentOpenLesson?.lessonTitle || ''}
        initialGrade={currentOpenLesson?.grade || activeGrade}
        initialSubject={currentOpenLesson?.subject || (activeSubject !== 'Tất cả môn' ? activeSubject : 'Tin học')}
        saveAsLesson={true}
        onImportLessonSuccess={(newLesson, newQuestions) => {
          refreshLessons();
          setSelectedGameLessonId(newLesson.id);
          QuestionBankRepository.setSelectedLessonId(newLesson.id);
          setQuestions(newQuestions);
          EduplayStorage.saveQuestions(newQuestions);
          if (currentOpenLesson) {
            setCurrentOpenLesson(newLesson);
          }
          setSaveSuccessMsg(`Đã lưu thành công bài học [${newLesson.lessonTitle}] (${newQuestions.length} câu) vào Ngân hàng! Bạn có thể chọn game để thi đấu ngay.`);
          setTimeout(() => setSaveSuccessMsg(null), 5000);
        }}
        onImportSuccess={(newQuestions) => {
          refreshLessons();
        }}
      />

      {/* CREATE LESSON MODAL */}
      {showCreateLessonModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Tạo Bài Học Mới & Nạp Câu Hỏi
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Phân loại theo Khối 1 - 9, Môn học và tải file Excel lên để nạp câu hỏi siêu tốc.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateLessonModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* 1. Khối Lớp */}
              <div>
                <label className="text-xs font-extrabold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  <span>1. Khối Lớp (1 đến 9):</span>
                </label>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
                  {([1, 2, 3, 4, 5, 6, 7, 8, 9] as GradeLevel[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setNewLessonForm({ ...newLessonForm, grade: g })}
                      className={`py-2 rounded-xl font-black text-xs border cursor-pointer transition-all ${
                        newLessonForm.grade === g
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30 scale-105'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-[9px] opacity-75 font-semibold">Khối</div>
                      <div className="text-sm font-black">{g}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Môn Học */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>2. Môn Học:</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Bấm gợi ý nhanh bên dưới:</span>
                </div>
                <input
                  type="text"
                  value={newLessonForm.subject}
                  onChange={(e) => setNewLessonForm({ ...newLessonForm, subject: e.target.value })}
                  placeholder="Ví dụ: Tin học, Toán, Tiếng Việt, Tiếng Anh, Khoa học..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                {/* Quick Subject Pills */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {['Tin học', 'Toán', 'Tiếng Việt', 'Tiếng Anh', 'Khoa học', 'Lịch sử - Địa lí'].map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setNewLessonForm({ ...newLessonForm, subject: sub })}
                      className={`text-[11px] px-2.5 py-0.5 rounded-lg border cursor-pointer transition-colors ${
                        newLessonForm.subject === sub
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Tên Bài Học */}
              <div>
                <label className="text-xs font-extrabold text-slate-300 block mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>3. Tên Bài Học / Chủ Đề:</span>
                </label>
                <input
                  type="text"
                  value={newLessonForm.lessonTitle}
                  onChange={(e) => setNewLessonForm({ ...newLessonForm, lessonTitle: e.target.value })}
                  placeholder="Ví dụ: Bài 3: Vẽ tranh với Paint (hoặc tự động điền khi tải file Excel)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-semibold"
                />
              </div>

              {/* 4. Mô Tả Ngắn */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Mô tả bài học (tùy chọn):
                </label>
                <textarea
                  rows={2}
                  value={newLessonForm.description}
                  onChange={(e) => setNewLessonForm({ ...newLessonForm, description: e.target.value })}
                  placeholder="Mô tả tóm tắt nội dung trọng tâm bài học..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* 5. UPLOAD EXCEL SECTION */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        Tải Bộ Câu Hỏi Bằng Excel / CSV Lên Cho Nhanh
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Tải trực tiếp danh sách câu hỏi trắc nghiệm từ bảng tính vào bài học
                      </p>
                    </div>
                  </div>

                  {/* Template Download Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadSampleExcel}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/50 hover:bg-emerald-900/80 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Tải tệp mẫu Excel có định dạng chuẩn (.xlsx)"
                    >
                      <Download className="w-3 h-3" />
                      <span>Mẫu Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCsv}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Tải tệp mẫu CSV (.csv)"
                    >
                      <Download className="w-3 h-3" />
                      <span>Mẫu CSV</span>
                    </button>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={newLessonFileInputRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessExcelForNewLesson(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {/* Dropzone or Success View */}
                {!newLessonExcelFile && !isParsingNewLessonExcel && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingExcelOverCreate(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDraggingExcelOverCreate(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingExcelOverCreate(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleProcessExcelForNewLesson(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => newLessonFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      isDraggingExcelOverCreate
                        ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/20'
                        : 'border-slate-700 hover:border-emerald-500/70 bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-white mb-1">
                      Kéo & thả file Excel (.xlsx, .xls) hoặc CSV vào đây
                    </p>
                    <p className="text-[11px] text-slate-400 mb-2.5">
                      hoặc <span className="text-cyan-400 underline font-semibold">bấm để chọn file từ máy tính</span>
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 text-[10px] text-slate-400 border border-slate-800">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Hệ thống tự nhận diện: Câu hỏi, 4 đáp án A/B/C/D, Đáp án đúng, Giải thích...</span>
                    </div>
                  </div>
                )}

                {/* Parsing state */}
                {isParsingNewLessonExcel && (
                  <div className="p-6 text-center bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                    <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-300">
                      Đang đọc và xử lý câu hỏi từ file Excel...
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {newLessonExcelError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">{newLessonExcelError}</p>
                      <p className="text-[11px] text-rose-400 mt-0.5">
                        Vui lòng tải tệp mẫu Excel phía trên để đối chiếu tiêu đề các cột chuẩn.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => newLessonFileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-[10px] font-bold text-white shrink-0 cursor-pointer"
                    >
                      Chọn file khác
                    </button>
                  </div>
                )}

                {/* Successfully Loaded Questions Card */}
                {newLessonExcelFile && newLessonUploadedQuestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{newLessonExcelFile.name}</span>
                            <span className="text-[10px] text-slate-400">({newLessonExcelFile.size})</span>
                          </div>
                          <p className="text-[11px] font-bold text-emerald-300 mt-0.5 flex items-center gap-1">
                            <span>✨ Đã nạp thành công {newLessonUploadedQuestions.length} câu hỏi trắc nghiệm!</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowNewLessonPreview(!showNewLessonPreview)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{showNewLessonPreview ? 'Ẩn xem trước' : `Xem trước (${newLessonUploadedQuestions.length})`}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveNewLessonExcel}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Đổi tệp</span>
                        </button>
                      </div>
                    </div>

                    {/* Preview Questions List */}
                    {showNewLessonPreview && (
                      <div className="max-h-56 overflow-y-auto space-y-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between px-1">
                          <span>Danh sách {newLessonUploadedQuestions.length} câu hỏi đọc từ Excel:</span>
                          <span className="text-emerald-400 font-semibold">Khối {newLessonForm.grade} - {newLessonForm.subject}</span>
                        </div>
                        {newLessonUploadedQuestions.map((q, qIdx) => (
                          <div
                            key={q.id || qIdx}
                            className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-lg space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-cyan-400">Câu {qIdx + 1}:</span>
                              {q.category && (
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                  {q.category}
                                </span>
                              )}
                            </div>
                            <p className="text-white font-medium">{q.question}</p>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              {q.options.map((opt, oIdx) => (
                                <div
                                  key={oIdx}
                                  className={`px-2 py-1 rounded border ${
                                    oIdx === q.correctAnswer
                                      ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 font-bold flex items-center justify-between'
                                      : 'bg-slate-950 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  <span>
                                    {String.fromCharCode(65 + oIdx)}. {opt}
                                  </span>
                                  {oIdx === q.correctAnswer && <Check className="w-3 h-3 text-emerald-400" />}
                                </div>
                              ))}
                            </div>
                            {q.explanation && (
                              <p className="text-[10px] text-slate-400 italic bg-slate-950/60 p-1 rounded">
                                💡 {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {newLessonUploadedQuestions.length > 0 ? (
                  <span className="text-emerald-400 font-bold">
                    ✓ Sẵn sàng nạp {newLessonUploadedQuestions.length} câu hỏi vào bài học
                  </span>
                ) : (
                  <span>(Có thể thêm câu hỏi thủ công hoặc bằng Excel sau)</span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateLessonModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateLesson}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/25 flex items-center gap-1.5"
                >
                  {newLessonUploadedQuestions.length > 0 ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Tạo bài & Nạp {newLessonUploadedQuestions.length} câu hỏi</span>
                    </>
                  ) : (
                    <span>Tạo bài học</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM IMPORT MODAL */}
      <TeamImportModal
        isOpen={showTeamImportModal}
        initialFile={teamImportFile}
        onClose={() => {
          setShowTeamImportModal(false);
          setTeamImportFile(null);
        }}
        onApplyTeams={handleApplyImportedTeams}
      />
    </div>
  );
};
