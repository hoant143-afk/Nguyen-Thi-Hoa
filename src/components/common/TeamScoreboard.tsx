import React from 'react';
import { Trophy, Flame } from 'lucide-react';
import { Team } from '../../types';

interface TeamScoreboardProps {
  teams: Team[];
  activeTeamId?: string | null;
  stealingTeamId?: string | null;
  highlightLeader?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showRank?: boolean;
}

export const TeamScoreboard: React.FC<TeamScoreboardProps> = ({
  teams,
  activeTeamId,
  stealingTeamId,
  highlightLeader = true,
  size = 'md',
  showRank = false,
}) => {
  const teamCount = teams.length;

  // Compute highest score for leader highlight
  const maxScore = Math.max(...teams.map((t) => t.score));

  // Determine grid columns based on teamCount
  const gridColsClass =
    teamCount === 2
      ? 'grid-cols-2'
      : teamCount === 3
      ? 'grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`w-full grid ${gridColsClass} gap-2.5 sm:gap-3.5`}>
      {teams.map((team, idx) => {
        const isLeader = highlightLeader && team.score === maxScore && maxScore > 0;
        const isActive = activeTeamId === team.id;
        const isStealing = stealingTeamId === team.id;

        return (
          <div
            key={team.id || idx}
            id={`scoreboard-team-${team.id || idx}`}
            style={{
              borderColor: isActive || isStealing ? team.teamColor : `${team.teamColor}33`,
              background: `linear-gradient(135deg, ${team.teamColor}15 0%, rgba(15, 23, 42, 0.9) 100%)`,
            }}
            className={`relative rounded-2xl border-2 p-2.5 sm:p-3.5 flex flex-col justify-between transition-all duration-300 backdrop-blur-md shadow-lg ${
              isActive
                ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-[1.02]'
                : isStealing
                ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-950 animate-pulse'
                : 'hover:border-opacity-60'
            }`}
          >
            {/* Header / Team Badge & Status */}
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base sm:text-lg shrink-0">
                  {team.badge || (idx === 0 ? '🔵' : idx === 1 ? '🟠' : idx === 2 ? '🟢' : '🟣')}
                </span>
                <h4
                  style={{ color: team.teamColor }}
                  className="font-black text-xs sm:text-sm md:text-base truncate tracking-tight uppercase"
                  title={team.teamName}
                >
                  {team.teamName}
                </h4>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isLeader && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
                    <Trophy className="w-2.5 h-2.5" />
                    <span>DẪN ĐẦU</span>
                  </span>
                )}
                {isActive && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold animate-pulse">
                    <Flame className="w-2.5 h-2.5" />
                    <span>TRẢ LỜI</span>
                  </span>
                )}
                {isStealing && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold animate-bounce">
                    CƯỚP ĐIỂM
                  </span>
                )}
                {showRank && team.rank && (
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-black">
                    HẠNG {team.rank}
                  </span>
                )}
              </div>
            </div>

            {/* Score Display (16:9 Projector Optimized) */}
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 tracking-wider">
                Điểm số
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  style={{ color: team.teamColor }}
                  className={`font-black font-mono tracking-tight ${
                    size === 'lg'
                      ? 'text-3xl sm:text-5xl'
                      : size === 'md'
                      ? 'text-2xl sm:text-4xl'
                      : 'text-xl sm:text-2xl'
                  }`}
                >
                  {team.score}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-bold">Đ</span>
              </div>
            </div>

            {/* Subtle bottom progress/accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl"
              style={{ backgroundColor: team.teamColor }}
            />
          </div>
        );
      })}
    </div>
  );
};
