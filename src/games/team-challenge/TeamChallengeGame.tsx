import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  ArrowLeft,
  RotateCcw,
  Plus,
  Minus,
  Crown,
  Users,
  Award,
  Sparkles,
  Flame,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { EduplayStorage, STORAGE_NAMESPACES } from '../../services/eduplayStorage';
import { soundService } from '../../services/soundService';
import { Team, TeamCount } from '../../types';
import { DEFAULT_TEAM_PRESETS } from '../../data/classData';
import { ScoresRepository } from '../../repositories/scoresRepository';
import { apiClient } from '../../services/apiClient';

const QUICK_CHALLENGES = [
  { title: 'Trật tự & Sẵn sàng', points: 5, desc: 'Đội ổn định chỗ ngồi và sẵn sàng nhanh nhất' },
  { title: 'Phát biểu chính xác', points: 10, desc: 'Đại diện đội trả lời đúng câu hỏi bài tập' },
  { title: 'Hoàn thành bài sớm', points: 15, desc: 'Cả đội hoàn thành nhiệm vụ thực hành mẫu' },
  { title: 'Làm việc nhóm tốt', points: 10, desc: 'Hỗ trợ lẫn nhau, đoàn kết và sáng tạo' },
  { title: 'Giải đố xuất sắc', points: 20, desc: 'Giải mã câu đố logic hoặc mật mã tin học' },
];

interface TeamChallengeGameProps {
  onBackToEduplay: () => void;
}

export const TeamChallengeGame: React.FC<TeamChallengeGameProps> = ({ onBackToEduplay }) => {
  const [teamCount, setTeamCount] = useState<TeamCount>(4);
  const [teams, setTeams] = useState<Team[]>([
    {
      id: 'team_1',
      teamCode: 'TEAM1',
      teamName: DEFAULT_TEAM_PRESETS[0].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[0].color,
      badge: DEFAULT_TEAM_PRESETS[0].badge,
      score: 25,
    },
    {
      id: 'team_2',
      teamCode: 'TEAM2',
      teamName: DEFAULT_TEAM_PRESETS[1].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[1].color,
      badge: DEFAULT_TEAM_PRESETS[1].badge,
      score: 30,
    },
    {
      id: 'team_3',
      teamCode: 'TEAM3',
      teamName: DEFAULT_TEAM_PRESETS[2].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[2].color,
      badge: DEFAULT_TEAM_PRESETS[2].badge,
      score: 20,
    },
    {
      id: 'team_4',
      teamCode: 'TEAM4',
      teamName: DEFAULT_TEAM_PRESETS[3].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[3].color,
      badge: DEFAULT_TEAM_PRESETS[3].badge,
      score: 15,
    },
  ]);

  const activeTeams = teams.slice(0, teamCount);
  const [activeTeamId, setActiveTeamId] = useState<string>(teams[0]?.id || 'team_1');

  // Save to storage
  useEffect(() => {
    EduplayStorage.setGameData(STORAGE_NAMESPACES.TEAM_CHALLENGE, teams);
  }, [teams]);

  const handleAdjustScore = (teamId: string, delta: number, reason?: string) => {
    if (delta > 0) {
      soundService.playPointsEarned();
      if (delta >= 10) {
        confetti({ particleCount: 50, spread: 60 });
      }
    } else {
      soundService.playClick();
    }

    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          const newScore = Math.max(0, t.score + delta);

          // Cloud sync
          if (apiClient.getMode() === 'cloud') {
            ScoresRepository.addScoreEvent({
              sessionId: `tc_${Date.now()}`,
              gameCode: 'TEAM_CHALLENGE',
              teamCode: t.teamCode || 'TEAM1',
              teamName: t.teamName,
              deltaPoints: delta,
              totalScoreAfter: newScore,
              roundNumber: 1,
              reason: reason || 'Điều chỉnh điểm thi đua',
            }).catch(() => {});
          }

          return { ...t, score: newScore };
        }
        return t;
      })
    );
  };

  const handleResetScores = () => {
    if (window.confirm('Bạn có chắc muốn đặt lại điểm số của tất cả các đội về 0?')) {
      soundService.playClick();
      setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
    }
  };

  const handleApplyChallenge = (challengePoints: number, challengeTitle: string) => {
    handleAdjustScore(activeTeamId, challengePoints, `Thử thách: ${challengeTitle}`);
  };

  const sortedTeams = [...activeTeams].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500 selection:text-slate-950">
      {/* Header */}
      <header className="bg-slate-900/90 border-b border-blue-900/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundService.playClick();
              onBackToEduplay();
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Eduplay Home</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                <span>THỬ THÁCH ĐỒNG ĐỘI</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold">
                  {teamCount} ĐỘI
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Bảng điểm thi đua các đội • Tối ưu máy chiếu 16:9</p>
            </div>
          </div>
        </div>

        {/* Team count switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 p-1 rounded-xl">
            {[2, 3, 4].map((cnt) => (
              <button
                key={cnt}
                onClick={() => setTeamCount(cnt as TeamCount)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                  teamCount === cnt
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cnt} ĐỘI
              </button>
            ))}
          </div>

          <button
            onClick={handleResetScores}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        </div>
      </header>

      {/* Main Grid Scoreboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col justify-between space-y-6">
        {/* Responsive Team Giant Projector Cards */}
        <div
          className={`grid gap-4 ${
            teamCount === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : teamCount === 3
              ? 'grid-cols-1 sm:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {activeTeams.map((t) => {
            const rankIdx = sortedTeams.findIndex((item) => item.id === t.id);
            const isSelected = activeTeamId === t.id;

            return (
              <div
                key={t.id}
                onClick={() => setActiveTeamId(t.id)}
                style={{
                  borderColor: isSelected ? t.teamColor : `${t.teamColor}40`,
                  background: isSelected
                    ? `linear-gradient(135deg, ${t.teamColor}25 0%, rgba(15, 23, 42, 0.95) 100%)`
                    : 'rgba(15, 23, 42, 0.8)',
                }}
                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'ring-4 ring-blue-400/40 shadow-2xl scale-[1.02]'
                    : 'hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{t.badge}</span>
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        rankIdx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                          : rankIdx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : rankIdx === 2
                          ? 'bg-amber-800 text-amber-100'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {rankIdx === 0 && <Crown className="w-3.5 h-3.5" />}
                      <span>Hạng {rankIdx + 1}</span>
                    </span>
                  </div>

                  <input
                    type="text"
                    value={t.teamName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeams((prev) =>
                        prev.map((item) => (item.id === t.id ? { ...item, teamName: val } : item))
                      );
                    }}
                    style={{ color: t.teamColor }}
                    className="w-full bg-transparent border-b border-transparent hover:border-slate-700 text-base font-black uppercase focus:outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-0.5">Mã: {t.teamCode}</p>
                </div>

                {/* Massive Score Display */}
                <div className="my-5 text-center">
                  <span
                    style={{ color: t.teamColor }}
                    className="text-6xl sm:text-7xl font-black tracking-tight tabular-nums font-mono"
                  >
                    {t.score}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1 uppercase font-bold">Điểm số</span>
                </div>

                {/* + / - Quick controls */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdjustScore(t.id, -5);
                    }}
                    className="py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 hover:text-rose-300 text-slate-400 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>-5đ</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdjustScore(t.id, 5);
                    }}
                    className="py-2 rounded-xl bg-slate-800/80 hover:bg-emerald-950/80 hover:text-emerald-300 text-slate-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+5đ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Quick Challenge Awards Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black uppercase text-white tracking-wide">
                Cộng điểm nhanh cho đội đang chọn:
              </h3>
              <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full font-bold">
                {teams.find((t) => t.id === activeTeamId)?.teamName}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Bấm trực tiếp vào thẻ đội bên trên để chuyển đội nhận điểm
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {QUICK_CHALLENGES.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyChallenge(ch.points, ch.title)}
                className="p-3 bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 rounded-2xl flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-extrabold text-white group-hover:text-blue-300">
                      {ch.title}
                    </span>
                    <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                      +{ch.points}đ
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2">{ch.desc}</p>
                </div>
                <span className="text-[10px] text-blue-400 font-bold mt-2 inline-flex items-center gap-1">
                  <span>Cộng điểm ngay</span>
                  <span>→</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
