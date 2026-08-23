import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, ArrowRight, Zap, Timer } from 'lucide-react';
import { GameSession, TeamId } from '../types';
import { soundService } from '../services/soundService';

interface AnswerResultScreenProps {
  session: GameSession;
  answeringTeam: TeamId;
  selectedAnswerIndex: number;
  isCorrect: boolean;
  onProceedToNext: () => void;
  onProceedToSteal: () => void;
}

export const AnswerResultScreen: React.FC<AnswerResultScreenProps> = ({
  session,
  answeringTeam,
  selectedAnswerIndex,
  isCorrect,
  onProceedToNext,
  onProceedToSteal,
}) => {
  const currentQ = session.questions[session.currentQuestionIndex];
  const isBlue = answeringTeam === 'blue';
  const teamName = isBlue ? session.blueTeamName : session.orangeTeamName;
  const otherTeamName = isBlue ? session.orangeTeamName : session.blueTeamName;
  const isLastQuestion = session.currentQuestionIndex >= session.questions.length - 1;
  const points = currentQ?.isSpecial ? 20 : currentQ?.normalPoints || 10;
  const isTimeout = selectedAnswerIndex === -1;

  useEffect(() => {
    if (isCorrect) {
      soundService.playCorrect();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: isBlue ? ['#00E5FF', '#0070F3', '#38BDF8'] : ['#FF6B00', '#FFA500', '#F59E0B'],
      });
    } else if (!isTimeout) {
      soundService.playWrong();
    }
  }, [isCorrect, isBlue, isTimeout]);

  if (!currentQ) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        className={`w-full p-6 md:p-8 rounded-3xl border-2 backdrop-blur-xl shadow-2xl text-center space-y-6 ${
          isCorrect
            ? 'bg-slate-900/95 border-emerald-500/70 shadow-emerald-950/50'
            : isTimeout
            ? 'bg-slate-900/95 border-amber-500/70 shadow-amber-950/50'
            : 'bg-slate-900/95 border-rose-500/70 shadow-rose-950/50'
        }`}
      >
        {/* Result Icon & Snapshot */}
        <div className="flex items-center justify-center gap-4">
          {session.winnerSnapshotUrl && (
            <div className="w-20 h-16 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-lg hidden sm:block">
              <img
                src={session.winnerSnapshotUrl}
                alt="Race Moment"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {isCorrect ? (
            <div className="w-20 h-20 rounded-full bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/30 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          ) : isTimeout ? (
            <div className="w-20 h-20 rounded-full bg-amber-950 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/30 animate-pulse">
              <Timer className="w-12 h-12" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-rose-950 border-2 border-rose-400 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/30">
              <XCircle className="w-12 h-12" />
            </div>
          )}
        </div>

        {/* Title & Score Announcement */}
        <div className="space-y-2">
          <h2
            className={`text-3xl md:text-5xl font-black uppercase tracking-tight ${
              isCorrect ? 'text-emerald-400' : isTimeout ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {isCorrect
              ? '🎉 CHÍNH XÁC!'
              : isTimeout
              ? '⏰ HẾT THỜI GIAN 15 GIÂY!'
              : '❌ CHƯA CHÍNH XÁC!'}
          </h2>

          <p className="text-xl md:text-2xl font-bold text-white">
            <span className={isBlue ? 'text-cyan-300' : 'text-amber-300'}>{teamName}</span>{' '}
            {isCorrect ? (
              <span>ghi thêm <strong className="text-emerald-400 font-black">+{points} ĐIỂM</strong></span>
            ) : isTimeout ? (
              <span>đã hết 15 giây suy nghĩ</span>
            ) : (
              <span>chưa ghi được điểm</span>
            )}
          </p>
        </div>

        {/* Question & Chosen Answer Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 md:p-5 text-left space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {currentQ.question}
          </p>

          <div
            className={`p-3 rounded-xl border font-bold text-sm md:text-base flex items-center gap-3 ${
              isCorrect
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : isTimeout
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
            }`}
          >
            <span>Trạng thái:</span>
            <span>
              {isTimeout
                ? 'Không đưa ra đáp án trong thời gian 15s quy định'
                : currentQ.options[selectedAnswerIndex]}
            </span>
          </div>

          {isCorrect && currentQ.explanation && (
            <div className="text-xs md:text-sm text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-slate-700/60">
              <strong className="text-cyan-400">💡 Giải thích: </strong>
              {currentQ.explanation}
            </div>
          )}
        </div>

        {/* Next Step Guidance (Transfer turn to other team) */}
        {!isCorrect && (
          <div className="bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-orange-500/50 rounded-2xl p-4 text-amber-200 text-sm md:text-base font-bold flex items-center justify-center gap-2 animate-pulse">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>
              ⚡ CHUYỂN LƯỢT CƯỚP ĐIỂM CHO: <span className="uppercase text-white font-black">{otherTeamName}</span>!
            </span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex justify-center">
          {isCorrect ? (
            <button
              onClick={() => {
                soundService.playClick();
                onProceedToNext();
              }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-base md:text-lg py-3.5 px-8 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center gap-3 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider"
            >
              <span>{isLastQuestion ? '🏆 XEM KẾT QUẢ CHUNG CUỘC' : 'SANG CÂU TIẾP THEO'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => {
                soundService.playClick();
                onProceedToSteal();
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-base md:text-lg py-3.5 px-8 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center gap-3 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider"
            >
              <span>⚡ BƯỚC VÀO VÒNG CƯỚP ĐIỂM (15s)</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
