import React from 'react';
import { motion } from 'motion/react';
import { Zap, RotateCcw } from 'lucide-react';
import { GameSession } from '../types';
import { soundService } from '../services/soundService';

interface TieScreenProps {
  session: GameSession;
  onRetryRace: () => void;
}

export const TieScreen: React.FC<TieScreenProps> = ({ session, onRetryRace }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900/90 border-2 border-amber-500/60 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className="w-20 h-20 mx-auto rounded-full bg-amber-950/80 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20"
        >
          <Zap className="w-10 h-10 fill-current animate-bounce" />
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-4xl md:text-5xl font-black text-amber-400 uppercase tracking-tight">
            ⚡ QUÁ SÁT NHAU!
          </h2>
          <p className="text-2xl md:text-3xl font-extrabold text-white uppercase">
            HÒA – TRANH QUYỀN LẠI!
          </p>
          <p className="text-sm md:text-base text-slate-400 max-w-md mx-auto">
            Cả hai đội <span className="text-cyan-300 font-bold">{session.blueTeamName}</span> và{' '}
            <span className="text-amber-300 font-bold">{session.orangeTeamName}</span> đã về đích cùng lúc với chênh lệch dưới 200ms!
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => {
              soundService.playClick();
              onRetryRace();
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-lg py-4 px-8 rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-3 mx-auto cursor-pointer transition-transform active:scale-95 uppercase tracking-wider"
          >
            <RotateCcw className="w-6 h-6" />
            <span>🏃 TRANH QUYỀN LẠI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
