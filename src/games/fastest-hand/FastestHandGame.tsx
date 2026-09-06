import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  ArrowLeft,
  Timer,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Trophy,
  Zap,
  Users,
  Palette,
  Crown,
  Upload,
} from 'lucide-react';
import { Question, Team, TeamCount } from '../../types';
import { EduplayStorage } from '../../services/eduplayStorage';
import { soundService } from '../../services/soundService';
import { TeamScoreboard } from '../../components/common/TeamScoreboard';
import { DEFAULT_TEAM_PRESETS, TEAM_COLOR_OPTIONS } from '../../data/classData';
import { SessionsRepository } from '../../repositories/sessionsRepository';
import { ScoresRepository } from '../../repositories/scoresRepository';
import { apiClient } from '../../services/apiClient';
import { TeamImportModal } from '../../components/common/TeamImportModal';

type BuzzerState = 'SETUP' | 'IDLE' | 'COUNTDOWN' | 'RACE_OPEN' | 'LOCKED' | 'ANSWERING' | 'RESULT' | 'LEADERBOARD';

interface FastestHandGameProps {
  onBackToEduplay: () => void;
}

const BUZZER_HOTKEYS = ['q', 'p', 'z', 'm'];

export const FastestHandGame: React.FC<FastestHandGameProps> = ({ onBackToEduplay }) => {
  const [questions, setQuestions] = useState<Question[]>(() => EduplayStorage.getQuestions());
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);

  // 2, 3, or 4 teams
  const [teamCount, setTeamCount] = useState<TeamCount>(2);
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

  const [buzzerState, setBuzzerState] = useState<BuzzerState>('SETUP');
  const [lockedWinnerId, setLockedWinnerId] = useState<string | null>(null);
  const [reactionTimeMs, setReactionTimeMs] = useState<number | null>(null);
  const [raceStartTime, setRaceStartTime] = useState<number | null>(null);

  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [answerTimer, setAnswerTimer] = useState<number>(15);
  const [isAnswerTimerActive, setIsAnswerTimerActive] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [cloudSessionId, setCloudSessionId] = useState<string | null>(null);

  const activeTeams = teams.slice(0, teamCount);
  const currentQ = questions[currentQIndex] || questions[0];

  // Buzzer lock logic
  const handleBuzzerPress = useCallback(
    (teamId: string) => {
      if (buzzerState !== 'RACE_OPEN') return;

      const now = performance.now();
      const delta = raceStartTime ? Math.round(now - raceStartTime) : 250;

      soundService.playBuzzerHit(teamId as any);
      soundService.playRaceLock('blue');

      setLockedWinnerId(teamId);
      setReactionTimeMs(delta);
      setBuzzerState('LOCKED');

      // Transition to answering stage after brief flash
      setTimeout(() => {
        setBuzzerState('ANSWERING');
        setAnswerTimer(15);
        setIsAnswerTimerActive(true);
      }, 900);
    },
    [buzzerState, raceStartTime]
  );

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();

      // Find if key matches any active team's hotkey
      for (let i = 0; i < teamCount; i++) {
        if (key === BUZZER_HOTKEYS[i]) {
          const t = activeTeams[i];
          if (t && buzzerState === 'RACE_OPEN') {
            handleBuzzerPress(t.id);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [buzzerState, teamCount, activeTeams, handleBuzzerPress]);

  // 3-2-1 Countdown before buzzer opens
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (buzzerState === 'COUNTDOWN') {
      if (countdownNum > 0) {
        soundService.playCountdownTick(countdownNum);
        timer = setTimeout(() => {
          setCountdownNum((prev) => prev - 1);
        }, 1000);
      } else {
        // GO!
        soundService.playRunHorn();
        setBuzzerState('RACE_OPEN');
        setRaceStartTime(performance.now());
      }
    }
    return () => clearTimeout(timer);
  }, [buzzerState, countdownNum]);

  // 15-second answer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (buzzerState === 'ANSWERING' && isAnswerTimerActive && answerTimer > 0) {
      interval = setInterval(() => {
        setAnswerTimer((prev) => {
          if (prev <= 4 && prev > 1) soundService.playUrgentTick();
          if (prev === 1) soundService.playTimeoutBuzzer();
          return prev - 1;
        });
      }, 1000);
    } else if (answerTimer === 0 && isAnswerTimerActive) {
      setIsAnswerTimerActive(false);
      handleAnswerSelected(-1);
    }
    return () => clearInterval(interval);
  }, [buzzerState, isAnswerTimerActive, answerTimer]);

  const handleStartMatch = async () => {
    soundService.playClick();
    setCurrentQIndex(0);
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
    setBuzzerState('IDLE');

    // Cloud session init
    if (apiClient.getMode() === 'cloud') {
      try {
        const newSessionId = `fh_${Date.now()}`;
        setCloudSessionId(newSessionId);
        await SessionsRepository.createSession({
          sessionId: newSessionId,
          gameCode: 'FASTEST_HAND',
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
        console.warn('FastestHand cloud session init notice:', err);
      }
    }
  };

  const handleStartRound = () => {
    soundService.playClick();
    setLockedWinnerId(null);
    setReactionTimeMs(null);
    setSelectedAnswer(null);
    setCountdownNum(3);
    setBuzzerState('COUNTDOWN');
  };

  const handleAnswerSelected = (choiceIdx: number) => {
    setIsAnswerTimerActive(false);
    setSelectedAnswer(choiceIdx);
    setBuzzerState('RESULT');

    const isCorrect = choiceIdx === currentQ.correctAnswer;
    const points = isCorrect ? (currentQ.isSpecial ? 20 : 10) : 0;

    if (isCorrect) {
      soundService.playCorrect();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      if (lockedWinnerId) {
        setTeams((prev) =>
          prev.map((t) => (t.id === lockedWinnerId ? { ...t, score: t.score + points } : t))
        );

        // Cloud sync
        if (apiClient.getMode() === 'cloud' && cloudSessionId) {
          const winningTeam = teams.find((t) => t.id === lockedWinnerId);
          if (winningTeam) {
            ScoresRepository.addScoreEvent({
              sessionId: cloudSessionId,
              gameCode: 'FASTEST_HAND',
              teamCode: winningTeam.teamCode || 'TEAM1',
              teamName: winningTeam.teamName,
              deltaPoints: points,
              totalScoreAfter: winningTeam.score + points,
              roundNumber: currentQIndex + 1,
              reason: `Vòng ${currentQIndex + 1}: Bấm nhanh (${reactionTimeMs}ms) & Đúng`,
            }).catch(() => {});
          }
        }
      }
    } else {
      soundService.playWrong();
    }
  };

  const handleNextRound = () => {
    soundService.playClick();
    if (currentQIndex + 1 >= questions.length) {
      // Finished
      soundService.playChampionFanfare();
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });

      const sorted = [...activeTeams].sort((a, b) => b.score - a.score);
      const winner = sorted[0];

      EduplayStorage.addHistoryEntry({
        gameId: 'fastest-hand',
        gameName: 'AI NHANH HƠN',
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

      setBuzzerState('LEADERBOARD');
    } else {
      setCurrentQIndex((prev) => prev + 1);
      setBuzzerState('IDLE');
      setLockedWinnerId(null);
      setSelectedAnswer(null);
    }
  };

  const sortedTeams = [...activeTeams].sort((a, b) => b.score - a.score);
  const lockedTeam = activeTeams.find((t) => t.id === lockedWinnerId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-slate-950">
      {/* Header */}
      <header className="bg-slate-900/90 border-b border-purple-900/40 px-4 py-2.5 flex items-center justify-between shadow-xl">
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                <span>FASTEST HAND</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  {teamCount} ĐỘI TRANH CHUÔNG
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Đua tốc độ phản xạ • Chuông khóa tự động</p>
            </div>
          </div>
        </div>

        {buzzerState !== 'SETUP' && (
          <button
            onClick={() => setBuzzerState('SETUP')}
            className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700"
          >
            Thiết lập lại
          </button>
        )}
      </header>

      {/* Main Arena */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col justify-center">
        {/* SETUP SCREEN */}
        {buzzerState === 'SETUP' && (
          <div className="max-w-2xl mx-auto w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Thiết Lập Trận Đấu Fastest Hand
              </h2>
              <p className="text-xs text-slate-400">
                Chọn số lượng đội (2, 3 hoặc 4 đội). Mỗi đội sẽ có chuông bấm và phím tắt riêng!
              </p>
            </div>

            {/* Chọn số đội */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  SỐ ĐỘI THAM GIA
                </label>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setShowTeamImportModal(true);
                  }}
                  className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
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
                          ? 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/20 scale-[1.02]'
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

            {/* Nhập tên & Phím bấm từng đội */}
            <div className="space-y-2.5">
              <label className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4" />
                TÊN & PHÍM BẤM CỦA TỪNG ĐỘI
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
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-black">
                        Phím: {BUZZER_HOTKEYS[idx]?.toUpperCase()}
                      </span>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-purple-400"
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

            <button
              onClick={handleStartMatch}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black text-lg shadow-xl shadow-purple-500/20 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider flex items-center justify-center gap-3"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>🔔 BẮT ĐẦU TRANH CHUÔNG ({teamCount} ĐỘI)</span>
            </button>
          </div>
        )}

        {/* IN-GAME (IDLE, COUNTDOWN, RACE_OPEN, LOCKED, ANSWERING, RESULT) */}
        {buzzerState !== 'SETUP' && buzzerState !== 'LEADERBOARD' && (
          <div className="space-y-4">
            {/* Adaptive Team Scoreboard */}
            <TeamScoreboard
              teams={activeTeams}
              activeTeamId={lockedWinnerId}
              size="md"
            />

            {/* Match Status Bar */}
            <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase">CÂU HỎI:</span>
                <span className="text-base font-black text-amber-400">
                  {currentQIndex + 1}/{questions.length}
                </span>
                {currentQ.category && (
                  <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full ml-1 font-semibold">
                    {currentQ.category}
                  </span>
                )}
              </div>

              {buzzerState === 'ANSWERING' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-500 bg-rose-950/80 text-rose-300 font-mono font-black text-sm animate-pulse">
                  <Timer className="w-4 h-4" />
                  <span>{answerTimer}s</span>
                </div>
              )}
            </div>

            {/* Center Interactive Arena */}
            <div className="my-2 flex-1 flex flex-col items-center justify-center min-h-[300px]">
              {/* IDLE state */}
              {buzzerState === 'IDLE' && (
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-16 h-16 rounded-3xl bg-purple-950/80 border-2 border-purple-500 flex items-center justify-center text-purple-400 mx-auto shadow-xl">
                    <Flame className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase">Sẵn sàng tranh chuông?</h2>
                  <p className="text-xs text-slate-300">
                    Khi chuông mở, đội nào bấm chuông trước sẽ giành quyền trả lời câu hỏi và có 15s để ghi điểm!
                  </p>
                  <button
                    onClick={handleStartRound}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black text-base uppercase tracking-wider shadow-xl shadow-purple-500/25 cursor-pointer active:scale-95 transition-transform"
                  >
                    🔔 MỞ CHUÔNG VÒNG NÀY
                  </button>
                </div>
              )}

              {/* COUNTDOWN state */}
              {buzzerState === 'COUNTDOWN' && (
                <div className="text-center space-y-2">
                  <span className="text-sm font-black text-purple-300 uppercase tracking-widest animate-pulse">
                    CHUẨN BỊ BẤM CHUÔNG...
                  </span>
                  <div className="text-8xl md:text-9xl font-black text-amber-400 animate-ping">
                    {countdownNum}
                  </div>
                </div>
              )}

              {/* RACE_OPEN: 2, 3, or 4 Giant Buzzer Buttons */}
              {buzzerState === 'RACE_OPEN' && (
                <div className="w-full space-y-3">
                  <div className="text-center">
                    <span className="px-4 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black uppercase tracking-wider animate-pulse">
                      ⚡ CHUÔNG ĐÃ MỞ! BẤM NHANH HOẶC DÙNG PHÍM TẮT!
                    </span>
                  </div>

                  <div className={`w-full grid ${teamCount === 2 ? 'grid-cols-2' : teamCount === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-4 items-center`}>
                    {activeTeams.map((team, idx) => (
                      <button
                        key={team.id}
                        onClick={() => handleBuzzerPress(team.id)}
                        style={{
                          background: `radial-gradient(circle, ${team.teamColor} 0%, rgba(15, 23, 42, 0.9) 100%)`,
                          borderColor: team.teamColor,
                        }}
                        className="aspect-square max-w-[220px] mx-auto w-full rounded-full border-4 sm:border-8 shadow-2xl flex flex-col items-center justify-center gap-1.5 text-white font-black uppercase tracking-wider active:scale-90 transition-transform cursor-pointer hover:scale-105"
                      >
                        <Zap className="w-8 h-8 sm:w-10 sm:h-10 fill-current animate-bounce" />
                        <span className="text-xs sm:text-sm truncate max-w-[85%]">{team.teamName}</span>
                        <span className="text-[10px] sm:text-xs bg-slate-950/60 px-2.5 py-0.5 rounded-full font-mono font-bold">
                          PHÍM: {BUZZER_HOTKEYS[idx]?.toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* LOCKED Flash state */}
              {buzzerState === 'LOCKED' && lockedTeam && (
                <div className="text-center space-y-3 animate-in zoom-in-50 duration-200">
                  <div
                    style={{ borderColor: lockedTeam.teamColor, color: lockedTeam.teamColor }}
                    className="w-24 h-24 rounded-full border-8 bg-slate-900 flex items-center justify-center mx-auto shadow-2xl animate-pulse"
                  >
                    <Zap className="w-12 h-12 fill-current" />
                  </div>
                  <h3
                    style={{ color: lockedTeam.teamColor }}
                    className="text-2xl sm:text-3xl font-black uppercase tracking-tight"
                  >
                    {lockedTeam.teamName} GIÀNH QUYỀN!
                  </h3>
                  <p className="text-sm font-mono text-emerald-400 font-bold">
                    ⚡ Phản xạ siêu tốc: {reactionTimeMs} ms
                  </p>
                </div>
              )}

              {/* ANSWERING & RESULT states */}
              {(buzzerState === 'ANSWERING' || buzzerState === 'RESULT') && lockedTeam && (
                <div className="w-full bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                  {/* Banner indicating who answers */}
                  <div
                    style={{ borderColor: `${lockedTeam.teamColor}55`, backgroundColor: `${lockedTeam.teamColor}15` }}
                    className="p-3 rounded-2xl border flex items-center justify-between"
                  >
                    <span className="text-xs font-black uppercase" style={{ color: lockedTeam.teamColor }}>
                      Đội trả lời: {lockedTeam.teamName}
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      Tốc độ: {reactionTimeMs}ms
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-black text-white text-center leading-relaxed">
                    {currentQ.question}
                  </h2>

                  {/* 4 Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {currentQ.options.map((opt, idx) => {
                      const label = String.fromCharCode(65 + idx);
                      const isSelected = selectedAnswer === idx;
                      const isCorrect = idx === currentQ.correctAnswer;

                      let btnStyle = 'border-slate-700/80 bg-slate-950/80 hover:bg-slate-800/80 text-slate-200';
                      if (buzzerState === 'RESULT') {
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
                          disabled={buzzerState === 'RESULT'}
                          onClick={() => handleAnswerSelected(idx)}
                          className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 text-left transition-all cursor-pointer font-bold text-sm ${btnStyle}`}
                        >
                          <span className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-purple-400 font-black text-sm shrink-0 border border-slate-700">
                            {label}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {buzzerState === 'RESULT' && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                          {buzzerState === 'RESULT' && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation & Next action */}
                  {buzzerState === 'RESULT' && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                      <div className="text-xs text-slate-300">
                        {selectedAnswer === currentQ.correctAnswer ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Chính xác (+{currentQ.isSpecial ? 20 : 10} điểm)
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Chưa chính xác
                          </span>
                        )}
                      </div>

                      <button
                        onClick={handleNextRound}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-black text-xs uppercase tracking-wider cursor-pointer hover:brightness-110 shadow-lg"
                      >
                        {currentQIndex + 1 >= questions.length ? 'Xem Tổng kết' : 'Vòng tiếp theo →'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {buzzerState === 'LEADERBOARD' && (
          <div className="max-w-xl mx-auto w-full bg-slate-900/95 border-2 border-purple-500/40 rounded-3xl p-6 md:p-8 backdrop-blur shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white mx-auto shadow-2xl shadow-purple-500/30 animate-bounce">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase">
                BẢNG VÀNG FASTEST HAND
              </h2>
              <p className="text-purple-400 font-bold text-sm">
                Chúc mừng các đội đã thể hiện phản xạ chớp nhoáng!
              </p>
            </div>

            {/* Podium */}
            <div className="space-y-3">
              {sortedTeams.map((team, idx) => (
                <div
                  key={team.id}
                  style={{
                    borderColor: idx === 0 ? '#a855f7' : `${team.teamColor}55`,
                    backgroundColor: idx === 0 ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15, 23, 42, 0.8)',
                  }}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between shadow-md ${
                    idx === 0 ? 'scale-[1.02] shadow-purple-500/20 ring-2 ring-purple-400/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center ${
                        idx === 0
                          ? 'bg-purple-500 text-white'
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
                  <span className="text-2xl font-black font-mono text-purple-400 tabular-nums">
                    {team.score}đ
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={handleStartMatch}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110"
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
    </div>
  );
};
