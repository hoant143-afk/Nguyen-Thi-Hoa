import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Home,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Award,
  Clock,
  Zap,
  Users,
  Eye,
  EyeOff,
  AlertTriangle,
  Camera,
  ChevronRight,
  Printer,
  HelpCircle,
  Trophy,
  BookOpen,
  Upload,
  Lock,
  Smile,
  Crown,
  Flame,
  UserX,
} from 'lucide-react';
import { Question, QuestionBankLesson } from '../../types';
import { DEFAULT_QUESTIONS } from '../../data/defaultQuestions';
import { QuestionBankRepository } from '../../repositories/questionBankRepository';
import { ScoresRepository } from '../../repositories/scoresRepository';
import { soundService } from '../../services/soundService';
import {
  SmileDetector,
  SmileGestureMetrics,
  TeamZoneAnalysis,
  TeamZone,
  computeTeamZones,
} from './smileDetector';
import { SmileCalibrationModal, SmileCalibrationSettings } from './SmileCalibrationModal';
import { SmileRaceRepository } from '../../repositories/smileRaceRepository';
import { QuestionBankSelector } from '../../components/common/QuestionBankSelector';
import { QuestionImportModal } from '../../components/common/QuestionImportModal';

export type SmileRaceState =
  | 'SETUP'
  | 'READY'
  | 'COUNTDOWN'
  | 'DETECTING'
  | 'WINNER_LOCKED'
  | 'ANSWERING'
  | 'CORRECT'
  | 'WRONG'
  | 'STEAL'
  | 'STEAL_CORRECT'
  | 'STEAL_WRONG'
  | 'FINISHED'
  | 'TIE';

export interface SmileTeam {
  id: string;
  teamCode: string;
  name: string;
  color: string;
  markerColor: 'blue' | 'orange' | 'green' | 'purple';
  badge: string;
  score: number;
}

interface SmileRaceGameProps {
  onBackToEduplay: () => void;
}

const DEFAULT_SETTINGS: SmileCalibrationSettings = {
  smileThreshold: 0.55,
  markerThreshold: 0.30,
  requiredStableFrames: 3,
  tieThresholdMs: 200,
  stealMode: 'TEACHER_SELECT',
  stealRoundingMode: 'FLOOR',
  maxStealAttempts: 1,
  normalPoints: 10,
  specialPoints: 20,
  questionTimeLimitSeconds: 30,
  showDebugStats: true,
};

export const SmileRaceGame: React.FC<SmileRaceGameProps> = ({ onBackToEduplay }) => {
  // Session & Setup State
  const [gameState, setGameState] = useState<SmileRaceState>('SETUP');
  const [sessionId] = useState<string>(() => `smile_ses_${Date.now()}`);
  const [className] = useState<string>('5A1');
  const [teacherName] = useState<string>('Thầy Hoàng');
  const [schoolName] = useState<string>('Trường Tiểu học Chu Văn An');
  const [teamCount, setTeamCount] = useState<2 | 3 | 4>(2);
  const [teams, setTeams] = useState<SmileTeam[]>([
    { id: 'team_1', teamCode: 'TEAM1', name: 'ĐỘI XANH DƯƠNG', color: '#06b6d4', markerColor: 'blue', badge: '🔵', score: 0 },
    { id: 'team_2', teamCode: 'TEAM2', name: 'ĐỘI CAM RỰC', color: '#f97316', markerColor: 'orange', badge: '🟠', score: 0 },
    { id: 'team_3', teamCode: 'TEAM3', name: 'ĐỘI XANH LÁ', color: '#10b981', markerColor: 'green', badge: '🟢', score: 0 },
    { id: 'team_4', teamCode: 'TEAM4', name: 'ĐỘI TÍM MỘNG', color: '#a855f7', markerColor: 'purple', badge: '🟣', score: 0 },
  ]);

  // Questions State
  const [lessons, setLessons] = useState<QuestionBankLesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // Settings & Calibration
  const [settings, setSettings] = useState<SmileCalibrationSettings>(() => {
    const saved = SmileRaceRepository.loadSettings();
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  });
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  // Webcam & Computer Vision
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const roomCanvasRefs = useRef<{ [teamId: string]: HTMLCanvasElement | null }>({});
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<SmileDetector>(new SmileDetector());
  const animFrameRef = useRef<number | null>(null);

  // Zone Analysis & Live Detection State per Room
  const [zoneAnalyses, setZoneAnalyses] = useState<TeamZoneAnalysis[]>([]);
  const [raceStartTimestamp, setRaceStartTimestamp] = useState<number | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<SmileTeam | null>(null);
  const [winnerReactionTimeMs, setWinnerReactionTimeMs] = useState<number | null>(null);
  const [tieTeamsList, setTieTeamsList] = useState<SmileTeam[]>([]);
  const [countdownNum, setCountdownNum] = useState<string>('3');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [stealTeam, setStealTeam] = useState<SmileTeam | null>(null);
  const [questionTimer, setQuestionTimer] = useState<number>(30);
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string | null>(null);

  // Certificate & Modals
  const [showCertificate, setShowCertificate] = useState<boolean>(false);
  const [showBankModal, setShowBankModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  const activeTeams = React.useMemo(() => teams.slice(0, teamCount), [teams, teamCount]);
  const currentQuestion = questions[currentQuestionIndex] || questions[0];

  // Stable references for computer vision detection loop to prevent stale closures & re-render drops
  const activeTeamsRef = useRef(activeTeams);
  activeTeamsRef.current = activeTeams;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const winnerTeamRef = useRef(winnerTeam);
  winnerTeamRef.current = winnerTeam;

  const raceStartTimestampRef = useRef(raceStartTimestamp);
  raceStartTimestampRef.current = raceStartTimestamp;

  const isWinnerLockedRef = useRef<boolean>(false);
  const stableFramesRef = useRef<Map<string, number>>(new Map());
  const candidateRef = useRef<{ teamId: string; timestamp: number; smileScore: number } | null>(null);
  const winTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load question banks
  useEffect(() => {
    const loadedLessons = QuestionBankRepository.getAllLessons();
    setLessons(loadedLessons);
    if (loadedLessons.length > 0) {
      setSelectedLessonId(loadedLessons[0].id);
    }
  }, []);

  const handleSaveSettings = (newSettings: SmileCalibrationSettings) => {
    setSettings(newSettings);
    SmileRaceRepository.saveSettings(newSettings);
  };

  const handleToggleSound = () => {
    const nextMuted = !isSoundMuted;
    setIsSoundMuted(nextMuted);
    soundService.setMuted(nextMuted);
  };

  // Camera Management
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraErrorMsg(null);
    } catch (err: any) {
      console.warn('Webcam start error', err);
      setCameraErrorMsg(err?.message || 'Không thể mở webcam máy tính.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Initialize camera for rooms
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Question Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (gameState === 'ANSWERING' && questionTimer > 0) {
      interval = setInterval(() => {
        setQuestionTimer((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          if (prev <= 5) soundService.playCountdownTick(prev);
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, questionTimer]);

  const handleTimeUp = () => {
    soundService.playWrong();
    if (gameState === 'ANSWERING') {
      setGameState('STEAL');
    }
  };

  // Lock room winner, trigger celebration and transition to Question
  const lockRoomWinner = useCallback((team: SmileTeam, reactionTimeMs: number) => {
    if (isWinnerLockedRef.current) return;
    isWinnerLockedRef.current = true;
    candidateRef.current = null;

    soundService.playSmileWinner();
    setWinnerTeam(team);
    setWinnerReactionTimeMs(reactionTimeMs);
    setGameState('WINNER_LOCKED');

    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
    });

    if (winTimeoutRef.current) {
      clearTimeout(winTimeoutRef.current);
    }
    // Transition to answering after 700ms (fast & crisp)
    winTimeoutRef.current = setTimeout(() => {
      setQuestionTimer(settingsRef.current.questionTimeLimitSeconds);
      setSelectedAnswer(null);
      setGameState('ANSWERING');
      winTimeoutRef.current = null;
    }, 700);
  }, []);

  // Room-based Computer Vision Detection Loop
  useEffect(() => {
    if (!['SETUP', 'READY', 'COUNTDOWN', 'DETECTING', 'TIE'].includes(gameState)) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const runRoomDetection = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const detector = detectorRef.current;
        const currentActiveTeams = activeTeamsRef.current;
        const currentThreshold = settingsRef.current.smileThreshold;

        // Analyze each team room's zone independently!
        const analyses = await detector.analyzeTeamZones(videoRef.current, currentActiveTeams, currentThreshold);
        setZoneAnalyses(analyses);

        // Render each room's camera viewport on its dedicated canvas with 1:1 aspect ratio!
        analyses.forEach((analysis) => {
          const roomCanvas = roomCanvasRefs.current[analysis.teamId];
          if (roomCanvas && videoRef.current) {
            const isThisRoomWinner = winnerTeamRef.current?.id === analysis.teamId;
            const isThisRoomLocked = Boolean(winnerTeamRef.current && winnerTeamRef.current.id !== analysis.teamId);
            detector.renderZoneToCanvas(
              videoRef.current,
              analysis.zone,
              roomCanvas,
              analysis,
              isThisRoomWinner,
              isThisRoomLocked
            );
          }
        });

        // Detection check: ONLY active during 'DETECTING' phase!
        // In 'READY', 'COUNTDOWN', 'SETUP', 'TIE', 'WINNER_LOCKED', etc.:
        // Computer vision still renders video & smile metrics on canvas, but NEVER locks a winner!
        const currentState = gameStateRef.current;
        const isDetectingActive =
          currentState === 'DETECTING' &&
          !winnerTeamRef.current &&
          !isWinnerLockedRef.current;

        if (isDetectingActive) {
          const now = performance.now();
          const raceStart = raceStartTimestampRef.current || 0;
          const elapsedSinceStart = raceStart > 0 ? now - raceStart : 0;

          // Enforce 180ms physiological reaction time floor after whistle ("😁 CƯỜI!")
          // Prevents someone with an existing face shape or pre-race expression from falsely winning at t=0ms
          if (elapsedSinceStart < 180) {
            stableFramesRef.current.clear();
            candidateRef.current = null;
          } else {
            const minStableFrames = Math.max(3, settingsRef.current.requiredStableFrames || 3);

            // 1. Process each room analysis
            analyses.forEach((analysis) => {
              const teamId = analysis.teamId;
              const hasFace = Boolean(analysis.metrics.faceDetected);

              if (!hasFace) {
                stableFramesRef.current.set(teamId, 0);
                return;
              }

              if (analysis.isSmiling && analysis.smileScore >= currentThreshold) {
                const currentFrames = (stableFramesRef.current.get(teamId) || 0) + 1;
                stableFramesRef.current.set(teamId, currentFrames);

                // Sustained smile qualification:
                // Must hold genuine smile for at least minStableFrames (eliminates 1-frame glitches/talking)
                if (currentFrames >= minStableFrames) {
                  if (!candidateRef.current && !isWinnerLockedRef.current) {
                    candidateRef.current = {
                      teamId,
                      timestamp: now,
                      smileScore: analysis.smileScore,
                    };
                  }
                }
              } else {
                // Smile dropped below threshold
                stableFramesRef.current.set(teamId, 0);
                // If this room was the pending candidate and stopped smiling during tie grace window, cancel!
                if (candidateRef.current?.teamId === teamId) {
                  candidateRef.current = null;
                }
              }
            });

            // 2. Evaluate candidate for Winner vs Tie directly inside the loop
            if (candidateRef.current && !isWinnerLockedRef.current) {
              const candidate = candidateRef.current;
              const tieGraceMs = Math.max(150, settingsRef.current.tieThresholdMs || 200);

              // Check if another room also achieved a sustained smile within tie window
              let tieCandidate: SmileTeam | null = null;
              for (const a of analyses) {
                if (a.teamId !== candidate.teamId && a.isSmiling && a.smileScore >= currentThreshold) {
                  const frames = stableFramesRef.current.get(a.teamId) || 0;
                  if (frames >= minStableFrames) {
                    const other = currentActiveTeams.find((t) => t.id === a.teamId);
                    if (other) {
                      tieCandidate = other;
                      break;
                    }
                  }
                }
              }

              if (tieCandidate) {
                // Tie: Both rooms sustained a smile simultaneously!
                candidateRef.current = null;
                const candTeam = currentActiveTeams.find((t) => t.id === candidate.teamId);
                if (candTeam) {
                  soundService.playWrong();
                  setTieTeamsList([candTeam, tieCandidate]);
                  setGameState('TIE');
                }
              } else if (now - candidate.timestamp >= tieGraceMs) {
                // Decisive Winner: Held genuine smile throughout the tie grace window!
                const winner = currentActiveTeams.find((t) => t.id === candidate.teamId);
                if (winner) {
                  const reactionTime = raceStart
                    ? Math.max(180, Math.round(candidate.timestamp - raceStart))
                    : 350;
                  candidateRef.current = null;
                  lockRoomWinner(winner, reactionTime);
                }
              }
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(runRoomDetection);
    };

    animFrameRef.current = requestAnimationFrame(runRoomDetection);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [gameState, lockRoomWinner]);

  // Keyboard shortcut listener for Teacher: Keys 1, 2, 3, 4 to buzz immediately, Space to countdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (['READY', 'DETECTING'].includes(gameState) && !isWinnerLockedRef.current) {
        if (e.key === '1' && activeTeams[0]) {
          lockRoomWinner(activeTeams[0], 280);
        } else if (e.key === '2' && activeTeams[1]) {
          lockRoomWinner(activeTeams[1], 280);
        } else if (e.key === '3' && activeTeams[2]) {
          lockRoomWinner(activeTeams[2], 280);
        } else if (e.key === '4' && activeTeams[3]) {
          lockRoomWinner(activeTeams[3], 280);
        } else if (e.code === 'Space') {
          e.preventDefault();
          handleStartCountdown();
        }
      } else if (gameState === 'ANSWERING') {
        // Teacher or winner can also press 1-4 or A-D to answer
        if ((e.key === '1' || e.key.toLowerCase() === 'a') && currentQuestion.options[0]) {
          handleSelectAnswer(0);
        } else if ((e.key === '2' || e.key.toLowerCase() === 'b') && currentQuestion.options[1]) {
          handleSelectAnswer(1);
        } else if ((e.key === '3' || e.key.toLowerCase() === 'c') && currentQuestion.options[2]) {
          handleSelectAnswer(2);
        } else if ((e.key === '4' || e.key.toLowerCase() === 'd') && currentQuestion.options[3]) {
          handleSelectAnswer(3);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeTeams, currentQuestion, lockRoomWinner]);

  // Teacher manual override / buzzer click on a room
  const handleManualSelectWinner = (team: SmileTeam) => {
    lockRoomWinner(team, 300);
  };

  // Start Countdown: 3 -> 2 -> 1 -> 😁 CƯỜI!
  const handleStartCountdown = () => {
    isWinnerLockedRef.current = false;
    candidateRef.current = null;
    stableFramesRef.current.clear();
    if (winTimeoutRef.current) {
      clearTimeout(winTimeoutRef.current);
      winTimeoutRef.current = null;
    }
    setWinnerTeam(null);
    setWinnerReactionTimeMs(null);
    setRaceStartTimestamp(null);
    setTieTeamsList([]);
    setGameState('COUNTDOWN');
    setCountdownNum('3');
    soundService.playCountdownTick(3);

    let step = 3;
    const countTimer = setInterval(() => {
      step -= 1;
      if (step === 2) {
        setCountdownNum('2');
        soundService.playCountdownTick(2);
      } else if (step === 1) {
        setCountdownNum('1');
        soundService.playCountdownTick(1);
      } else if (step === 0) {
        setCountdownNum('😁 CƯỜI!');
        soundService.playRunHorn();
      } else {
        clearInterval(countTimer);
        const nowStart = performance.now();
        setRaceStartTimestamp(nowStart);
        raceStartTimestampRef.current = nowStart;
        candidateRef.current = null;
        stableFramesRef.current.clear();
        isWinnerLockedRef.current = false;
        setGameState('DETECTING');
      }
    }, 900);
  };

  // Answer selected by Winner room
  const handleSelectAnswer = (optionIndex: number) => {
    if (!winnerTeam || gameState !== 'ANSWERING') return;
    setSelectedAnswer(optionIndex);
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    const basePts = currentQuestion.isSpecial
      ? currentQuestion.specialPoints || settings.specialPoints
      : currentQuestion.normalPoints || settings.normalPoints;

    if (isCorrect) {
      soundService.playCorrect();
      confetti({ particleCount: 90, spread: 80 });
      setTeams((prev) =>
        prev.map((t) => (t.id === winnerTeam.id ? { ...t, score: t.score + basePts } : t))
      );

      ScoresRepository.recordScore({
        sessionId,
        gameSlug: 'smile-race',
        questionId: currentQuestion.id,
        teamCode: winnerTeam.teamCode,
        eventType: currentQuestion.isSpecial ? 'SPECIAL_CORRECT' : 'RACE_CORRECT',
        points: basePts,
        note: `Phòng ${winnerTeam.name} cười nhanh nhất và trả lời đúng`,
      });

      setGameState('CORRECT');
    } else {
      soundService.playWrong();
      ScoresRepository.recordScore({
        sessionId,
        gameSlug: 'smile-race',
        questionId: currentQuestion.id,
        teamCode: winnerTeam.teamCode,
        eventType: 'RACE_WRONG',
        points: 0,
        note: `Phòng ${winnerTeam.name} trả lời sai`,
      });

      // Prepare Steal
      if (activeTeams.length === 2) {
        const otherTeam = activeTeams.find((t) => t.id !== winnerTeam.id) || activeTeams[0];
        setStealTeam(otherTeam);
        setGameState('STEAL');
      } else {
        setStealTeam(null);
        setGameState('STEAL');
      }
    }
  };

  const calculateStealPoints = (): number => {
    const origPts = currentQuestion.isSpecial
      ? currentQuestion.specialPoints || settings.specialPoints
      : currentQuestion.normalPoints || settings.normalPoints;
    return Math.floor(origPts / 2);
  };

  const handleStealAnswer = (optionIndex: number) => {
    if (!stealTeam || gameState !== 'STEAL') return;
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    const stealPts = calculateStealPoints();

    if (isCorrect) {
      soundService.playCorrect();
      confetti({ particleCount: 75, spread: 65 });
      setTeams((prev) =>
        prev.map((t) => (t.id === stealTeam.id ? { ...t, score: t.score + stealPts } : t))
      );
      setGameState('STEAL_CORRECT');
    } else {
      soundService.playWrong();
      setGameState('STEAL_WRONG');
    }
  };

  const handleProceedNext = () => {
    detectorRef.current.resetBaseline();
    isWinnerLockedRef.current = false;
    candidateRef.current = null;
    stableFramesRef.current.clear();
    setRaceStartTimestamp(null);
    raceStartTimestampRef.current = null;
    if (winTimeoutRef.current) {
      clearTimeout(winTimeoutRef.current);
      winTimeoutRef.current = null;
    }
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setWinnerTeam(null);
      setWinnerReactionTimeMs(null);
      setStealTeam(null);
      setSelectedAnswer(null);
      setGameState('READY');
    } else {
      soundService.playChampionFanfare();
      confetti({ particleCount: 130, spread: 110 });
      setGameState('FINISHED');
    }
  };

  const handleStartGameFromSetup = () => {
    isWinnerLockedRef.current = false;
    candidateRef.current = null;
    stableFramesRef.current.clear();
    setRaceStartTimestamp(null);
    raceStartTimestampRef.current = null;
    if (winTimeoutRef.current) {
      clearTimeout(winTimeoutRef.current);
      winTimeoutRef.current = null;
    }
    if (selectedLessonId) {
      const lesson = lessons.find((l) => l.id === selectedLessonId);
      if (lesson && lesson.questions.length > 0) {
        setQuestions(lesson.questions);
      }
    }
    setCurrentQuestionIndex(0);
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
    setWinnerTeam(null);
    setGameState('READY');
  };

  const sortedTeams = [...activeTeams].sort((a, b) => b.score - a.score);
  const championTeam = sortedTeams[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Hidden Source Webcam Video */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* Top Navbar */}
      <header className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex items-center justify-between z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundService.playClick();
              onBackToEduplay();
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Trang Chủ Eduplay</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">😁</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-wide bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 bg-clip-text text-transparent">
                  SMILE RACE
                </span>
                <span className="px-2 py-0.2 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ĐẠI CHIẾN NỤ CƯỜI
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Counter & Controls */}
        <div className="flex items-center gap-2.5">
          {gameState !== 'SETUP' && gameState !== 'FINISHED' && (
            <div className="bg-slate-800/90 border border-slate-700 px-3 py-1 rounded-xl text-xs flex items-center gap-2 font-bold">
              <span className="text-slate-400">Câu hỏi:</span>
              <span className="text-amber-400 font-extrabold text-sm">{currentQuestionIndex + 1}</span>
              <span className="text-slate-500">/{questions.length}</span>
            </div>
          )}

          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${
              showDebug ? 'bg-purple-900/60 text-purple-300 border-purple-500' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Bật/Tắt HUD Chi tiết"
          >
            {showDebug ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsCalibrationOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Mở bảng hiệu chuẩn nụ cười"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Căn Chỉnh</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
            title={isSoundMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Game Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col justify-between">
        {/* ============================================================ */}
        {/* SCREEN 1: SETUP SCREEN */}
        {/* ============================================================ */}
        {gameState === 'SETUP' && (
          <div className="flex-1 flex items-center justify-center py-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border-2 border-amber-400/40 shadow-2xl max-w-2xl w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="text-5xl inline-block animate-bounce">😁</span>
                <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 bg-clip-text text-transparent">
                  SMILE RACE – ĐẠI CHIẾN NỤ CƯỜI
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Camera chia khung phòng cho từng đội. Đội nào trong phòng của mình cười trước sẽ giành quyền trả lời câu hỏi!
                </p>
              </div>

              {/* Number of Rooms/Teams */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Số lượng phòng thi đấu (2 – 4 đội):
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTeamCount(num as any)}
                      className={`py-3 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        teamCount === num
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/20 scale-102'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{num} PHÒNG</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rooms & Teams Configuration */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Tên phòng & Đội đại diện:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTeams.map((team, idx) => (
                    <div
                      key={team.id}
                      className="p-3 rounded-2xl border border-slate-800 bg-slate-950/70 flex items-center gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md shrink-0"
                        style={{ backgroundColor: team.color }}
                      >
                        P{idx + 1}
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTeams((prev) =>
                              prev.map((t) => (t.id === team.id ? { ...t, name: val } : t))
                            );
                          }}
                          className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                        />
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span>Vị trí:</span>
                          <span className="font-semibold" style={{ color: team.color }}>
                            {teamCount === 2
                              ? idx === 0 ? 'Nửa Trái camera' : 'Nửa Phải camera'
                              : teamCount === 3
                              ? `Cột ${idx + 1} camera`
                              : `Góc ${idx === 0 ? 'Trên-Trái' : idx === 1 ? 'Trên-Phải' : idx === 2 ? 'Dưới-Trái' : 'Dưới-Phải'}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Question Bank Selection */}
              <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Bộ câu hỏi thi đấu:
                      </div>
                      <div className="text-sm font-black text-slate-200">
                        {lessons.find((l) => l.id === selectedLessonId)?.lessonTitle || 'Bộ câu hỏi mặc định'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBankModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Chọn Ngân Hàng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Nhập Excel</span>
                    </button>
                  </div>
                </div>

                <select
                  value={selectedLessonId}
                  onChange={(e) => {
                    setSelectedLessonId(e.target.value);
                    const l = lessons.find((x) => x.id === e.target.value);
                    if (l) {
                      setQuestions(l.questions);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-200 bg-slate-900 focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Chọn bài học từ ngân hàng --</option>
                  {lessons.map((ls) => (
                    <option key={ls.id} value={ls.id}>
                      [Khối {ls.grade} - {ls.subject}] {ls.lessonTitle} ({ls.questions.length} câu)
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartGameFromSetup}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.01] uppercase tracking-wider"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>VÀO ĐẤU TRƯỜNG PHÒNG NỤ CƯỜI</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 2: TEAM ROOMS ARENA (READY, COUNTDOWN, DETECTING, WINNER_LOCKED, TIE) */}
        {/* ============================================================ */}
        {['READY', 'COUNTDOWN', 'DETECTING', 'WINNER_LOCKED', 'TIE'].includes(gameState) && (
          <div className="flex-1 flex flex-col gap-3 min-h-[460px]">
            {/* Active Question Banner: Shows the contested question clearly */}
            <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs">
                    CÂU {currentQuestionIndex + 1}/{questions.length}
                  </span>
                  {currentQuestion.isSpecial && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 font-extrabold text-[11px]">
                      ⭐ CÂU ĐẶC BIỆT +{currentQuestion.specialPoints || settings.specialPoints}Đ
                    </span>
                  )}
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    (Phím tắt: <strong>1, 2, 3, 4</strong> để chọn thắng tức thì)
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                  {currentQuestion.question}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-black text-amber-300 bg-amber-950/60 border border-amber-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-current animate-bounce" />
                  <span>Phòng nào cười trước giành quyền trả lời!</span>
                </span>
              </div>
            </div>

            {/* Arena Header & Instructions */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wide">
                  {gameState === 'READY' && '⚡ ĐẤU TRƯỜNG ĐANG MỞ: PHÒNG NÀO CƯỜI TRƯỚC SẼ GIÀNH QUYỀN TRẢ LỜI NGAY!'}
                  {gameState === 'COUNTDOWN' && '⚡ ĐẾM NGƯỢC... CHUẨN BỊ NỤ CƯỜI RẠNG RỠ!'}
                  {gameState === 'DETECTING' && '😁 CƯỜI ĐI NÀO! PHÒNG NÀO CƯỜI TRƯỚC SẼ GIÀNH QUYỀN TRẢ LỜI!'}
                  {gameState === 'WINNER_LOCKED' && `👑 ${winnerTeam?.name} ĐÃ CƯỜI TRƯỚC! ĐANG MỞ CÂU HỎI...`}
                  {gameState === 'TIE' && '⚡ HAI PHÒNG CƯỜI CÙNG LÚC! BẤT PHÂN THẮNG BẠI!'}
                </span>
              </div>

              {/* Ready Trigger Button */}
              {gameState === 'READY' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartCountdown}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer transition-all uppercase tracking-wider transform hover:scale-105 active:scale-95"
                    title="Bấm hoặc gõ phím Space để đếm ngược 3-2-1"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>ĐẾM NGƯỢC 3-2-1 (Phím Cách)</span>
                  </button>
                </div>
              )}

              {gameState === 'WINNER_LOCKED' && (
                <button
                  onClick={() => {
                    if (winTimeoutRef.current) {
                      clearTimeout(winTimeoutRef.current);
                      winTimeoutRef.current = null;
                    }
                    setQuestionTimer(settingsRef.current.questionTimeLimitSeconds);
                    setSelectedAnswer(null);
                    setGameState('ANSWERING');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 flex items-center gap-1.5 cursor-pointer transition-all animate-pulse"
                >
                  <Crown className="w-4 h-4 fill-current" />
                  <span>VÀO TRẢ LỜI NGAY ➔</span>
                </button>
              )}

              {gameState === 'TIE' && (
                <button
                  onClick={handleStartCountdown}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>CƯỜI LẠI!</span>
                </button>
              )}
            </div>

            {/* TEAM ROOMS GRID (Split View like broadcast booths) */}
            <div
              className={`flex-1 grid gap-3.5 sm:gap-4 relative ${
                teamCount === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : teamCount === 3
                  ? 'grid-cols-1 md:grid-cols-3'
                  : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              {activeTeams.map((team, idx) => {
                const isWinner = winnerTeam?.id === team.id;
                const isLocked = Boolean(winnerTeam && winnerTeam.id !== team.id);
                const analysis = zoneAnalyses.find((a) => a.teamId === team.id);
                const hasPerson = Boolean(analysis?.metrics.faceDetected);
                const smilePercent = hasPerson ? Math.round((analysis?.smileScore || 0) * 100) : 0;
                const thresholdPercent = Math.round(settings.smileThreshold * 100);
                const isSmilingNow = hasPerson && (analysis?.smileScore || 0) >= settings.smileThreshold;

                return (
                  <div
                    key={team.id}
                    className={`relative rounded-3xl border-3 flex flex-col justify-between overflow-hidden transition-all duration-300 bg-slate-900/90 shadow-xl max-w-[560px] mx-auto w-full ${
                      isWinner
                        ? 'border-amber-400 ring-4 ring-amber-400/50 scale-[1.02] shadow-amber-500/30'
                        : isLocked
                        ? 'border-slate-800 opacity-60'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                    style={{
                      borderColor: isWinner ? '#fbbf24' : isLocked ? '#334155' : team.color,
                    }}
                  >
                    {/* Room Header Banner */}
                    <div
                      className="px-4 py-2.5 flex items-center justify-between border-b"
                      style={{
                        backgroundColor: `${team.color}15`,
                        borderColor: `${team.color}35`,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-xs"
                          style={{ backgroundColor: team.color }}
                        >
                          P{idx + 1}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black tracking-wide" style={{ color: team.color }}>
                            {team.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {idx === 0 ? 'Phòng Trái' : idx === 1 ? 'Phòng Phải' : `Phòng ${idx + 1}`}
                          </div>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center gap-2">
                        <div className="text-xl sm:text-2xl font-black text-amber-300 tabular-nums">
                          {team.score}đ
                        </div>
                      </div>
                    </div>

                    {/* Room Camera Viewport: aspect-[4/3] compact & crisp, NO facial stretching! */}
                    <div className="relative w-full aspect-[4/3] max-h-[260px] sm:max-h-[300px] mx-auto bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center p-0.5">
                      <canvas
                        ref={(el) => {
                          roomCanvasRefs.current[team.id] = el;
                        }}
                        width={480}
                        height={360}
                        className="w-full h-full block rounded-xl"
                      />

                      {/* Room Status Indicator Chip */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/60 text-[11px] font-bold">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isWinner
                              ? 'bg-amber-400 animate-ping'
                              : isLocked
                              ? 'bg-slate-600'
                              : isSmilingNow
                              ? 'bg-emerald-400 animate-pulse'
                              : hasPerson
                              ? 'bg-cyan-400'
                              : 'bg-rose-500/80'
                          }`}
                        />
                        <span className="text-slate-200">
                          {isWinner
                            ? '👑 ĐÃ CHIẾN THẮNG'
                            : isLocked
                            ? '🔒 ĐÃ KHÓA'
                            : !hasPerson
                            ? '👤 CHƯA CÓ NGƯỜI'
                            : isSmilingNow
                            ? '😁 ĐANG CƯỜI!'
                            : 'ĐANG CHỜ NỤ CƯỜI...'}
                        </span>
                      </div>

                      {/* Floating Smile Expression Badge */}
                      <div className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-slate-700/60 text-xs font-black flex items-center gap-1">
                        {hasPerson ? (
                          <>
                            <span>
                              {smilePercent >= 80 ? '🌟😁' : smilePercent >= 50 ? '😄' : smilePercent >= 30 ? '🙂' : '😐'}
                            </span>
                            <span className="text-amber-400 font-mono">{smilePercent}%</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-400 font-mono text-[11px]">Trống</span>
                          </>
                        )}
                      </div>

                      {/* Winner Overlay for Room */}
                      {isWinner && (
                        <div
                          onClick={() => {
                            if (winTimeoutRef.current) {
                              clearTimeout(winTimeoutRef.current);
                              winTimeoutRef.current = null;
                            }
                            setQuestionTimer(settingsRef.current.questionTimeLimitSeconds);
                            setSelectedAnswer(null);
                            setGameState('ANSWERING');
                          }}
                          className="absolute inset-0 bg-amber-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center pointer-events-auto cursor-pointer animate-in fade-in zoom-in-95 duration-200"
                        >
                          <Crown className="w-12 h-12 text-amber-300 drop-shadow-md animate-bounce" />
                          <h3 className="text-lg sm:text-2xl font-black text-amber-300 drop-shadow-lg mt-1">
                            CƯỜI NHANH NHẤT!
                          </h3>
                          <div className="text-xs sm:text-sm font-bold text-amber-100 bg-amber-500/30 px-3 py-1 rounded-full border border-amber-400/50 mt-1">
                            Phản xạ: <span className="font-mono text-cyan-300 font-extrabold">{winnerReactionTimeMs}ms</span>
                          </div>
                          <span className="mt-2.5 px-3.5 py-1 rounded-xl bg-amber-400 text-slate-950 text-xs font-black shadow-md flex items-center gap-1 hover:scale-105 transition-all">
                            VÀO TRẢ LỜI NGAY ➔
                          </span>
                        </div>
                      )}

                      {/* Locked Overlay for other Rooms */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-slate-400">
                          <Lock className="w-8 h-8 text-slate-500 mb-1" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Đã bị khóa</span>
                        </div>
                      )}
                    </div>

                    {/* Room Smile Meter Gauge */}
                    <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Smile className="w-3.5 h-3.5 text-amber-400" />
                          <span>Độ tươi nụ cười:</span>
                        </span>
                        {hasPerson ? (
                          <span className="font-mono text-xs font-extrabold" style={{ color: team.color }}>
                            {smilePercent}%{' '}
                            <span className="text-[10px] text-slate-400 font-normal">
                              (Ngưỡng đạt: {thresholdPercent}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal italic">
                            Chưa có người trong phòng
                          </span>
                        )}
                      </div>

                      {/* Progress Bar with Threshold Marker */}
                      <div className="relative w-full h-3.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                        <div
                          className="h-full transition-all duration-75 rounded-full"
                          style={{
                            width: `${Math.min(100, smilePercent)}%`,
                            backgroundColor: smilePercent >= thresholdPercent ? '#fbbf24' : team.color,
                            boxShadow:
                              smilePercent >= thresholdPercent
                                ? '0 0 10px rgba(251, 191, 36, 0.7)'
                                : 'none',
                          }}
                        />
                        {/* Threshold Indicator Line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white/70 shadow-sm pointer-events-none"
                          style={{ left: `${thresholdPercent}%` }}
                          title={`Ngưỡng đạt: ${thresholdPercent}%`}
                        />
                      </div>

                      {/* Teacher Manual Click / Buzzer Fallback */}
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {isSmilingNow ? '✅ Cười đạt chuẩn!' : 'Nhận diện tự động'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleManualSelectWinner(team)}
                          disabled={gameState !== 'READY' && gameState !== 'DETECTING'}
                          className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 text-[11px] font-black border border-amber-500/40 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
                          title={`Bấm chọn phòng này thắng ngay hoặc ấn phím ${idx + 1}`}
                        >
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>Thắng ngay (Phím {idx + 1})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Big Screen Central Countdown Overlay */}
              <AnimatePresence>
                {gameState === 'COUNTDOWN' && (
                  <motion.div
                    key={countdownNum}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className="absolute inset-0 z-40 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none"
                  >
                    <span className="text-7xl sm:text-9xl font-black text-amber-400 drop-shadow-[0_10px_30px_rgba(251,191,36,0.8)]">
                      {countdownNum}
                    </span>
                    <span className="text-sm sm:text-base font-black text-amber-200 uppercase tracking-widest mt-2">
                      Chuẩn bị nụ cười rạng rỡ nhất!
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tie Notification Overlay */}
              {gameState === 'TIE' && (
                <div className="absolute inset-0 z-40 bg-amber-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white rounded-3xl">
                  <span className="text-6xl animate-bounce mb-2">⚡</span>
                  <h3 className="text-2xl sm:text-3xl font-black text-amber-300">CƯỜI QUÁ SÁT NHAU!</h3>
                  <p className="text-sm text-amber-100 max-w-md mt-1">
                    Cả hai phòng cùng cười trong vòng {settings.tieThresholdMs}ms! Bất phân thắng bại!
                  </p>
                  <button
                    onClick={handleStartCountdown}
                    className="mt-4 px-6 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-xl flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>😁 CƯỜI ĐỌ LẠI NGAY!</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 3: QUESTION & ANSWERING (ANSWERING, CORRECT, WRONG, STEAL) */}
        {/* ============================================================ */}
        {['ANSWERING', 'CORRECT', 'WRONG', 'STEAL', 'STEAL_CORRECT', 'STEAL_WRONG'].includes(gameState) && (
          <div className="flex-1 flex flex-col gap-4">
            {/* Winner Announcement Banner */}
            <div
              className="rounded-2xl p-3 border-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg"
              style={{
                backgroundColor: `${winnerTeam?.color}20`,
                borderColor: winnerTeam?.color || '#fbbf24',
              }}
            >
              <div className="flex items-center gap-2.5">
                <Crown className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Quyền trả lời thuộc về:
                  </span>
                  <span className="text-base sm:text-lg font-black tracking-wide" style={{ color: winnerTeam?.color }}>
                    {winnerTeam?.name} ({winnerReactionTimeMs}ms)
                  </span>
                </div>
              </div>

              {/* Timer */}
              {gameState === 'ANSWERING' && (
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-4 py-1.5 rounded-xl font-bold">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-400">Thời gian suy nghĩ:</span>
                  <span className={`text-base font-black font-mono ${questionTimer <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                    {questionTimer}s
                  </span>
                </div>
              )}

              {/* Points Bounty */}
              <div className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-bold text-amber-300">
                {currentQuestion.isSpecial
                  ? `⭐ CÂU ĐẶC BIỆT +${currentQuestion.specialPoints || settings.specialPoints}Đ`
                  : `+${currentQuestion.normalPoints || settings.normalPoints} Điểm`}
              </div>
            </div>

            {/* Question Box & Answers */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl flex-1 flex flex-col justify-between gap-5">
              {/* Question Text */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Câu hỏi số {currentQuestionIndex + 1}
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white leading-relaxed">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Steal Banner */}
              {gameState === 'STEAL' && (
                <div className="bg-purple-950/60 border-2 border-purple-400 rounded-2xl p-4 text-center space-y-2 animate-in fade-in">
                  <div className="text-xs sm:text-sm font-black text-purple-300 uppercase tracking-wide flex items-center justify-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400 fill-current" />
                    <span>CƠ HỘI CƯỚP QUYỀN TRẢ LỜI CHO CÁC PHÒNG CÒN LẠI!</span>
                  </div>
                  <p className="text-xs text-purple-200">
                    Phòng cướp trả lời đúng sẽ nhận: <span className="font-black text-amber-300">+{calculateStealPoints()} điểm</span>
                  </p>

                  {!stealTeam && (
                    <div className="pt-2 flex flex-wrap gap-2 justify-center">
                      <span className="text-xs text-slate-300 font-bold self-center mr-1">Chọn phòng cướp:</span>
                      {activeTeams
                        .filter((t) => t.id !== winnerTeam?.id)
                        .map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setStealTeam(t)}
                            className="px-3 py-1.5 rounded-xl font-black text-xs text-slate-950 cursor-pointer shadow-md transition-all hover:scale-105"
                            style={{ backgroundColor: t.color }}
                          >
                            {t.name}
                          </button>
                        ))}
                    </div>
                  )}

                  {stealTeam && (
                    <div className="text-xs font-black text-amber-300">
                      Phòng cướp đang trả lời: <span className="underline">{stealTeam.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Result Notifications */}
              {['CORRECT', 'STEAL_CORRECT'].includes(gameState) && (
                <div className="bg-emerald-950/70 border-2 border-emerald-400 rounded-2xl p-4 text-center space-y-1 animate-in zoom-in-95">
                  <div className="text-base sm:text-lg font-black text-emerald-300 flex items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                    <span>CHÍNH XÁC! XUẤT SẮC!</span>
                  </div>
                  <p className="text-xs text-emerald-200">
                    Điểm thưởng đã được cộng vào bảng điểm của phòng!
                  </p>
                  {currentQuestion.explanation && (
                    <p className="text-xs text-slate-300 pt-1 border-t border-emerald-800/60 mt-2">
                      <strong className="text-emerald-300">Giải thích: </strong>{currentQuestion.explanation}
                    </p>
                  )}
                </div>
              )}

              {['WRONG', 'STEAL_WRONG'].includes(gameState) && (
                <div className="bg-rose-950/70 border-2 border-rose-400 rounded-2xl p-4 text-center space-y-1 animate-in zoom-in-95">
                  <div className="text-base sm:text-lg font-black text-rose-300 flex items-center justify-center gap-2">
                    <XCircle className="w-6 h-6 text-rose-400" />
                    <span>CHƯA CHÍNH XÁC!</span>
                  </div>
                  {currentQuestion.explanation && (
                    <p className="text-xs text-slate-300 pt-1 border-t border-rose-800/60 mt-2">
                      <strong className="text-rose-300">Giải thích: </strong>{currentQuestion.explanation}
                    </p>
                  )}
                </div>
              )}

              {/* 4 Choices A, B, C, D */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrectAnswer = idx === currentQuestion.correctAnswer;
                  const showResult = ['CORRECT', 'STEAL_CORRECT', 'STEAL_WRONG'].includes(gameState);

                  let btnStyle = 'bg-slate-800/90 border-slate-700 text-slate-200 hover:border-slate-500';

                  if (showResult) {
                    if (isCorrectAnswer) {
                      btnStyle = 'bg-emerald-950/90 border-emerald-400 text-emerald-200 font-bold ring-2 ring-emerald-400/50';
                    } else if (isSelected && !isCorrectAnswer) {
                      btnStyle = 'bg-rose-950/90 border-rose-400 text-rose-200 line-through opacity-80';
                    } else {
                      btnStyle = 'bg-slate-900 border-slate-800 text-slate-400 opacity-60';
                    }
                  } else if (isSelected) {
                    btnStyle = 'bg-amber-950/90 border-amber-400 text-amber-200 font-bold';
                  }

                  const isDisabled =
                    !['ANSWERING', 'STEAL'].includes(gameState) ||
                    (gameState === 'STEAL' && !stealTeam);

                  return (
                    <button
                      key={idx}
                      disabled={isDisabled}
                      onClick={() => {
                        soundService.playClick();
                        if (gameState === 'ANSWERING') {
                          handleSelectAnswer(idx);
                        } else if (gameState === 'STEAL') {
                          handleStealAnswer(idx);
                        }
                      }}
                      className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left font-medium text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer ${btnStyle} ${
                        isDisabled ? 'cursor-default' : 'hover:scale-[1.01] active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 font-black text-xs flex items-center justify-center text-amber-400 shrink-0">
                          {['A', 'B', 'C', 'D'][idx]}
                        </span>
                        <span className="leading-snug">{option}</span>
                      </div>
                      {showResult && isCorrectAnswer && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Next Question / Final Result Button */}
              {['CORRECT', 'STEAL_CORRECT', 'STEAL_WRONG'].includes(gameState) && (
                <div className="pt-2">
                  <button
                    onClick={handleProceedNext}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider"
                  >
                    <span>{currentQuestionIndex < questions.length - 1 ? 'QUAY VỀ PHÒNG CHO CÂU TIẾP THEO' : 'XEM KẾT QUẢ CHUNG CUỘC'}</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 4: FINISHED PODIUM & CERTIFICATE */}
        {/* ============================================================ */}
        {gameState === 'FINISHED' && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 animate-in fade-in">
            <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border-2 border-amber-400/50 shadow-2xl max-w-2xl w-full text-center space-y-6">
              <span className="text-6xl inline-block animate-bounce">🏆</span>
              <div>
                <h2 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 bg-clip-text text-transparent">
                  CHÚC MỪNG QUÁN QUÂN SMILE RACE!
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Đại chiến nụ cười kết thúc thành công rực rỡ với tinh thần thi đua sôi nổi!
                </p>
              </div>

              {/* Podium Ranking */}
              <div className="space-y-3">
                {sortedTeams.map((team, rank) => (
                  <div
                    key={team.id}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                      rank === 0
                        ? 'bg-amber-500/20 border-amber-400 shadow-lg scale-102'
                        : rank === 1
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '🎖️'}
                      </span>
                      <div className="text-left">
                        <div className="text-sm sm:text-base font-black text-white">{team.name}</div>
                        <div className="text-xs text-slate-400">Hạng {rank + 1}</div>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-400">{team.score} Điểm</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowCertificate(true)}
                  className="py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all uppercase"
                >
                  <Printer className="w-4 h-4" />
                  <span>XUẤT GIẤY KHEN VÔ ĐỊCH</span>
                </button>

                <button
                  onClick={() => setGameState('SETUP')}
                  className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all uppercase"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>CHƠI LƯỢT MỚI</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* CERTIFICATE MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showCertificate && championTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border-4 border-amber-400 shadow-2xl space-y-5 text-center relative"
            >
              <div className="border-2 border-amber-300 rounded-2xl p-6 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/50 space-y-4">
                <div className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                  {schoolName} • LỚP {className}
                </div>
                <div className="text-4xl">🏆</div>
                <h2 className="text-2xl sm:text-3xl font-black text-amber-700 tracking-wider uppercase">
                  GIẤY CHỨNG NHẬN VÔ ĐỊCH
                </h2>
                <p className="text-xs text-slate-600">Trao tặng cho tập thể:</p>
                <div className="text-2xl sm:text-3xl font-black text-purple-900 underline decoration-amber-400 decoration-wavy">
                  {championTeam.name}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 max-w-md mx-auto leading-relaxed">
                  Đã xuất sắc giành ngôi vị Quán quân trò chơi <strong>SMILE RACE – ĐẠI CHIẾN NỤ CƯỜI</strong> với tốc độ phản xạ nụ cười rạng rỡ và thành tích xuất sắc ({championTeam.score} điểm)!
                </p>

                <div className="pt-4 flex justify-between items-end text-xs text-slate-600 px-6">
                  <div>
                    <div>Ngày {new Date().toLocaleDateString('vi-VN')}</div>
                    <div className="font-bold">Ban Tổ Chức Eduplay</div>
                  </div>
                  <div>
                    <div className="font-bold">Giáo viên phụ trách</div>
                    <div className="font-bold text-slate-900 mt-4">{teacherName}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCertificate(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In giấy khen</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Camera Calibration Modal */}
      <SmileCalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        teams={activeTeams}
      />

      {/* Question Bank Selector Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto p-4 sm:p-6 text-slate-100">
            <QuestionBankSelector
              selectedLessonId={selectedLessonId}
              isModal={true}
              onClose={() => setShowBankModal(false)}
              onSelectLesson={(lesson) => {
                setSelectedLessonId(lesson.id);
                setQuestions(lesson.questions);
                setLessons(QuestionBankRepository.getAllLessons());
                setShowBankModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Question Import Modal */}
      {showImportModal && (
        <QuestionImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          currentQuestions={questions}
          saveAsLesson={true}
          onImportLessonSuccess={(newLesson, newQuestions) => {
            const all = QuestionBankRepository.getAllLessons();
            setLessons(all);
            setSelectedLessonId(newLesson.id);
            setQuestions(newQuestions);
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
