import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundService } from '../services/soundService';
import { GameSession } from '../types';

interface CountdownScreenProps {
  session: GameSession;
  onCountdownComplete: (raceStartTimestamp: number) => void;
}

export const CountdownScreen: React.FC<CountdownScreenProps> = ({
  session,
  onCountdownComplete,
}) => {
  const [step, setStep] = useState<'3' | '2' | '1' | 'RUN'>('3');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentQNum = session.currentQuestionIndex + 1;

  useEffect(() => {
    // Step 3
    soundService.playCountdownTick(3);
    setStep('3');

    const t2 = setTimeout(() => {
      soundService.playCountdownTick(2);
      setStep('2');
    }, 1000);

    const t1 = setTimeout(() => {
      soundService.playCountdownTick(1);
      setStep('1');
    }, 2000);

    const tRun = setTimeout(() => {
      soundService.playRunHorn();
      setStep('RUN');
      const startTimestamp = performance.now();

      // Brief flash of RUNNN before releasing to camera
      const tDone = setTimeout(() => {
        onCountdownComplete(startTimestamp);
      }, 550);

      return () => clearTimeout(tDone);
    }, 3000);

    return () => {
      clearTimeout(t2);
      clearTimeout(t1);
      clearTimeout(tRun);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onCountdownComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/30 via-slate-950/80 to-slate-950" />

      {/* Top Question Info */}
      <div className="relative z-10 mb-8 text-center space-y-2">
        <span className="text-sm font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-4 py-1.5 rounded-full">
          CHUẨN BỊ TRANH QUYỀN • CÂU {currentQNum} / {session.questions.length}
        </span>
        <div className="flex items-center justify-center gap-6 text-slate-300 text-sm font-bold pt-2">
          <span className="text-cyan-300 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400" />
            {session.blueTeamName}
          </span>
          <span className="text-slate-500">VS</span>
          <span className="text-amber-300 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-400" />
            {session.orangeTeamName}
          </span>
        </div>
      </div>

      {/* Dynamic Animated Countdown Number */}
      <div className="relative z-10 flex items-center justify-center min-h-[300px] w-full">
        <AnimatePresence mode="wait">
          {step === '3' && (
            <motion.div
              key="3"
              initial={{ scale: 0.2, opacity: 0, rotate: -10 }}
              animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-8xl md:text-9xl lg:text-[14rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 drop-shadow-[0_0_50px_rgba(6,182,212,0.6)]"
            >
              3
            </motion.div>
          )}

          {step === '2' && (
            <motion.div
              key="2"
              initial={{ scale: 0.2, opacity: 0, rotate: 10 }}
              animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-8xl md:text-9xl lg:text-[14rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-yellow-500 drop-shadow-[0_0_50px_rgba(245,158,11,0.6)]"
            >
              2
            </motion.div>
          )}

          {step === '1' && (
            <motion.div
              key="1"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-8xl md:text-9xl lg:text-[14rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-rose-400 to-red-600 drop-shadow-[0_0_50px_rgba(244,63,94,0.7)]"
            >
              1
            </motion.div>
          )}

          {step === 'RUN' && (
            <motion.div
              key="RUN"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [1, 1.4, 1.2], opacity: 1 }}
              exit={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-7xl md:text-9xl lg:text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-400 to-cyan-400 drop-shadow-[0_0_80px_rgba(52,211,153,0.9)] tracking-wider"
            >
              RUNNN!!!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 text-slate-400 text-xs md:text-sm font-medium tracking-wide">
        Giơ thẻ màu đội trước ngực khi camera kích hoạt!
      </div>
    </div>
  );
};
