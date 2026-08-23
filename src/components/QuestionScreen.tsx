import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, HelpCircle, Timer, AlertCircle } from 'lucide-react';
import { GameSession, GameSettings, TeamId } from '../types';
import { soundService } from '../services/soundService';

interface QuestionScreenProps {
  session: GameSession;
  settings: GameSettings;
  activeTeam: TeamId;
  onSelectAnswer: (selectedIndex: number) => void;
  onTimeout: () => void;
}

export const QuestionScreen: React.FC<QuestionScreenProps> = ({
  session,
  settings,
  activeTeam,
  onSelectAnswer,
  onTimeout,
}) => {
  const currentQ = session.questions[session.currentQuestionIndex];
  const isBlue = activeTeam === 'blue';
  const teamName = isBlue ? session.blueTeamName : session.orangeTeamName;
  const currentQNum = session.currentQuestionIndex + 1;
  const points = currentQ?.isSpecial ? 20 : currentQ?.normalPoints || 10;
  const timeLimit = settings.questionTimeLimitSeconds || 15;

  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 15-second Countdown timer loop
  useEffect(() => {
    setTimeLeft(timeLimit);
    setHasAnswered(false);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        const next = prev - 1;
        // Sound urgency for last 5 seconds
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

  // Handle timeout when timeLeft hits 0
  useEffect(() => {
    if (timeLeft === 0 && !hasAnswered) {
      setHasAnswered(true);
      soundService.playTimeoutBuzzer();
      onTimeout();
    }
  }, [timeLeft, hasAnswered, onTimeout]);

  // Keyboard shortcuts 1, 2, 3, 4 for choices A, B, C, D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasAnswered || timeLeft === 0) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        setHasAnswered(true);
        if (timerRef.current) clearInterval(timerRef.current);
        soundService.playClick();
        onSelectAnswer(idx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectAnswer, hasAnswered, timeLeft]);

  const handleChoiceClick = (idx: number) => {
    if (hasAnswered || timeLeft === 0) return;
    setHasAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);
    soundService.playClick();
    onSelectAnswer(idx);
  };

  if (!currentQ) return null;

  const optionLabels = ['A', 'B', 'C', 'D'];
  const progressPercent = Math.max(0, (timeLeft / timeLimit) * 100);
  const isUrgent = timeLeft <= 5;
  const isCritical = timeLeft <= 3;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 flex flex-col justify-center min-h-[calc(100vh-100px)]">
      {/* Answering Team Header Banner */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full rounded-2xl p-4 md:p-5 mb-3 flex flex-col md:flex-row items-center justify-between gap-3 border-2 backdrop-blur-md shadow-xl ${
          isBlue
            ? 'bg-gradient-to-r from-cyan-950/90 to-blue-950/80 border-cyan-400 shadow-cyan-950/50'
            : 'bg-gradient-to-r from-orange-950/90 to-amber-950/80 border-orange-400 shadow-orange-950/50'
        }`}
      >
        <div className="flex items-center gap-3">
          {session.winnerSnapshotUrl && (
            <div className="w-14 h-10 rounded-xl overflow-hidden border border-slate-700 shadow shrink-0 hidden sm:block">
              <img
                src={session.winnerSnapshotUrl}
                alt="Race Winner"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <span className="text-2xl md:text-3xl">{isBlue ? '🔵' : '🟠'}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2
                className={`text-xl md:text-3xl font-black uppercase tracking-tight ${
                  isBlue ? 'text-cyan-300' : 'text-amber-300'
                }`}
              >
                {teamName}
              </h2>
              <span className="bg-slate-900/80 text-white text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-slate-700">
                ĐANG TRẢ LỜI
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 font-medium">
              Giành quyền bằng Camera Race • Trả lời đúng nhận ngay +{points} điểm
            </p>
          </div>
        </div>

        {/* 15s Countdown Clock & Round Info */}
        <div className="flex items-center gap-3">
          {/* Animated 15s Timer Pill */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 font-mono font-black text-base md:text-lg shadow-lg transition-all ${
              isCritical
                ? 'bg-rose-950/95 border-rose-500 text-rose-300 animate-bounce shadow-rose-950/80'
                : isUrgent
                ? 'bg-amber-950/90 border-amber-400 text-amber-300 animate-pulse shadow-amber-950/60'
                : 'bg-slate-900/90 border-cyan-400/80 text-cyan-300'
            }`}
          >
            <Timer
              className={`w-5 h-5 ${
                isCritical ? 'text-rose-400 animate-spin' : isUrgent ? 'text-amber-400' : 'text-cyan-400'
              }`}
            />
            <span>{timeLeft}s</span>
          </div>

          {currentQ.isSpecial && (
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/60 px-3 py-1.5 rounded-xl font-black text-xs animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>CÂU ĐẶC BIỆT +20</span>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-700 text-cyan-400 px-3 py-2 rounded-xl font-mono font-black text-sm">
            CÂU {currentQNum}/{session.questions.length}
          </div>
        </div>
      </motion.div>

      {/* Visual Timer Progress Bar */}
      <div className="w-full bg-slate-950/90 border border-slate-800 rounded-full h-3 mb-4 overflow-hidden shadow-inner relative">
        <motion.div
          className={`h-full transition-all duration-1000 ease-linear ${
            isCritical
              ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-400'
              : isUrgent
              ? 'bg-gradient-to-r from-amber-500 to-orange-400'
              : isBlue
              ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500'
              : 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Question Box */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6"
      >
        {/* Category Pill */}
        <div className="flex items-center justify-between">
          <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            {currentQ.category || 'Tin học lớp 5'}
          </span>
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            {isUrgent ? (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Sắp hết giờ (15s)! Hãy chọn nhanh!
              </span>
            ) : (
              'Bấm phím 1 - 4 hoặc click đáp án'
            )}
          </span>
        </div>

        {/* Question Text */}
        <h3 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-snug tracking-tight">
          {currentQ.question}
        </h3>

        {/* 4 Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {currentQ.options.map((opt, idx) => (
            <motion.button
              key={idx}
              disabled={hasAnswered || timeLeft === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleChoiceClick(idx)}
              className={`p-4 md:p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all cursor-pointer shadow-lg group ${
                isBlue
                  ? 'bg-slate-950/70 hover:bg-cyan-950/50 border-slate-800 hover:border-cyan-400 text-slate-100 hover:text-white shadow-cyan-950/30'
                  : 'bg-slate-950/70 hover:bg-orange-950/50 border-slate-800 hover:border-orange-400 text-slate-100 hover:text-white shadow-orange-950/30'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-base shrink-0 border transition-colors ${
                  isBlue
                    ? 'bg-cyan-950 text-cyan-400 border-cyan-500/40 group-hover:bg-cyan-500 group-hover:text-slate-950'
                    : 'bg-orange-950 text-amber-400 border-orange-500/40 group-hover:bg-orange-500 group-hover:text-slate-950'
                }`}
              >
                {optionLabels[idx]}
              </div>

              <div className="text-base md:text-lg font-bold leading-relaxed pt-0.5">
                {opt}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
