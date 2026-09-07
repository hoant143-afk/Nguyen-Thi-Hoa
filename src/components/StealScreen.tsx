import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Zap, ArrowRight, CheckCircle2, XCircle, Timer, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameSession, GameSettings, TeamId } from '../types';
import { soundService } from '../services/soundService';

interface StealScreenProps {
  session: GameSession;
  settings: GameSettings;
  stealingTeam: TeamId;
  previousWrongIndex: number;
  onStealSubmit: (selectedChoiceIndex: number) => void;
  onProceedToNext?: () => void;
  onProceedNext?: () => void;
}

export const StealScreen: React.FC<StealScreenProps> = ({
  session,
  settings,
  stealingTeam,
  previousWrongIndex,
  onStealSubmit,
  onProceedToNext,
  onProceedNext,
}) => {
  const handleProceedNext = onProceedToNext || onProceedNext || (() => {});
  const currentQ = session.questions[session.currentQuestionIndex];
  const isBlue = stealingTeam === 'blue';
  const teamName = isBlue ? session.blueTeamName : session.orangeTeamName;
  const isLastQuestion = session.currentQuestionIndex >= session.questions.length - 1;
  const stealPoints = currentQ?.isSpecial ? 10 : currentQ?.stealPoints || 5;
  const timeLimit = settings.questionTimeLimitSeconds || 15;

  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    soundService.playStealWhoosh();
  }, []);

  // 15s Steal Countdown Timer
  useEffect(() => {
    setTimeLeft(timeLimit);
    setHasSubmitted(false);
    setIsTimedOut(false);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        const next = prev - 1;
        if (next <= 5 && next > 0) {
          soundService.playUrgentTick();
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.currentQuestionIndex, timeLimit]);

  // Handle Steal Timeout
  useEffect(() => {
    if (timeLeft === 0 && !hasSubmitted) {
      setHasSubmitted(true);
      setIsTimedOut(true);
      soundService.playTimeoutBuzzer();
      onStealSubmit(-1); // -1 signifies timeout
    }
  }, [timeLeft, hasSubmitted, onStealSubmit]);

  if (!currentQ) return null;

  const optionLabels = ['A', 'B', 'C', 'D'];
  const progressPercent = Math.max(0, (timeLeft / timeLimit) * 100);
  const isUrgent = timeLeft <= 5;
  const isCritical = timeLeft <= 3;

  const handleSelect = (idx: number) => {
    if (hasSubmitted || idx === previousWrongIndex || timeLeft === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    soundService.playClick();
    setSelectedAnswer(idx);
    setHasSubmitted(true);

    const isCorrect = idx === currentQ.correctAnswer;
    if (isCorrect) {
      soundService.playCorrect();
      confetti({
        particleCount: 70,
        spread: 60,
        colors: isBlue ? ['#00E5FF', '#38BDF8'] : ['#FF6B00', '#F59E0B'],
      });
    } else {
      soundService.playWrong();
    }

    onStealSubmit(idx);
  };

  const isCorrect = selectedAnswer === currentQ.correctAnswer;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 flex flex-col justify-center min-h-[calc(100vh-100px)]">
      {/* Steal Alert Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full rounded-2xl p-4 md:p-5 mb-3 flex flex-col md:flex-row items-center justify-between gap-3 border-2 backdrop-blur-md shadow-xl ${
          isBlue
            ? 'bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border-cyan-400 shadow-cyan-950/60'
            : 'bg-gradient-to-r from-orange-950/90 to-amber-950/90 border-orange-400 shadow-orange-950/60'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-300 animate-pulse">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl md:text-2xl font-black text-amber-400 uppercase">
                ⚡ CƠ HỘI CƯỚP ĐIỂM!
              </span>
              <span className="text-xs bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full font-bold">
                +{stealPoints} ĐIỂM
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-200">
              Đến lượt đội <strong className={isBlue ? 'text-cyan-300' : 'text-amber-300'}>{teamName}</strong> hội ý và đưa ra đáp án chính xác trong 15s
            </p>
          </div>
        </div>

        {/* Timer & Round Status */}
        <div className="flex items-center gap-3">
          {!hasSubmitted && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 font-mono font-black text-base md:text-lg shadow-lg transition-all ${
                isCritical
                  ? 'bg-rose-950/95 border-rose-500 text-rose-300 animate-bounce shadow-rose-950/80'
                  : isUrgent
                  ? 'bg-amber-950/90 border-amber-400 text-amber-300 animate-pulse shadow-amber-950/60'
                  : 'bg-slate-900/90 border-amber-400/80 text-amber-300'
              }`}
            >
              <Timer
                className={`w-5 h-5 ${
                  isCritical ? 'text-rose-400 animate-spin' : isUrgent ? 'text-amber-400' : 'text-amber-400'
                }`}
              />
              <span>{timeLeft}s</span>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-700 text-cyan-400 px-3 py-2 rounded-xl font-mono font-black text-sm">
            CÂU {session.currentQuestionIndex + 1}/{session.questions.length}
          </div>
        </div>
      </motion.div>

      {/* Visual Timer Progress Bar */}
      {!hasSubmitted && (
        <div className="w-full bg-slate-950/90 border border-slate-800 rounded-full h-3 mb-4 overflow-hidden shadow-inner relative">
          <motion.div
            className={`h-full transition-all duration-1000 ease-linear ${
              isCritical
                ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-400'
                : isUrgent
                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Main Question & Choices */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6"
      >
        {/* Question Text */}
        <h3 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-white leading-snug">
          {currentQ.question}
        </h3>

        {/* Choices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {currentQ.options.map((opt, idx) => {
            const isPrevWrong = idx === previousWrongIndex;
            const isSelected = selectedAnswer === idx;
            const isActuallyCorrect = idx === currentQ.correctAnswer;

            let cardStyle = 'bg-slate-950/70 border-slate-800 text-slate-100 hover:border-amber-400';
            if (isPrevWrong) {
              cardStyle = 'bg-slate-950/40 border-slate-800/40 text-slate-600 cursor-not-allowed opacity-50 line-through';
            } else if (hasSubmitted) {
              if (isActuallyCorrect) {
                cardStyle = 'bg-emerald-950/60 border-emerald-400 text-emerald-200 font-black shadow-lg shadow-emerald-950/50';
              } else if (isSelected) {
                cardStyle = 'bg-rose-950/60 border-rose-400 text-rose-200 font-black shadow-lg shadow-rose-950/50';
              }
            }

            return (
              <button
                key={idx}
                disabled={hasSubmitted || isPrevWrong || timeLeft === 0}
                onClick={() => handleSelect(idx)}
                className={`p-4 md:p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all ${
                  !hasSubmitted && !isPrevWrong ? 'cursor-pointer hover:scale-[1.01]' : ''
                } ${cardStyle}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-base shrink-0 border ${
                    isPrevWrong
                      ? 'bg-slate-900 text-slate-600 border-slate-800'
                      : hasSubmitted && isActuallyCorrect
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                  }`}
                >
                  {optionLabels[idx]}
                </div>

                <div className="text-base md:text-lg font-bold leading-relaxed pt-0.5">
                  {opt}
                  {isPrevWrong && (
                    <span className="block text-xs text-rose-400/80 font-normal no-underline mt-1">
                      (Đội bạn đã chọn sai)
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Steal Outcome Banner & Explanation */}
        {hasSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pt-4 border-t border-slate-800"
          >
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                isCorrect
                  ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-400 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {isCorrect ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
                )}
                <div>
                  <h4 className="font-black text-lg uppercase">
                    {isCorrect
                      ? `⚡ CƯỚP ĐIỂM THÀNH CÔNG! (+${stealPoints} ĐIỂM)`
                      : isTimedOut
                      ? '⏰ HẾT THỜI GIAN 15 GIÂY! CƯỚP ĐIỂM KHÔNG THÀNH CÔNG'
                      : '❌ RẤT TIẾC! CƯỚP ĐIỂM KHÔNG THÀNH CÔNG'}
                  </h4>
                  <p className="text-xs md:text-sm opacity-90">
                    Đáp án chính xác: <strong className="text-white">{optionLabels[currentQ.correctAnswer]}. {currentQ.options[currentQ.correctAnswer]}</strong>
                  </p>
                </div>
              </div>
            </div>

            {currentQ.explanation && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-slate-300 text-xs md:text-sm">
                <strong className="text-cyan-400">💡 Giải thích chi tiết: </strong>
                {currentQ.explanation}
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button
                onClick={() => {
                  soundService.playClick();
                  handleProceedNext();
                }}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base md:text-lg py-3.5 px-8 rounded-2xl shadow-xl shadow-cyan-500/30 flex items-center gap-3 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider"
              >
                <span>{isLastQuestion ? '🏆 XEM KẾT QUẢ CHUNG CUỘC' : 'SANG CÂU TIẾP THEO'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
