import React, { useEffect, useRef, useState } from 'react';
import { Clock, CheckCircle2, XCircle, Zap, Sparkles } from 'lucide-react';
import { Question } from '../../types';
import { HandTrackResult } from './types';
import { soundService } from '../../services/soundService';

interface FruitSlashQuestionViewProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  activeTeam: 'team1' | 'team2';
  team1Name: string;
  team2Name: string;
  isStealMode: boolean;
  timeLimit: number;
  activeHand?: HandTrackResult;
  isDoublePointsActive: boolean;
  onAnswerSelected: (selectedIndex: number) => void;
  onTimeExpired: () => void;
  selectedAnswerIndex: number | null;
  isAnswerSubmitted: boolean;
  showCorrectAnswer: boolean;
}

export const FruitSlashQuestionView: React.FC<FruitSlashQuestionViewProps> = ({
  question,
  questionNumber,
  totalQuestions,
  activeTeam,
  team1Name,
  team2Name,
  isStealMode,
  timeLimit,
  isDoublePointsActive,
  onAnswerSelected,
  onTimeExpired,
  selectedAnswerIndex,
  isAnswerSubmitted,
  showCorrectAnswer,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const answerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Synchronize timer
  useEffect(() => {
    setTimeLeft(timeLimit);
  }, [question.id, isStealMode, timeLimit]);

  useEffect(() => {
    if (isAnswerSubmitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeExpired();
          return 0;
        }
        if (prev <= 5) {
          soundService.playCountdownTick(prev);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswerSubmitted, onTimeExpired]);

  const activeTeamName = activeTeam === 'team1' ? team1Name : team2Name;
  const activeColor = activeTeam === 'team1' ? 'text-sky-400' : 'text-amber-400';
  const activeBorder = activeTeam === 'team1' ? 'border-sky-500' : 'border-amber-500';

  const optionLetters = ['A', 'B', 'C', 'D'];
  const optionColors = [
    { bg: 'from-blue-600/20 to-sky-600/10', border: 'border-blue-500/50', badge: 'bg-blue-500 text-white' },
    { bg: 'from-emerald-600/20 to-teal-600/10', border: 'border-emerald-500/50', badge: 'bg-emerald-500 text-white' },
    { bg: 'from-amber-600/20 to-yellow-600/10', border: 'border-amber-500/50', badge: 'bg-amber-500 text-white' },
    { bg: 'from-purple-600/20 to-fuchsia-600/10', border: 'border-purple-500/50', badge: 'bg-purple-500 text-white' },
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col justify-between p-4 md:p-6 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md select-none"
    >
      {/* Top Banner: Round and Timer */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Câu {questionNumber} / {totalQuestions}
          </span>

          {isStealMode ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold animate-pulse">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>LƯỢT CƯỚP ĐIỂM: {activeTeamName}</span>
            </div>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border ${activeBorder} ${activeColor} text-xs font-bold`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>QUYỀN TRẢ LỜI: {activeTeamName}</span>
            </div>
          )}

          {isDoublePointsActive && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-300 text-xs font-black animate-bounce">
              🌟 X2 ĐIỂM THƯỞNG!
            </span>
          )}
        </div>

        {/* Countdown Timer */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl font-mono text-xl font-black border transition-all ${
          timeLeft <= 5
            ? 'bg-rose-500/30 text-rose-300 border-rose-500 animate-pulse'
            : 'bg-slate-900 text-amber-300 border-amber-500/40'
        }`}>
          <Clock className={`w-5 h-5 ${timeLeft <= 5 ? 'text-rose-400' : 'text-amber-400'}`} />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Main Question Display */}
      <div className="my-auto py-4 text-center max-w-4xl mx-auto w-full">
        {question.category && (
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Chủ đề: {question.category}
          </p>
        )}
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white leading-snug tracking-tight">
          {question.question}
        </h2>
        <p className="text-xs sm:text-sm text-sky-300 font-medium mt-2">
          👉 {activeTeamName}: Bấm chọn đáp án hoặc bấm phím <span className="font-bold text-amber-300">1, 2, 3, 4</span> (hoặc <span className="font-bold text-amber-300">A, B, C, D</span>)
        </p>
      </div>

      {/* 4 Quadrant Answer Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-5xl mx-auto">
        {question.options.map((optionText, idx) => {
          const letter = optionLetters[idx] || `${idx + 1}`;
          const colStyle = optionColors[idx % optionColors.length];
          const isSelected = selectedAnswerIndex === idx;
          const isCorrect = idx === question.correctAnswer;

          let cardBorder = colStyle.border;
          let cardBg = `bg-gradient-to-r ${colStyle.bg}`;
          let textStyle = 'text-white';

          if (isAnswerSubmitted) {
            if (showCorrectAnswer && isCorrect) {
              cardBorder = 'border-emerald-500 shadow-lg shadow-emerald-500/30 scale-[1.02]';
              cardBg = 'bg-gradient-to-r from-emerald-600/50 to-teal-600/40';
            } else if (isSelected && !isCorrect) {
              cardBorder = 'border-rose-500 shadow-lg shadow-rose-500/30';
              cardBg = 'bg-gradient-to-r from-rose-600/40 to-pink-600/30';
              textStyle = 'text-rose-200 line-through';
            } else {
              cardBg = 'bg-slate-900/40 opacity-60';
              cardBorder = 'border-slate-800';
            }
          } else if (isSelected) {
            cardBorder = 'border-white shadow-xl scale-[1.02]';
            cardBg = 'bg-white/20';
          }

          return (
            <div
              key={idx}
              ref={(el) => {
                answerRefs.current[idx] = el;
              }}
              onClick={() => {
                if (!isAnswerSubmitted) {
                  soundService.playSlashWhoosh();
                  onAnswerSelected(idx);
                }
              }}
              className={`relative flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-150 active:scale-95 ${cardBg} ${cardBorder}`}
            >
              {/* Option Letter Badge */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow-md ${colStyle.badge}`}
              >
                {letter}
              </div>

              {/* Option Content Text */}
              <div className="flex-1 text-left">
                <span className={`text-base sm:text-lg md:text-xl font-bold leading-snug ${textStyle}`}>
                  {optionText}
                </span>
              </div>

              {/* Status Icons */}
              {isAnswerSubmitted && isCorrect && showCorrectAnswer && (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 animate-bounce" />
              )}
              {isAnswerSubmitted && isSelected && !isCorrect && (
                <XCircle className="w-8 h-8 text-rose-400 shrink-0 animate-shake" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
