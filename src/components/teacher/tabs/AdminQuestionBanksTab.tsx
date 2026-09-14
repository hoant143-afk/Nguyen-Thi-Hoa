import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Upload,
  Download,
  Eye,
  Edit2,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight,
  FileSpreadsheet,
  FileText,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Sparkles,
  HelpCircle,
  Save,
  Search,
} from 'lucide-react';
import { Question, QuestionBankLesson, GradeLevel } from '../../../types';
import { soundService } from '../../../services/soundService';
import {
  downloadFile,
  generateQuestionCsvTemplate,
  generateQuestionExcelTemplate,
} from '../../../services/importer/questionImporter';
import { QuestionBankExporter } from '../../../services/questionBankExporter';

interface AdminQuestionBanksTabProps {
  banks: QuestionBankLesson[];
  onRefreshBanks: () => void;
  onOpenImportModal: (bank?: QuestionBankLesson) => void;
  onSaveBank: (bank: QuestionBankLesson) => Promise<void>;
  onDeleteBank?: (bankId: string) => void;
}

export const AdminQuestionBanksTab: React.FC<AdminQuestionBanksTabProps> = ({
  banks,
  onRefreshBanks,
  onOpenImportModal,
  onSaveBank,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');

  // Active bank being viewed / edited
  const [viewingBank, setViewingBank] = useState<QuestionBankLesson | null>(null);

  // Edit Bank metadata modal
  const [editingBankMeta, setEditingBankMeta] = useState<QuestionBankLesson | null>(null);
  const [editMetaForm, setEditMetaForm] = useState<{
    lessonTitle: string;
    subject: string;
    grade: GradeLevel;
    topic: string;
  }>({
    lessonTitle: '',
    subject: 'Tin học',
    grade: 5,
    topic: '',
  });

  // Create new Bank modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newBankForm, setNewBankForm] = useState<{
    lessonTitle: string;
    subject: string;
    grade: GradeLevel;
    topic: string;
  }>({
    lessonTitle: '',
    subject: 'Tin học',
    grade: 5,
    topic: '',
  });

  // Question Editor state inside viewingBank
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState<boolean>(false);
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank'>('multiple_choice');
  const [questionForm, setQuestionForm] = useState<{
    question: string;
    options: [string, string, string, string];
    correctAnswer: number;
    explanation: string;
    normalPoints: number;
  }>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    normalPoints: 10,
  });

  // Filter banks
  const filteredBanks = banks.filter((b) => {
    const matchSearch =
      b.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.topic && b.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.subject && b.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchGrade = selectedGrade === 'ALL' || String(b.grade) === selectedGrade;
    return matchSearch && matchGrade;
  });

  // Download templates
  const handleDownloadCsvSample = () => {
    soundService.playClick();
    const csv = generateQuestionCsvTemplate();
    downloadFile(csv, 'EDUPLAY_Mau_Cau_Hoi_Chuan.csv', 'text/csv;charset=utf-8;');
  };

  const handleDownloadExcelSample = () => {
    soundService.playClick();
    const xlsx = generateQuestionExcelTemplate();
    downloadFile(
      xlsx,
      'EDUPLAY_Mau_Cau_Hoi_Chuan.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  };

  // Toggle bank disabled/enabled
  const handleToggleBank = async (bank: QuestionBankLesson) => {
    soundService.playClick();
    const updated: QuestionBankLesson = {
      ...bank,
      enabled: bank.enabled === false ? true : false,
      updatedAt: new Date().toISOString(),
    };
    await onSaveBank(updated);
  };

  // Duplicate Bank
  const handleDuplicateBank = async (bank: QuestionBankLesson) => {
    soundService.playClick();
    const newId = `bank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const clonedQuestions = (bank.questions || []).map((q, idx) => ({
      ...q,
      id: Date.now() + idx,
      lessonId: newId,
    }));

    const duplicated: QuestionBankLesson = {
      ...bank,
      id: newId,
      lessonTitle: `${bank.lessonTitle} (Bản sao)`,
      questions: clonedQuestions,
      updatedAt: new Date().toISOString(),
    };

    await onSaveBank(duplicated);
  };

  // Create Bank submit
  const handleCreateBankSubmit = async () => {
    if (!newBankForm.lessonTitle.trim()) {
      alert('Vui lòng nhập tên bộ câu hỏi!');
      return;
    }
    soundService.playClick();
    const newBank: QuestionBankLesson = {
      id: `bank_${Date.now()}`,
      lessonTitle: newBankForm.lessonTitle.trim(),
      subject: newBankForm.subject.trim(),
      grade: newBankForm.grade,
      topic: newBankForm.topic.trim(),
      questions: [],
      enabled: true,
      updatedAt: new Date().toISOString(),
    };

    await onSaveBank(newBank);
    setShowCreateModal(false);
    setNewBankForm({ lessonTitle: '', subject: 'Tin học', grade: 5, topic: '' });
  };

  // Edit Bank Metadata submit
  const handleEditMetaSubmit = async () => {
    if (!editingBankMeta || !editMetaForm.lessonTitle.trim()) return;
    soundService.playClick();
    const updated: QuestionBankLesson = {
      ...editingBankMeta,
      lessonTitle: editMetaForm.lessonTitle.trim(),
      subject: editMetaForm.subject.trim(),
      grade: editMetaForm.grade,
      topic: editMetaForm.topic.trim(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveBank(updated);
    setEditingBankMeta(null);
    if (viewingBank?.id === updated.id) {
      setViewingBank(updated);
    }
  };

  // Question Management inside Bank
  const handleOpenAddQuestion = () => {
    soundService.playClick();
    setQuestionType('multiple_choice');
    setQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      normalPoints: 10,
    });
    setIsAddingQuestion(true);
    setEditingQuestion(null);
  };

  const handleOpenEditQuestion = (q: Question) => {
    soundService.playClick();
    setQuestionType('multiple_choice');
    const opts = q.options || ['', '', '', ''];
    setQuestionForm({
      question: q.question,
      options: [opts[0] || '', opts[1] || '', opts[2] || '', opts[3] || ''],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      normalPoints: q.normalPoints || 10,
    });
    setEditingQuestion(q);
    setIsAddingQuestion(false);
  };

  const handleSaveQuestionSubmit = async () => {
    if (!viewingBank) return;
    if (!questionForm.question.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi.');
      return;
    }

    let finalOptions: [string, string, string, string] = [...questionForm.options];
    let finalCorrect = questionForm.correctAnswer;

    if (questionType === 'true_false') {
      finalOptions = ['Đúng', 'Sai', '', ''];
      if (finalCorrect > 1) finalCorrect = 0;
    } else if (questionType === 'short_answer' || questionType === 'fill_blank') {
      finalOptions = [questionForm.options[0] || 'Đáp án', '', '', ''];
      finalCorrect = 0;
    }

    soundService.playClick();

    let updatedQuestions: Question[];
    if (editingQuestion) {
      updatedQuestions = viewingBank.questions.map((q) =>
        q.id === editingQuestion.id
          ? {
              ...q,
              question: questionForm.question.trim(),
              options: finalOptions,
              correctAnswer: finalCorrect,
              explanation: questionForm.explanation.trim(),
              normalPoints: questionForm.normalPoints,
            }
          : q
      );
    } else {
      const newQ: Question = {
        id: Date.now(),
        lessonId: viewingBank.id,
        question: questionForm.question.trim(),
        options: finalOptions,
        correctAnswer: finalCorrect,
        explanation: questionForm.explanation.trim(),
        normalPoints: questionForm.normalPoints,
        stealPoints: Math.round(questionForm.normalPoints / 2),
        grade: viewingBank.grade,
      };
      updatedQuestions = [...viewingBank.questions, newQ];
    }

    const updatedBank: QuestionBankLesson = {
      ...viewingBank,
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    };

    await onSaveBank(updatedBank);
    setViewingBank(updatedBank);
    setIsAddingQuestion(false);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (!viewingBank) return;
    soundService.playClick();
    const updatedQuestions = viewingBank.questions.filter((q) => q.id !== qId);
    const updatedBank: QuestionBankLesson = {
      ...viewingBank,
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    };
    await onSaveBank(updatedBank);
    setViewingBank(updatedBank);
  };

  const handleDuplicateQuestion = async (q: Question) => {
    if (!viewingBank) return;
    soundService.playClick();
    const newQ: Question = {
      ...q,
      id: Date.now() + Math.floor(Math.random() * 1000),
      question: `${q.question} (Bản sao)`,
    };
    const updatedQuestions = [...viewingBank.questions, newQ];
    const updatedBank: QuestionBankLesson = {
      ...viewingBank,
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    };
    await onSaveBank(updatedBank);
    setViewingBank(updatedBank);
  };

  const handleMoveQuestion = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!viewingBank) return;
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= viewingBank.questions.length) return;

    soundService.playClick();
    const list = [...viewingBank.questions];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const updatedBank: QuestionBankLesson = {
      ...viewingBank,
      questions: list,
      updatedAt: new Date().toISOString(),
    };
    await onSaveBank(updatedBank);
    setViewingBank(updatedBank);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            KHO BỘ CÂU HỎI (QUESTION BANKS)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý, chỉnh sửa, nhân bản và tải mẫu câu hỏi chuẩn 18 cột dùng chung cho cả 6 trò chơi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sample Download Buttons (Requirement 6) */}
          <button
            type="button"
            onClick={handleDownloadCsvSample}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>📄 TẢI MẪU CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadExcelSample}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>📊 TẢI MẪU EXCEL</span>
          </button>

          {/* Import CSV / Excel Button (Requirement 5) */}
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onOpenImportModal();
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>NHẬP CSV / EXCEL</span>
          </button>

          {/* Create New Bank */}
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              setShowCreateModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>TẠO BỘ MỚI</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên bộ câu hỏi, chủ đề, môn học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 w-full sm:w-auto overflow-x-auto">
          {['ALL', '1', '2', '3', '4', '5'].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                soundService.playClick();
                setSelectedGrade(g);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedGrade === g
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {g === 'ALL' ? 'Tất cả khối' : `Lớp ${g}`}
            </button>
          ))}
        </div>
      </div>

      {/* Question Banks Grid (Requirement 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBanks.map((bank) => {
          const isEnabled = bank.enabled !== false;
          const questionsCount = bank.questions?.length || 0;
          const updatedDate = bank.updatedAt
            ? new Date(bank.updatedAt).toLocaleDateString('vi-VN')
            : 'Mặc định';

          return (
            <div
              key={bank.id}
              className={`bg-slate-900 border rounded-3xl p-5 flex flex-col justify-between transition-all group ${
                isEnabled
                  ? 'border-slate-800 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5'
                  : 'border-slate-800/60 opacity-60 bg-slate-950'
              }`}
            >
              <div className="space-y-3">
                {/* Header tags */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                      {bank.subject || 'Tin học'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                      Lớp {bank.grade || 5}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isEnabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {isEnabled ? '● Đang kích hoạt' : '○ Đã vô hiệu'}
                  </span>
                </div>

                {/* Bank Name & Topic */}
                <div>
                  <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {bank.lessonTitle}
                  </h3>
                  {bank.topic && (
                    <p className="text-xs font-semibold text-slate-400 mt-0.5 line-clamp-1">
                      Chủ đề: {bank.topic}
                    </p>
                  )}
                </div>

                {/* Metrics */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Số câu: <strong className="text-white">{questionsCount} câu</strong></span>
                  <span>Cập nhật: <strong className="text-slate-300">{updatedDate}</strong></span>
                </div>
              </div>

              {/* Action Buttons (Requirement 4) */}
              <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      setViewingBank(bank);
                    }}
                    className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl text-xs font-bold border border-purple-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>XEM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      setEditingBankMeta(bank);
                      setEditMetaForm({
                        lessonTitle: bank.lessonTitle,
                        subject: bank.subject || 'Tin học',
                        grade: bank.grade || 5,
                        topic: bank.topic || '',
                      });
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>SỬA TÊN</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  {/* Vô hiệu hóa / Kích hoạt */}
                  <button
                    type="button"
                    onClick={() => handleToggleBank(bank)}
                    className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold border border-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-all"
                    title={isEnabled ? 'Bấm để vô hiệu hóa' : 'Bấm để kích hoạt'}
                  >
                    {isEnabled ? <ToggleRight className="w-3.5 h-3.5 text-emerald-400" /> : <ToggleLeft className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{isEnabled ? 'TẮT' : 'BẬT'}</span>
                  </button>

                  {/* Nhân bản */}
                  <button
                    type="button"
                    onClick={() => handleDuplicateBank(bank)}
                    className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold border border-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    <span>NHÂN BẢN</span>
                  </button>

                  {/* Xuất file (Requirement 7) */}
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      QuestionBankExporter.exportToXlsx(bank, bank.questions || []);
                    }}
                    className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold border border-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-all"
                    title="Xuất file XLSX chuẩn"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>XUẤT FILE</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: VIEW & EDIT QUESTIONS IN BANK (Requirement 8) */}
      {viewingBank && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {viewingBank.lessonTitle}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Môn: {viewingBank.subject} • Lớp {viewingBank.grade} • {viewingBank.questions.length} câu hỏi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Export from Modal */}
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    QuestionBankExporter.exportToCsv(viewingBank, viewingBank.questions);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-cyan-400" />
                  <span>XUẤT CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    QuestionBankExporter.exportToXlsx(viewingBank, viewingBank.questions);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>XUẤT EXCEL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingBank(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Question List & Editor */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Question Editor Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                  Danh sách câu hỏi trong bộ ({viewingBank.questions.length})
                </span>

                <button
                  type="button"
                  onClick={handleOpenAddQuestion}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>THÊM CÂU HỎI MỚI</span>
                </button>
              </div>

              {/* Add / Edit Question Form Panel */}
              {(isAddingQuestion || editingQuestion) && (
                <div className="bg-slate-950 border border-purple-500/40 p-5 rounded-2xl space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-black text-purple-400 uppercase">
                      {editingQuestion ? '✏️ CHỈNH SỬA CÂU HỎI' : '➕ THÊM CÂU HỎI MỚI'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingQuestion(false);
                        setEditingQuestion(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Hủy bỏ
                    </button>
                  </div>

                  {/* Question Type Selection */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">Loại câu:</span>
                    <div className="flex gap-1.5">
                      {[
                        { id: 'multiple_choice', label: 'Trắc nghiệm (4 lựa chọn)' },
                        { id: 'true_false', label: 'Đúng / Sai' },
                        { id: 'short_answer', label: 'Trả lời ngắn' },
                        { id: 'fill_blank', label: 'Điền khuyết' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setQuestionType(t.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            questionType === t.id
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Nội dung câu hỏi:</label>
                    <textarea
                      rows={2}
                      value={questionForm.question}
                      onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                      placeholder="Nhập câu hỏi tại đây..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Options Input */}
                  {questionType === 'multiple_choice' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => (
                        <div key={letter} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-300">Phương án {letter}:</span>
                            <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-400">
                              <input
                                type="radio"
                                name="correctChoice"
                                checked={questionForm.correctAnswer === idx}
                                onChange={() => setQuestionForm({ ...questionForm, correctAnswer: idx })}
                              />
                              <span className={questionForm.correctAnswer === idx ? 'text-emerald-400 font-bold' : ''}>
                                Đáp án đúng
                              </span>
                            </label>
                          </div>
                          <input
                            type="text"
                            value={questionForm.options[idx]}
                            onChange={(e) => {
                              const opts: [string, string, string, string] = [...questionForm.options];
                              opts[idx] = e.target.value;
                              setQuestionForm({ ...questionForm, options: opts });
                            }}
                            placeholder={`Nội dung phương án ${letter}...`}
                            className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none ${
                              questionForm.correctAnswer === idx
                                ? 'border-emerald-500/60 bg-emerald-950/20'
                                : 'border-slate-700'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {questionType === 'true_false' && (
                    <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-xs font-bold text-slate-300">Đáp án đúng:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-200">
                        <input
                          type="radio"
                          name="tfChoice"
                          checked={questionForm.correctAnswer === 0}
                          onChange={() => setQuestionForm({ ...questionForm, correctAnswer: 0 })}
                        />
                        <span>Đúng (A)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-200">
                        <input
                          type="radio"
                          name="tfChoice"
                          checked={questionForm.correctAnswer === 1}
                          onChange={() => setQuestionForm({ ...questionForm, correctAnswer: 1 })}
                        />
                        <span>Sai (B)</span>
                      </label>
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Giải thích / Ghi chú (tùy chọn):</label>
                    <input
                      type="text"
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      placeholder="Giải thích ngắn khi học sinh trả lời xong..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingQuestion(false);
                        setEditingQuestion(null);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveQuestionSubmit}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>LƯU CÂU HỎI</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Questions List with reorder and actions (Requirement 8) */}
              {viewingBank.questions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Chưa có câu hỏi nào trong bộ này.</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Bấm "Thêm câu hỏi mới" hoặc dùng tính năng Nhập CSV / Excel.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {viewingBank.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 bg-slate-950 border border-slate-800/90 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-bold text-white leading-relaxed">
                            {q.question}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            {q.options?.map((opt, oIdx) => (
                              <span
                                key={oIdx}
                                className={`px-2 py-0.5 rounded-md ${
                                  oIdx === q.correctAnswer
                                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                                    : 'bg-slate-900 text-slate-400'
                                }`}
                              >
                                {['A', 'B', 'C', 'D'][oIdx]}: {opt}
                              </span>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="text-[10px] text-slate-500 italic">
                              Ghi chú: {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Reorder and Edit Actions (Requirement 8) */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveQuestion(idx, 'UP')}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 rounded-lg cursor-pointer transition-all"
                          title="Chuyển lên trên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === viewingBank.questions.length - 1}
                          onClick={() => handleMoveQuestion(idx, 'DOWN')}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 rounded-lg cursor-pointer transition-all"
                          title="Chuyển xuống dưới"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(q)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-lg cursor-pointer transition-all"
                          title="Nhân bản câu này"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(q)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-purple-400 rounded-lg cursor-pointer transition-all"
                          title="Sửa câu này"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-rose-400 rounded-lg cursor-pointer transition-all"
                          title="Xóa câu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW BANK */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                TẠO BỘ CÂU HỎI MỚI
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Tên bộ câu hỏi:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tin học 5 - Chương 1: Phần cứng máy tính"
                  value={newBankForm.lessonTitle}
                  onChange={(e) => setNewBankForm({ ...newBankForm, lessonTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Môn học:</label>
                  <input
                    type="text"
                    value={newBankForm.subject}
                    onChange={(e) => setNewBankForm({ ...newBankForm, subject: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Khối lớp:</label>
                  <select
                    value={newBankForm.grade}
                    onChange={(e) => setNewBankForm({ ...newBankForm, grade: Number(e.target.value) as GradeLevel })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>Lớp {g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Chủ đề / Chuyên đề:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lập trình Scratch, An toàn thông tin..."
                  value={newBankForm.topic}
                  onChange={(e) => setNewBankForm({ ...newBankForm, topic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateBankSubmit}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                Tạo bộ câu hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BANK METADATA */}
      {editingBankMeta && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                CHỈNH SỬA THÔNG TIN BỘ CÂU HỎI
              </h3>
              <button
                type="button"
                onClick={() => setEditingBankMeta(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Tên bộ câu hỏi:</label>
                <input
                  type="text"
                  value={editMetaForm.lessonTitle}
                  onChange={(e) => setEditMetaForm({ ...editMetaForm, lessonTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Môn học:</label>
                  <input
                    type="text"
                    value={editMetaForm.subject}
                    onChange={(e) => setEditMetaForm({ ...editMetaForm, subject: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Khối lớp:</label>
                  <select
                    value={editMetaForm.grade}
                    onChange={(e) => setEditMetaForm({ ...editMetaForm, grade: Number(e.target.value) as GradeLevel })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>Lớp {g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Chủ đề:</label>
                <input
                  type="text"
                  value={editMetaForm.topic}
                  onChange={(e) => setEditMetaForm({ ...editMetaForm, topic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingBankMeta(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleEditMetaSubmit}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
