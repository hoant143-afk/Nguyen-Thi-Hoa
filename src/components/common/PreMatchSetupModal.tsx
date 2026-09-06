import React, { useState } from 'react';
import {
  Users,
  Settings,
  Play,
  X,
  Palette,
  Sparkles,
  BookOpen,
  Clock,
  Award,
} from 'lucide-react';
import { TeamCount, TeamSetupConfig } from '../../types';
import { DEFAULT_TEAM_PRESETS, TEAM_COLOR_OPTIONS, DEFAULT_CLASSES } from '../../data/classData';

export interface PreMatchOptions {
  teamSetup: TeamSetupConfig;
  className: string;
  questionCount: number;
  timeLimitSeconds: number;
  normalPoints: number;
  stealPoints: number;
}

interface PreMatchSetupModalProps {
  gameTitle: string;
  gameSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onStart: (options: PreMatchOptions) => void;
  allowedTeamCounts?: TeamCount[]; // e.g. [2] for CamRace, [2, 3, 4] for others
  defaultTeamCount?: TeamCount;
}

export const PreMatchSetupModal: React.FC<PreMatchSetupModalProps> = ({
  gameTitle,
  isOpen,
  onClose,
  onStart,
  allowedTeamCounts = [2, 3, 4],
  defaultTeamCount = 2,
}) => {
  const [teamCount, setTeamCount] = useState<TeamCount>(defaultTeamCount);

  // Initialize teams based on DEFAULT_TEAM_PRESETS
  const [teamsState, setTeamsState] = useState([
    {
      id: 'team_1',
      teamCode: 'TEAM1',
      teamName: DEFAULT_TEAM_PRESETS[0].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[0].color,
      badge: DEFAULT_TEAM_PRESETS[0].badge,
    },
    {
      id: 'team_2',
      teamCode: 'TEAM2',
      teamName: DEFAULT_TEAM_PRESETS[1].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[1].color,
      badge: DEFAULT_TEAM_PRESETS[1].badge,
    },
    {
      id: 'team_3',
      teamCode: 'TEAM3',
      teamName: DEFAULT_TEAM_PRESETS[2].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[2].color,
      badge: DEFAULT_TEAM_PRESETS[2].badge,
    },
    {
      id: 'team_4',
      teamCode: 'TEAM4',
      teamName: DEFAULT_TEAM_PRESETS[3].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[3].color,
      badge: DEFAULT_TEAM_PRESETS[3].badge,
    },
  ]);

  const [className, setClassName] = useState<string>(DEFAULT_CLASSES[0]?.name || '5A1');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(15);
  const [normalPoints, setNormalPoints] = useState<number>(10);
  const [stealPoints, setStealPoints] = useState<number>(5);

  if (!isOpen) return null;

  const handleUpdateTeamName = (idx: number, name: string) => {
    const copy = [...teamsState];
    copy[idx] = { ...copy[idx], teamName: name };
    setTeamsState(copy);
  };

  const handleUpdateTeamColor = (idx: number, color: string, badge: string) => {
    const copy = [...teamsState];
    copy[idx] = { ...copy[idx], teamColor: color, badge };
    setTeamsState(copy);
  };

  const handleStartGame = () => {
    const activeTeams = teamsState.slice(0, teamCount);
    onStart({
      teamSetup: {
        teamCount,
        teams: activeTeams,
      },
      className,
      questionCount,
      timeLimitSeconds,
      normalPoints,
      stealPoints,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        id="pre-match-modal"
        className="max-w-2xl w-full bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                Thiết Lập Trận Đấu: {gameTitle}
              </h3>
              <p className="text-xs text-slate-400">
                Thi đấu theo ĐỘI • Tự động điều chỉnh bảng điểm 2-4 đội
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Chọn số đội */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            1. SỐ ĐỘI THAM GIA
          </label>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[2, 3, 4].map((count) => {
              const countNum = count as TeamCount;
              const isAllowed = allowedTeamCounts.includes(countNum);
              const isSelected = teamCount === countNum;

              return (
                <button
                  key={count}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => setTeamCount(countNum)}
                  className={`py-3 px-4 rounded-2xl font-black text-sm uppercase tracking-wide transition-all flex flex-col items-center justify-center gap-1 border-2 ${
                    !isAllowed
                      ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900/50 text-slate-500'
                      : isSelected
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/20 scale-[1.02]'
                      : 'border-slate-700/80 bg-slate-800/60 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-base sm:text-lg">{count} ĐỘI</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    {count === 2 ? 'Đối kháng 1 vs 1' : count === 3 ? 'Tam giác 3 đội' : 'Tứ hùng 4 đội'}
                  </span>
                </button>
              );
            })}
          </div>
          {allowedTeamCounts.length === 1 && allowedTeamCounts[0] === 2 && (
            <p className="text-[11px] text-amber-400/90 italic">
              * Trò chơi Camera Race sử dụng thị giác máy tính nhận diện 2 thẻ màu (Xanh dương & Cam).
            </p>
          )}
        </div>

        {/* Step 2: Nhập tên & Chọn màu cho từng đội */}
        <div className="space-y-2.5">
          <label className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            2. TÊN & MÀU SẮC CÁC ĐỘI
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teamsState.slice(0, teamCount).map((team, idx) => (
              <div
                key={team.id}
                style={{ borderColor: `${team.teamColor}55` }}
                className="p-3 rounded-2xl bg-slate-950/60 border-2 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-400">
                    ĐỘI {idx + 1}
                  </span>
                  <span className="text-base">{team.badge}</span>
                </div>

                {/* Team Name Input */}
                <input
                  type="text"
                  value={team.teamName}
                  onChange={(e) => handleUpdateTeamName(idx, e.target.value)}
                  placeholder={`Tên Đội ${idx + 1}...`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-cyan-400"
                />

                {/* Color Selector Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
                  {TEAM_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => handleUpdateTeamColor(idx, c.color, c.badge)}
                      style={{ backgroundColor: c.color }}
                      className={`w-6 h-6 rounded-full shrink-0 transition-transform ${
                        team.teamColor === c.color ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Chọn lớp & Cài đặt luật */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Lớp */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-cyan-400" />
              Lớp thi đấu:
            </label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
            >
              {DEFAULT_CLASSES.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name} ({cls.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Số câu hỏi */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Số câu hỏi:
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
            >
              <option value={5}>5 câu (Trận nhanh)</option>
              <option value={10}>10 câu (Chuẩn)</option>
              <option value={15}>15 câu (Mở rộng)</option>
              <option value={20}>20 câu (Toàn diện)</option>
            </select>
          </div>

          {/* Thời gian */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-rose-400" />
              Thời gian/câu:
            </label>
            <select
              value={timeLimitSeconds}
              onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
            >
              <option value={10}>10 giây (Tốc độ)</option>
              <option value={15}>15 giây (Chuẩn)</option>
              <option value={20}>20 giây</option>
              <option value={30}>30 giây (Thư thả)</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleStartGame}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-black text-sm uppercase tracking-wide hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 transition-all flex items-center gap-2 hover:scale-[1.02]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>BẮT ĐẦU TRẬN ĐẤU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
