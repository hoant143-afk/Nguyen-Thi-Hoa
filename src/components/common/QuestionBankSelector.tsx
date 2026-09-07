import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { GradeLevel, QuestionBankLesson } from '../../types';
import { QuestionBankRepository } from '../../repositories/questionBankRepository';
import { soundService } from '../../services/soundService';

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
  // Determine initial grade from currently selected lesson or default to 5
  const initialLesson = useMemo(() => {
    return QuestionBankRepository.getLessonById(selectedLessonId) || QuestionBankRepository.getSelectedLesson();
  }, [selectedLessonId]);

  const [activeGrade, setActiveGrade] = useState<GradeLevel>(initialLesson ? initialLesson.grade : 5);
  const [activeSubject, setActiveSubject] = useState<string>('Tất cả môn');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewLesson, setPreviewLesson] = useState<QuestionBankLesson | null>(null);

  // Available subjects for active grade
  const subjects = useMemo(() => {
    const rawSubjects = QuestionBankRepository.getSubjectsByGrade(activeGrade);
    return ['Tất cả môn', ...rawSubjects];
  }, [activeGrade]);

  // Reset subject filter if current subject is not in new grade's subjects
  const handleSelectGrade = (grade: GradeLevel) => {
    soundService.playClick();
    setActiveGrade(grade);
    setActiveSubject('Tất cả môn');
  };

  // Filter lessons
  const filteredLessons = useMemo(() => {
    let list = QuestionBankRepository.getLessonsByGradeAndSubject(activeGrade, activeSubject);
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
  }, [activeGrade, activeSubject, searchQuery]);

  const handleChoose = (lesson: QuestionBankLesson) => {
    soundService.playClick();
    QuestionBankRepository.setSelectedLessonId(lesson.id);
    onSelectLesson(lesson);
    if (onClose) onClose();
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
                Chọn khối lớp, môn học và bài học để nạp vào câu hỏi ván đấu
              </p>
            </div>
          </div>

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
          {/* Search bar inside */}
          <div className="relative w-40 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm bài học..."
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
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>3. Danh sách Bài học ({filteredLessons.length} bài sẵn có):</span>
          </span>
          <span className="text-slate-400 text-[11px]">Bấm &quot;Chọn bài này&quot; để thi đấu</span>
        </div>

        {filteredLessons.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 space-y-2">
            <p className="text-sm">Chưa có bài học nào khớp với bộ lọc &quot;{activeSubject}&quot; của Khối {activeGrade}.</p>
            <p className="text-xs text-slate-500">Thầy cô có thể thêm bài học mới trong phần Cài đặt Quản lý ngân hàng câu hỏi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredLessons.map((lesson) => {
              const isSelected = lesson.id === selectedLessonId;
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
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          {lesson.questions.length} câu
                        </span>
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
                      onClick={() => setPreviewLesson(lesson)}
                      className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors py-1 px-2 rounded-lg hover:bg-slate-800"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem {lesson.questions.length} câu hỏi</span>
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    [Khối {previewLesson.grade} - {previewLesson.subject}] {previewLesson.lessonTitle}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Toàn bộ {previewLesson.questions.length} câu hỏi trắc nghiệm của bài học
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLesson(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions list */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {previewLesson.questions.map((q, idx) => (
                <div key={q.id || idx} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">
                      Câu {idx + 1}
                    </span>
                    {q.category && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {q.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white">{q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                          oIdx === q.correctAnswer
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-bold'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <span className="font-mono font-bold text-slate-300">
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-900/40 p-1.5 rounded border border-slate-800/50">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Tổng cộng: <strong className="text-white">{previewLesson.questions.length} câu</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewLesson(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleChoose(previewLesson);
                    setPreviewLesson(null);
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1"
                >
                  <span>Chọn bài này để thi đấu</span>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
