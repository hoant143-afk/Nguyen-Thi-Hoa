import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Zap,
  Trophy,
  ArrowLeft,
  RotateCcw,
  Play,
  CheckCircle2,
  XCircle,
  Sparkles,
  Timer,
  ChevronRight,
  Crown,
  Users,
  Palette,
  Award,
  Upload,
  BookOpen,
} from 'lucide-react';
import { Question, Team, TeamCount, QuestionBankLesson } from '../../types';
import { EduplayStorage, STORAGE_NAMESPACES } from '../../services/eduplayStorage';
import { soundService } from '../../services/soundService';
import { TeamScoreboard } from '../../components/common/TeamScoreboard';
import { DEFAULT_TEAM_PRESETS, TEAM_COLOR_OPTIONS } from '../../data/classData';
import { SessionsRepository } from '../../repositories/sessionsRepository';
import { ScoresRepository } from '../../repositories/scoresRepository';
import { apiClient } from '../../services/apiClient';
import { TeamImportModal } from '../../components/common/TeamImportModal';
import { QuestionBankRepository } from '../../repositories/questionBankRepository';
import { QuestionBankSelector } from '../../components/common/QuestionBankSelector';
import { QuestionImportModal } from '../../components/common/QuestionImportModal';

interface QuizBattleGameProps {
  onBackToEduplay: () => void;
}

export const QuizBattleGame: React.FC<QuizBattleGameProps> = ({ onBackToEduplay }) => {
  const [selectedLesson, setSelectedLesson] = useState<QuestionBankLesson>(() => {
    return QuestionBankRepository.getSelectedLesson();
  });
  const [questions, setQuestions] = useState<Question[]>(() => {
    const active = QuestionBankRepository.getSelectedLesson();
    return active?.questions && active.questions.length > 0 ? active.questions : EduplayStorage.getQuestions();
  });
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);

  const [showBankModal, setShowBankModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // 2, 3, or 4 teams configuration
  const [teamCount, setTeamCount] = useState<TeamCount>(3);
  const [showTeamImportModal, setShowTeamImportModal] = useState<boolean>(false);

  const handleApplyImportedTeams = (imported: { name: string; color: string; badge?: string }[]) => {
    if (imported.length >= 2 && imported.length <= 4) {
      setTeamCount(imported.length as TeamCount);
      setTeams((prev) => {
        return prev.map((t, idx) => {
          const imp = imported[idx];
          if (imp) {
            return {
              ...t,
              teamName: imp.name,
              teamColor: imp.color,
              badge: imp.badge || t.badge,
            };
          }
          return t;
        });
      });
    }
  };
  const [teams, setTeams] = useState<Team[]>([
    {
      id: 'team_1',
      teamCode: 'TEAM1',
      teamName: DEFAULT_TEAM_PRESETS[0].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[0].color,
      badge: DEFAULT_TEAM_PRESETS[0].badge,
      score: 0,
    },
    {
      id: 'team_2',
      teamCode: 'TEAM2',
      teamName: DEFAULT_TEAM_PRESETS[1].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[1].color,
      badge: DEFAULT_TEAM_PRESETS[1].badge,
      score: 0,
    },
    {
      id: 'team_3',
      teamCode: 'TEAM3',
      teamName: DEFAULT_TEAM_PRESETS[2].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[2].color,
      badge: DEFAULT_TEAM_PRESETS[2].badge,
      score: 0,
    },
    {
      id: 'team_4',
      teamCode: 'TEAM4',
      teamName: DEFAULT_TEAM_PRESETS[3].defaultName,
      teamColor: DEFAULT_TEAM_PRESETS[3].color,
      badge: DEFAULT_TEAM_PRESETS[3].badge,
      score: 0,
    },
  ]);

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'LEADERBOARD'>('SETUP');
  const [timerSeconds, setTimerSeconds] = useState<number>(20);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [cloudSessionId, setCloudSessionId] = useState<string | null>(null);

  const activeTeams = teams.slice(0, teamCount);
  const currentQ = questions[currentQIndex] || questions[0];

  // Question countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 4 && prev > 1) {
            soundService.playUrgentTick();
          } else if (prev === 1) {
            soundService.playTimeoutBuzzer();
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Keyboard shortcut listener for fast buzz-in (1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= teamCount) {
        const team = activeTeams[keyNum - 1];
        if (team && !isAnswered) {
          handleSelectTeam(team.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, teamCount, activeTeams, isAnswered]);

  const handleStartGame = async () => {
    soundService.playClick();
    setCurrentQIndex(0);
    setActiveTeamId(null);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimerSeconds(currentQ?.isSpecial ? 30 : 20);
    setIsTimerRunning(true);

    // Reset scores
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
    setGameState('PLAYING');

    // Create cloud session if cloud mode
    if (apiClient.getMode() === 'cloud') {
      try {
        const newSessionId = `qb_${Date.now()}`;
        setCloudSessionId(newSessionId);
        await SessionsRepository.createSession({
          sessionId: newSessionId,
          gameCode: 'QUIZ_BATTLE',
          status: 'PLAYING',
          teamCount,
          teams: activeTeams.map((t) => ({
            id: t.id,
            teamCode: t.teamCode,
            teamName: t.teamName,
            teamColor: t.teamColor,
            score: 0,
          })),
        });
      } catch (err) {
        console.warn('QuizBattle cloud session init notice:', err);
      }
    }
  };

  const handleSelectTeam = (teamId: string) => {
    soundService.playBuzzerHit(teamId as any);
    setActiveTeamId(teamId);
  };

  const handleAnswer = async (choiceIdx: number) => {
    if (isAnswered) return;
    setSelectedOption(choiceIdx);
    setIsAnswered(true);
    setIsTimerRunning(false);

    const isCorrect = choiceIdx === currentQ.correctAnswer;
    const points = currentQ.isSpecial ? 20 : 10;

    if (isCorrect) {
      soundService.playCorrect();
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      if (activeTeamId) {
        setTeams((prev) =>
          prev.map((t) => (t.id === activeTeamId ? { ...t, score: t.score + points } : t))
        );

        // Cloud sync score
        if (apiClient.getMode() === 'cloud' && cloudSessionId) {
          const answeringTeam = teams.find((t) => t.id === activeTeamId);
          if (answeringTeam) {
            ScoresRepository.addScoreEvent({
              sessionId: cloudSessionId,
              gameCode: 'QUIZ_BATTLE',
              teamCode: answeringTeam.teamCode || 'TEAM1',
              teamName: answeringTeam.teamName,
              deltaPoints: points,
              totalScoreAfter: answeringTeam.score + points,
              roundNumber: currentQIndex + 1,
              reason: `Câu ${currentQIndex + 1}: Đúng`,
            }).catch(() => {});
          }
        }
      }
    } else {
      soundService.playWrong();
    }
  };

  const handleNextQuestion = () => {
    soundService.playClick();
    if (currentQIndex + 1 >= questions.length) {
      // Finished
      soundService.playChampionFanfare();
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
      setGameState('LEADERBOARD');

      const sorted = [...activeTeams].sort((a, b) => b.score - a.score);
      const winner = sorted[0];

      // Local storage history
      EduplayStorage.addHistoryEntry({
        gameId: 'quiz-battle',
        gameName: 'QUIZ BATTLE',
        className: 'Toàn khối',
        timestamp: Date.now(),
        winner: winner?.teamName || 'Không xác định',
        teamCount,
        teams: sorted.map((t, idx) => ({
          name: t.teamName,
          score: t.score,
          color: t.teamColor,
          rank: idx + 1,
        })),
        summary: sorted.map((t, idx) => `Hạng ${idx + 1}: ${t.teamName} (${t.score}đ)`).join(' • '),
      });

      // Cloud session finalize
      if (apiClient.getMode() === 'cloud' && cloudSessionId) {
        SessionsRepository.finalizeSession({
          sessionId: cloudSessionId,
          status: 'COMPLETED',
          finalResults: {
            winnerTeamCode: winner?.teamCode || 'TEAM1',
            winnerTeamName: winner?.teamName || 'Quán quân',
            teams: sorted.map((t, idx) => ({
              teamCode: t.teamCode || `TEAM${idx + 1}`,
              teamName: t.teamName,
              finalScore: t.score,
              rank: idx + 1,
            })),
          },
        }).catch(() => {});
      }
    } else {
      setCurrentQIndex((prev) => prev + 1);
      setActiveTeamId(null);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimerSeconds(20);
      setIsTimerRunning(true);
    }
  };

  const sortedTeams = [...activeTeams].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Header Bar */}
      <header className="bg-slate-900/90 border-b border-amber-900/40 px-4 py-2.5 flex items-center justify-between shadow-xl">
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                <span>QUIZ BATTLE</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  {teamCount} ĐỘI TRANH TÀI
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Đấu trường Tri thức • Bấm chuông giành quyền</p>
            </div>
          </div>
        </div>

        {gameState === 'PLAYING' && (
          <button
            onClick={() => setGameState('SETUP')}
            className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700"
          >
            Thiết lập lại
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col justify-center">
        {/* SETUP SCREEN */}
        {gameState === 'SETUP' && (
          <div className="max-w-2xl mx-auto w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Thiết Lập Trận Đấu Quiz Battle
              </h2>
              <p className="text-xs text-slate-400">
                Chọn số lượng đội (2, 3 hoặc 4 đội) và tùy chỉnh tên, màu sắc cho từng đội
              </p>
            </div>

            {/* 1. Chọn số đội */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  SỐ ĐỘI THAM GIA
                </label>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setShowTeamImportModal(true);
                  }}
                  className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>📥 Nhập đội từ CSV / Excel</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map((count) => {
                  const countNum = count as TeamCount;
                  const isSelected = teamCount === countNum;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setTeamCount(countNum)}
                      className={`py-3 px-4 rounded-2xl font-black text-sm uppercase transition-all flex flex-col items-center justify-center gap-1 border-2 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/20 scale-[1.02]'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base sm:text-lg">{count} ĐỘI</span>
                      <span className="text-[10px] font-normal text-slate-400">
                        {count === 2 ? 'Đối kháng 2 đội' : count === 3 ? 'Tam đấu 3 đội' : 'Tứ hùng 4 đội'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Nhập tên & Chọn màu từng đội */}
            <div className="space-y-2.5">
              <label className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4" />
                TÊN VÀ MÀU SẮC TỪNG ĐỘI
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeTeams.map((team, idx) => (
                  <div
                    key={team.id}
                    style={{ borderColor: `${team.teamColor}55` }}
                    className="p-3 rounded-2xl bg-slate-950/70 border-2 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-400">
                        ĐỘI {idx + 1}
                      </span>
                      <span className="text-base">{team.badge}</span>
                    </div>

                    <input
                      type="text"
                      value={team.teamName}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setTeams((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, teamName: newName } : t))
                        );
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                      placeholder={`Tên Đội ${idx + 1}...`}
                    />

                    <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                      {TEAM_COLOR_OPTIONS.map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => {
                            setTeams((prev) =>
                              prev.map((t, i) =>
                                i === idx ? { ...t, teamColor: c.color, badge: c.badge } : t
                              )
                            );
                          }}
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

            {/* LESSON & QUESTION SET SELECTOR */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>BỘ CÂU HỎI THI ĐẤU:</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                        Khối {selectedLesson.grade} • {selectedLesson.subject}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-amber-300 mt-0.5">
                      {selectedLesson.lessonTitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      setShowBankModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Chọn bài học khác từ Ngân hàng câu hỏi Khối 1 - 9"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Đổi Bài Học</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      setShowImportModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Tải lên tệp CSV/Excel để tạo bài học mới ngay"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải Lên Tệp</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Số câu hỏi trận đấu: <strong className="text-amber-400 font-bold">{questions.length} câu</strong></span>
                <span>Thời gian mỗi câu: <strong className="text-cyan-400 font-bold">20 giây</strong></span>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider flex items-center justify-center gap-3"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>🚀 BẮT ĐẦU TRẬN ĐẤU ({teamCount} ĐỘI)</span>
            </button>
          </div>
        )}

        {/* PLAYING SCREEN */}
        {gameState === 'PLAYING' && (
          <div className="space-y-4">
            {/* Adaptive Universal Team Scoreboard (2, 3, or 4 teams) */}
            <TeamScoreboard
              teams={activeTeams}
              activeTeamId={activeTeamId}
              size="md"
            />

            {/* Match Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">CÂU HỎI:</span>
                <span className="text-lg font-black text-amber-400 tabular-nums">
                  {currentQIndex + 1}
                </span>
                <span className="text-xs text-slate-500 font-bold">/ {questions.length}</span>
                {currentQ.category && (
                  <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full ml-2">
                    {currentQ.category}
                  </span>
                )}
                {currentQ.isSpecial && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-400/50 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> CÂU ĐẶC BIỆT +20
                  </span>
                )}
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-black tabular-nums ${
                    timerSeconds <= 5
                      ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse'
                      : 'bg-slate-800 border-slate-700 text-cyan-400'
                  }`}
                >
                  <Timer className="w-4 h-4" />
                  <span>{timerSeconds}s</span>
                </div>

                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer"
                >
                  {isTimerRunning ? 'Tạm dừng' : 'Tiếp tục'}
                </button>
              </div>
            </div>

            {/* Select Active Team to Answer */}
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-1">
                <span className="text-xs font-black text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  ĐỘI BẤM CHUÔNG / GIÀNH QUYỀN TRẢ LỜI:
                </span>
                {activeTeamId ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-0.5 rounded-full">
                    Đã chọn: {teams.find((t) => t.id === activeTeamId)?.teamName}
                  </span>
                ) : (
                  <span className="text-xs text-amber-400 animate-pulse font-bold">
                    (Bấm nút bên dưới hoặc phím 1, 2, 3, 4 trên bàn phím)
                  </span>
                )}
              </div>

              {/* Team Buzz-in Buttons Grid */}
              <div className={`grid ${teamCount === 2 ? 'grid-cols-2' : teamCount === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
                {activeTeams.map((t, idx) => {
                  const isCurrent = activeTeamId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTeam(t.id)}
                      style={{
                        borderColor: isCurrent ? t.teamColor : `${t.teamColor}40`,
                        backgroundColor: isCurrent ? `${t.teamColor}25` : undefined,
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-amber-400 scale-[1.02] shadow-lg'
                          : 'bg-slate-950/60 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-extrabold text-white truncate text-left">
                          {t.teamName}
                        </span>
                      </div>
                      <span className="text-xs font-black text-amber-400 shrink-0 ml-1">
                        {t.score}đ
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <h2 className="text-lg sm:text-2xl font-black text-white leading-relaxed text-center">
                {currentQ.question}
              </h2>

              {/* 4 Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {currentQ.options.map((opt, idx) => {
                  const label = String.fromCharCode(65 + idx);
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentQ.correctAnswer;

                  let btnStyle = 'border-slate-700/80 bg-slate-950/80 hover:bg-slate-800/80 text-slate-200';
                  if (isAnswered) {
                    if (isCorrect) {
                      btnStyle = 'border-emerald-500 bg-emerald-950/80 text-emerald-200 shadow-lg shadow-emerald-500/20';
                    } else if (isSelected) {
                      btnStyle = 'border-rose-500 bg-rose-950/80 text-rose-200';
                    } else {
                      btnStyle = 'border-slate-800 bg-slate-950/40 text-slate-500 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleAnswer(idx)}
                      className={`p-3.5 sm:p-4 rounded-2xl border-2 flex items-center gap-3 text-left transition-all cursor-pointer font-bold text-sm md:text-base ${btnStyle}`}
                    >
                      <span className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 font-black text-sm shrink-0 border border-slate-700">
                        {label}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {isAnswered && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />}
                      {isAnswered && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Answer Explanation Banner */}
              {isAnswered && (
                <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    {selectedOption === currentQ.correctAnswer ? (
                      <span className="text-xs font-black text-emerald-400 uppercase flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> CHÍNH XÁC (+{currentQ.isSpecial ? 20 : 10} điểm)
                      </span>
                    ) : (
                      <span className="text-xs font-black text-rose-400 uppercase flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" /> CHƯA CHÍNH XÁC
                      </span>
                    )}
                  </div>
                  {currentQ.explanation && (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      💡 {currentQ.explanation}
                    </p>
                  )}
                </div>
              )}

              {/* Next Question / Finish Action */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-transform active:scale-95"
                >
                  <span>{currentQIndex + 1 >= questions.length ? 'Xem Tổng kết' : 'Câu tiếp theo'}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LEADERBOARD SCREEN */}
        {gameState === 'LEADERBOARD' && (
          <div className="max-w-xl mx-auto w-full bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl p-6 md:p-8 backdrop-blur shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 mx-auto shadow-2xl shadow-amber-500/30 animate-bounce">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase">
                BẢNG XẾP HẠNG QUIZ BATTLE
              </h2>
              <p className="text-amber-400 font-bold text-sm">
                Chúc mừng các đội đã hoàn thành xuất sắc {questions.length} câu hỏi!
              </p>
            </div>

            {/* Podium list */}
            <div className="space-y-3">
              {sortedTeams.map((team, idx) => (
                <div
                  key={team.id}
                  style={{
                    borderColor: idx === 0 ? '#f59e0b' : `${team.teamColor}55`,
                    backgroundColor: idx === 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.8)',
                  }}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between shadow-md ${
                    idx === 0 ? 'scale-[1.02] shadow-amber-500/20 ring-2 ring-amber-400/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-800 text-amber-100'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx === 0 ? <Crown className="w-5 h-5" /> : `H${idx + 1}`}
                    </span>
                    <div className="text-left">
                      <h4 className="font-black text-white text-base flex items-center gap-1.5">
                        <span>{team.badge}</span>
                        <span>{team.teamName}</span>
                      </h4>
                      <span className="text-[11px] text-slate-400 uppercase font-bold">
                        {idx === 0 ? '🏆 ĐỘI VÔ ĐỊCH' : idx === 1 ? '🥈 Á QUÂN' : `HẠNG ${idx + 1}`}
                      </span>
                    </div>
                  </div>
                  <span className="text-2xl font-black font-mono text-amber-400 tabular-nums">
                    {team.score}đ
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={handleStartGame}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Chơi lại ván mới</span>
              </button>
              <button
                onClick={onBackToEduplay}
                className="py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm cursor-pointer"
              >
                Về Eduplay Home
              </button>
            </div>
          </div>
        )}
      </main>

      {/* TEAM IMPORT MODAL */}
      <TeamImportModal
        isOpen={showTeamImportModal}
        onClose={() => setShowTeamImportModal(false)}
        onApplyTeams={handleApplyImportedTeams}
      />

      {/* QUESTION BANK SELECTOR MODAL */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto p-4 sm:p-6">
            <QuestionBankSelector
              selectedLessonId={selectedLesson.id}
              isModal={true}
              onClose={() => setShowBankModal(false)}
              onSelectLesson={(lesson) => {
                setSelectedLesson(lesson);
                setQuestions(lesson.questions);
                QuestionBankRepository.setSelectedLessonId(lesson.id);
                EduplayStorage.saveQuestions(lesson.questions);
                setShowBankModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* QUESTION IMPORT MODAL */}
      {showImportModal && (
        <QuestionImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          currentQuestions={questions}
          initialGrade={selectedLesson.grade}
          initialSubject={selectedLesson.subject}
          saveAsLesson={true}
          onImportLessonSuccess={(newLesson, newQuestions) => {
            setSelectedLesson(newLesson);
            setQuestions(newQuestions);
            QuestionBankRepository.setSelectedLessonId(newLesson.id);
            EduplayStorage.saveQuestions(newQuestions);
            setShowImportModal(false);
          }}
          onImportSuccess={(newQuestions) => {
            setQuestions(newQuestions);
          }}
        />
      )}
    </div>
  );
};
