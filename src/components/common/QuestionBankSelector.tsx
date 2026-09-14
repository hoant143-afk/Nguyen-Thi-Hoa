import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  GraduationCap,
  Check,
  Layers,
  Eye,
  Sparkles,
  X,
  ChevronRight,
  Search,
  Upload,
  RefreshCw,
  Database,
} from 'lucide-react';
import { GradeLevel, QuestionBankLesson, Question, QuestionBank } from '../../types';
import { QuestionBankRepository } from '../../repositories/questionBankRepository';
import {
  questionBanksRepository,
  refreshQuestionBanks,
} from '../../repositories/questionBanksRepository';
import {
  questionsRepository,
  refreshQuestions,
} from '../../repositories/questionsRepository';
import { soundService } from '../../services/soundService';
import { QuestionImportModal } from './QuestionImportModal';

interface QuestionBankSelectorProps {
  selectedLessonId: string;
  onSelectLesson: (lesson: QuestionBankLesson) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const GRADES: GradeLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const QuestionBankSelector: React.FC<QuestionBankSelectorProps> = ({
  selectedLessonId,
  onSelectLesson,
  onClose,
  isModal = false,
}) => {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [legacyLessons, setLegacyLessons] = useState<QuestionBankLesson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial grade
  const [activeGrade, setActiveGrade] = useState<GradeLevel>(5);
  const [activeSubject, setActiveSubject] = useState<string>('Tất cả môn');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewLesson, setPreviewLesson] = useState<QuestionBankLesson | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Load banks and synchronize with repositories (Requirement K)
  const loadBanksData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from new QuestionBanksRepository
      const bankList = await questionBanksRepository.list();
      setBanks(bankList);

      // 2. Fetch from legacy QuestionBankRepository
      const lessons = QuestionBankRepository.getLessons();
      setLegacyLessons(lessons);

      // Set initial grade from selected if possible
      const curr = lessons.find((l) => l.id === selectedLessonId);
      if (curr) {
        setActiveGrade(curr.grade);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách ngân hàng câu hỏi:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLessonId]);

  useEffect(() => {
    loadBanksData();
  }, [loadBanksData]);

  // Merge banks: prioritize questionBanksRepository, fallback to legacy
  const combinedLessons = useMemo(() => {
    const lessonMap = new Map<string, QuestionBankLesson>();

    // Put legacy lessons first
    legacyLessons.forEach((l) => {
      lessonMap.set(l.id, l);
    });

    // Merge or add from QuestionBanks
    banks.forEach((b) => {
      const existing = lessonMap.get(b.id);
      if (existing) {
        lessonMap.set(b.id, {
          ...existing,
          lessonTitle: b.name || existing.lessonTitle,
          grade: (b.grade as GradeLevel) || existing.grade,
          subject: b.subject || existing.subject,
          description: b.description !== undefined ? b.description : existing.description,
        });
      } else {
        lessonMap.set(b.id, {
          id: b.id,
          grade: (b.grade as GradeLevel) || 5,
          subject: b.subject,
          lessonNumber: 1,
          lessonTitle: b.name,
          description: b.description || '',
          questions: [],
        });
      }
    });

    return Array.from(lessonMap.values());
  }, [banks, legacyLessons]);

  // Available subjects for active grade
  const subjects = useMemo(() => {
    const subs = new Set<string>();
    combinedLessons
      .filter((l) => l.grade === activeGrade)
      .forEach((l) => {
        if (l.subject && l.subject.trim()) {
          subs.add(l.subject.trim());
        }
      });
    return ['Tất cả môn', ...Array.from(subs)];
  }, [combinedLessons, activeGrade]);

  const handleSelectGrade = (grade: GradeLevel) => {
    soundService.playClick();
    setActiveGrade(grade);
    setActiveSubject('Tất cả môn');
  };

  // Filter lessons based on grade, subject, query
  const filteredLessons = useMemo(() => {
    let list = combinedLessons.filter((l) => l.grade === activeGrade);

    if (activeSubject !== 'Tất cả môn') {
      list = list.filter((l) => l.subject.toLowerCase() === activeSubject.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.lessonTitle.toLowerCase().includes(q) ||
          l.subject.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [combinedLessons, activeGrade, activeSubject, searchQuery]);

  // Load questions for selected bank via questionsRepository.listByBank(bankId) (Requirement K)
  const handleChoose = async (lesson: QuestionBankLesson) => {
    soundService.playClick();
    try {
      let questions = await questionsRepository.listByBank(lesson.id);

      // Fallback to existing questions in lesson if repository list is empty
      if (questions.length === 0 && lesson.questions && lesson.questions.length > 0) {
        questions = lesson.questions;
        // Seed into questionsRepository so it's cached
        await questionsRepository.importBatch(lesson.id, questions, 'CREATE');
      }

      const fullLesson: QuestionBankLesson = {
        ...lesson,
        questions,
      };

      // Set selected in legacy repo for game engine
      QuestionBankRepository.setSelectedLessonId(lesson.id);
      QuestionBankRepository.saveLesson(fullLesson);

      onSelectLesson(fullLesson);
      if (onClose) onClose();
    } catch (err) {
      console.error('Lỗi khi nạp câu hỏi cho ngân hàng:', err);
      // Still allow selecting with current questions
      onSelectLesson(lesson);
      if (onClose) onClose();
    }
  };

  // Preview lesson questions
  const handleOpenPreview = async (lesson: QuestionBankLesson) => {
    soundService.playClick();
    setIsPreviewLoading(true);
    try {
      let questions = await questionsRepository.listByBank(lesson.id);
      if (questions.length === 0 && lesson.questions && lesson.questions.length > 0) {
        questions = lesson.questions;
      }
      setPreviewLesson({
        ...lesson,
        questions,
      });
    } catch (err) {
      setPreviewLesson(lesson);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 text-slate-100 ${isModal ? 'p-1' : ''}`}>
      {/* Header bar if modal */}
      {isModal && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>CHỌN BỘ CÂU HỎI THI ĐẤU</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  Khối 1 - 9
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Dữ liệu đồng bộ trực tiếp từ Ngân Hàng Câu Hỏi (Repository Persistence)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                setShowImportModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              title="Tải lên tệp CSV/Excel để tạo bài học mới ngay"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Nhập Tệp Mới</span>
            </button>

            {onClose && (
              <button
                onClick={() => {
                  soundService.playClick();
                  onClose();
                }}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. GRADE SELECTOR (KHỐI 1 ĐẾN 9) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-cyan-400" />
            <span>1. Chọn Khối Lớp (1 - 9):</span>
          </span>
          <span className="text-cyan-400 font-bold">Đang chọn: Khối {activeGrade}</span>
        </div>

        <div className="grid grid-cols-9 gap-1 sm:gap-2">
          {GRADES.map((g) => {
            const isSelected = activeGrade === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => handleSelectGrade(g)}
                className={`py-2 px-1 text-center rounded-xl font-black text-xs sm:text-sm cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/30 scale-105 z-10'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                }`}
              >
                <div className="text-[10px] sm:text-[11px] font-medium opacity-80 uppercase">Khối</div>
                <div className="text-base sm:text-lg font-black">{g}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SUBJECT SELECTOR (MÔN HỌC) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>2. Chọn Môn Học (Khối {activeGrade}):</span>
          </span>
          {/* Search bar */}
          <div className="relative w-40 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm bộ câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {subjects.map((sub) => {
            const isSelected = activeSubject.toLowerCase() === sub.toLowerCase();
            return (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setActiveSubject(sub);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. LESSON CARDS LIST */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>3. Ngân Hàng Câu Hỏi ({filteredLessons.length} bộ khả dụng):</span>
          </span>
          <span className="text-slate-400 text-[11px]">Bấm &quot;Chọn bài này&quot; để thi đấu</span>
        </div>

        {isLoading ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
            <p className="text-xs">Đang nạp danh sách ngân hàng câu hỏi từ Repository...</p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 space-y-2">
            <p className="text-sm">
              Chưa có bộ câu hỏi nào khớp với &quot;{activeSubject}&quot; của Khối {activeGrade}.
            </p>
            <p className="text-xs text-slate-500">
              Thầy cô có thể bấm nút <strong>&quot;+ Nhập Tệp Mới&quot;</strong> ở góc trên để nạp câu hỏi từ CSV/Excel.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredLessons.map((lesson) => {
              const isSelected = lesson.id === selectedLessonId;
              const bankObj = banks.find((b) => b.id === lesson.id);
              const questionCount =
                bankObj?.questionCount !== undefined
                  ? bankObj.questionCount
                  : lesson.questions?.length || 0;

              return (
                <div
                  key={lesson.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-950/60 via-slate-900 to-blue-950/40 border-cyan-400/80 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                      : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                          Khối {lesson.grade}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/40">
                          {lesson.subject}
                        </span>
                        {bankObj?.topic && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-500/40">
                            Chủ đề: {bankObj.topic}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          {questionCount} câu
                        </span>
                        {bankObj?.updatedAt && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Cập nhật: {new Date(bankObj.updatedAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Đang chọn</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug">
                      {lesson.lessonTitle}
                    </h4>

                    {lesson.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {lesson.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(lesson)}
                      className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors py-1 px-2 rounded-lg hover:bg-slate-800"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem {questionCount} câu hỏi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChoose(lesson)}
                      className={`text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/30'
                          : 'bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white border border-slate-700 hover:border-cyan-400'
                      }`}
                    >
                      <span>{isSelected ? 'Đã chọn' : 'Chọn bài này'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-3xl w-full rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Khối {previewLesson.grade} • {previewLesson.subject}
                </span>
                <h3 className="text-lg font-black text-white">
                  {previewLesson.lessonTitle}
                </h3>
              </div>
              <button
                onClick={() => setPreviewLesson(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {isPreviewLoading ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                  <p className="text-xs mt-2">Đang tải câu hỏi...</p>
                </div>
              ) : previewLesson.questions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Bài học này chưa có câu hỏi nào.
                </div>
              ) : (
                previewLesson.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-400">Câu {idx + 1}:</span>
                      <span className="text-[11px] text-slate-400">{q.normalPoints || 10} điểm</span>
                    </div>
                    <p className="text-white font-medium">{q.question}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2 rounded border ${
                            oIdx === q.correctAnswer
                              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-bold flex items-center justify-between'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span>
                            {String.fromCharCode(65 + oIdx)}. {opt}
                          </span>
                          {oIdx === q.correctAnswer && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-900/50 p-2 rounded">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Tổng cộng: <strong className="text-white">{previewLesson.questions.length}</strong> câu hỏi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewLesson(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleChoose(previewLesson);
                    setPreviewLesson(null);
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1 cursor-pointer"
                >
                  <span>Chọn bài này để thi đấu</span>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showImportModal && (
        <QuestionImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          currentQuestions={[]}
          initialGrade={activeGrade}
          initialSubject={activeSubject !== 'Tất cả môn' ? activeSubject : 'Tin học'}
          saveAsLesson={true}
          onImportLessonSuccess={async (newLesson) => {
            setShowImportModal(false);
            await loadBanksData();
            handleChoose(newLesson);
          }}
          onImportSuccess={async () => {
            await loadBanksData();
          }}
        />
      )}
    </div>
  );
};
