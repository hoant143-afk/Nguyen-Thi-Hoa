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
  Edit3,
  HelpCircle,
  Trophy,
} from 'lucide-react';
import { Question, QuestionBankLesson } from '../../types';
import { DEFAULT_QUESTIONS } from '../../data/defaultQuestions';
import { DEFAULT_TEAM_PRESETS } from '../../data/classData';
import { QuestionBankRepository } from '../../repositories/questionBankRepository';
import { ScoresRepository } from '../../repositories/scoresRepository';
import { soundService } from '../../services/soundService';
import { apiClient } from '../../services/apiClient';
import { SmileDetector, SmileGestureMetrics, TeamMarkerResult } from './smileDetector';
import { SmileCalibrationModal, SmileCalibrationSettings } from './SmileCalibrationModal';
import { SmileRaceRepository } from '../../repositories/smileRaceRepository';

export type SmileRaceState =
  | 'SETUP'
  | 'READY'
  | 'COUNTDOWN'
  | 'SMILE_ARMED'
  | 'DETECTING'
  | 'WINNER_LOCKED'
  | 'QUESTION'
  | 'ANSWERING'
  | 'CORRECT'
  | 'WRONG'
  | 'STEAL'
  | 'STEAL_CORRECT'
  | 'STEAL_WRONG'
  | 'REVEAL'
  | 'NEXT'
  | 'FINISHED'
  | 'TIE'
  | 'CAMERA_ERROR'
  | 'PAUSED';

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
  smileThreshold: 0.60,
  markerThreshold: 0.35,
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
  const [previousState, setPreviousState] = useState<SmileRaceState>('READY');
  const [sessionId] = useState<string>(() => `smile_ses_${Date.now()}`);
  const [className, setClassName] = useState<string>('5A1');
  const [teacherName, setTeacherName] = useState<string>('Thầy Hoàng');
  const [schoolName, setSchoolName] = useState<string>('Trường Tiểu học Chu Văn An');
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
  const [showDebug, setShowDebug] = useState<boolean>(true);

  // Webcam & Computer Vision
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<SmileDetector>(new SmileDetector());
  const animFrameRef = useRef<number | null>(null);

  // Race Timing & Candidates
  const [raceStartTimestamp, setRaceStartTimestamp] = useState<number | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<SmileTeam | null>(null);
  const [winnerReactionTimeMs, setWinnerReactionTimeMs] = useState<number | null>(null);
  const [winnerSmileScore, setWinnerSmileScore] = useState<number | null>(null);
  const [tieTeamsList, setTieTeamsList] = useState<SmileTeam[]>([]);
  const [countdownNum, setCountdownNum] = useState<string>('3');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [stealTeam, setStealTeam] = useState<SmileTeam | null>(null);
  const [questionTimer, setQuestionTimer] = useState<number>(30);
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string | null>(null);

  // Live CV Metrics
  const [currentMetrics, setCurrentMetrics] = useState<SmileGestureMetrics | null>(null);
  const [detectedMarkers, setDetectedMarkers] = useState<TeamMarkerResult[]>([]);
  const [liveStableFrames, setLiveStableFrames] = useState<number>(0);
  const [hasNeutralBaseline, setHasNeutralBaseline] = useState<boolean>(false);

  // Certificate Modal State
  const [showCertificate, setShowCertificate] = useState<boolean>(false);

  // Active teams subset
  const activeTeams = teams.slice(0, teamCount);
  const currentQuestion = questions[currentQuestionIndex] || questions[0];

  // Load question banks
  useEffect(() => {
    const loadedLessons = QuestionBankRepository.getAllLessons();
    setLessons(loadedLessons);
    if (loadedLessons.length > 0) {
      setSelectedLessonId(loadedLessons[0].id);
    }
  }, []);

  // Save settings when changed
  const handleSaveSettings = (newSettings: SmileCalibrationSettings) => {
    setSettings(newSettings);
    SmileRaceRepository.saveSettings(newSettings);
  };

  // Toggle audio sound
  const handleToggleSound = () => {
    const nextMuted = !isSoundMuted;
    setIsSoundMuted(nextMuted);
    soundService.setMuted(nextMuted);
  };

  // Start Camera
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
      setCameraErrorMsg(err?.message || 'Không thể mở webcam');
    }
  }, []);

  // Stop Camera
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

  // Init Camera when ready
  useEffect(() => {
    if (['READY', 'COUNTDOWN', 'SMILE_ARMED', 'DETECTING', 'TIE'].includes(gameState)) {
      startCamera();
    }
    return () => {
      // Don't kill camera if transitioning within active race
    };
  }, [gameState, startCamera]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Question Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (gameState === 'ANSWERING' && questionTimer > 0) {
      interval = setInterval(() => {
        setQuestionTimer((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          if (prev <= 6) soundService.playCountdownTick(prev);
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
      // Move to steal
      setGameState('STEAL');
    }
  };

  // Computer Vision Detection Loop
  useEffect(() => {
    if (!['READY', 'SMILE_ARMED', 'DETECTING'].includes(gameState) || !videoRef.current) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let stableFramesCounter = 0;
    const candidatesMap = new Map<string, { timestamp: number; smileScore: number; markerConf: number }>();
    let tieCheckTimeout: NodeJS.Timeout | null = null;

    const runDetection = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const detector = detectorRef.current;
        const metrics = await detector.analyzeFrame(videoRef.current);
        const markers = detector.detectTeamMarker(videoRef.current, activeTeams, metrics.faceBox);

        setCurrentMetrics(metrics);
        setDetectedMarkers(markers);
        setHasNeutralBaseline(!!detector.getBaseline());

        // Draw HUD overlay on canvas
        if (canvasOverlayRef.current) {
          const cvs = canvasOverlayRef.current;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            const scaleX = cvs.width / 320;
            const scaleY = cvs.height / 240;

            if (metrics.faceDetected && metrics.faceBox) {
              const fb = metrics.faceBox;
              ctx.strokeStyle = metrics.smileGestureScore >= settings.smileThreshold ? '#eab308' : '#38bdf8';
              ctx.lineWidth = 3;
              ctx.strokeRect(fb.x * scaleX, fb.y * scaleY, fb.width * scaleX, fb.height * scaleY);

              if (metrics.mouthBox) {
                const mb = metrics.mouthBox;
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(mb.x * scaleX, mb.y * scaleY, mb.width * scaleX, mb.height * scaleY);
              }
            }
          }
        }

        // Only register valid candidates when in DETECTING state AND after raceStartTimestamp!
        // ACCEPTANCE TEST 1: Chưa tới chữ CƯỜI -> không team nào được winner
        if (gameState === 'DETECTING' && raceStartTimestamp !== null) {
          const now = performance.now();

          // Check if face detected AND smile gesture exceeds threshold
          // ACCEPTANCE TEST 2: Sau chữ CƯỜI, có mặt nhưng không cười -> NONE
          const isSmiling = metrics.faceDetected && metrics.smileGestureScore >= settings.smileThreshold;

          // Check team marker
          // ACCEPTANCE TEST 3: Cười nhưng không có team marker -> NONE
          // ACCEPTANCE TEST 4: Có marker + smile gesture hợp lệ -> xác định đúng team
          const qualifiedMarkers = markers.filter((m) => m.confidence >= settings.markerThreshold);

          // Attribute smile to best-matching team marker
          let matchingTeam: SmileTeam | null = null;
          let bestMarkerConfidence = 0;

          if (qualifiedMarkers.length > 0) {
            qualifiedMarkers.sort((a, b) => b.confidence - a.confidence);
            const topMarker = qualifiedMarkers[0];
            matchingTeam = activeTeams.find((t) => t.id === topMarker.teamId || t.teamCode === topMarker.teamCode) || null;
            bestMarkerConfidence = topMarker.confidence;
          } else if (activeTeams.length === 2 && metrics.faceBox) {
            // Fallback for 2 teams: if marker confidence is borderline (>0.20) or positioned on team side
            const halfX = 320 / 2;
            const faceMid = metrics.faceBox.x + metrics.faceBox.width / 2;
            const sideTeam = faceMid < halfX ? activeTeams[0] : activeTeams[1];
            if (markers.some((m) => m.teamId === sideTeam.id && m.confidence >= 0.20)) {
              matchingTeam = sideTeam;
              bestMarkerConfidence = 0.40;
            }
          }

          if (isSmiling && matchingTeam) {
            stableFramesCounter++;
            setLiveStableFrames(stableFramesCounter);

            if (stableFramesCounter >= settings.requiredStableFrames) {
              if (!candidatesMap.has(matchingTeam.id)) {
                candidatesMap.set(matchingTeam.id, {
                  timestamp: now,
                  smileScore: metrics.smileGestureScore,
                  markerConf: bestMarkerConfidence,
                });
              }

              // After first candidate, open brief tieWindow (default 200ms)
              if (!tieCheckTimeout) {
                tieCheckTimeout = setTimeout(() => {
                  evaluateCandidates(candidatesMap, now);
                }, settings.tieThresholdMs);
              }
            }
          } else {
            stableFramesCounter = Math.max(0, stableFramesCounter - 1);
            setLiveStableFrames(stableFramesCounter);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(runDetection);
    };

    animFrameRef.current = requestAnimationFrame(runDetection);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (tieCheckTimeout) {
        clearTimeout(tieCheckTimeout);
      }
    };
  }, [gameState, raceStartTimestamp, activeTeams, settings]);

  // Evaluate candidate timestamps for Winner vs Tie
  const evaluateCandidates = (
    candidatesMap: Map<string, { timestamp: number; smileScore: number; markerConf: number }>,
    now: number
  ) => {
    if (candidatesMap.size === 0) return;

    const list = Array.from(candidatesMap.entries()).map(([teamId, data]) => ({
      team: activeTeams.find((t) => t.id === teamId)!,
      ...data,
    })).filter((item) => !!item.team);

    if (list.length === 0) return;

    // ACCEPTANCE TEST 5: 2 team cùng lúc <= 200ms -> TIE
    if (list.length >= 2) {
      list.sort((a, b) => a.timestamp - b.timestamp);
      const diff = Math.abs(list[1].timestamp - list[0].timestamp);
      if (diff <= settings.tieThresholdMs) {
        soundService.playWrong();
        setTieTeamsList([list[0].team, list[1].team]);
        setGameState('TIE');
        return;
      }
    }

    // Single winner
    list.sort((a, b) => a.timestamp - b.timestamp);
    const winnerData = list[0];
    const reactionTime = raceStartTimestamp ? Math.round(winnerData.timestamp - raceStartTimestamp) : 500;

    lockWinner(winnerData.team, reactionTime, winnerData.smileScore);
  };

  // Lock winner & freeze preview briefly
  const lockWinner = (team: SmileTeam, reactionTimeMs: number, smileScore: number) => {
    soundService.playSmileWinner();
    setWinnerTeam(team);
    setWinnerReactionTimeMs(reactionTimeMs);
    setWinnerSmileScore(smileScore);
    setGameState('WINNER_LOCKED');

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    // Auto transition to Question after 1.8s
    setTimeout(() => {
      setQuestionTimer(settings.questionTimeLimitSeconds);
      setSelectedAnswer(null);
      setGameState('ANSWERING');
    }, 1800);
  };

  // Teacher manual buzzer winner override (Fallback)
  const handleManualSelectWinner = (team: SmileTeam) => {
    lockWinner(team, 800, 0.75);
  };

  // Start Countdown: 3 -> 2 -> 1 -> 😁 CƯỜI!!!
  const handleStartCountdown = () => {
    setWinnerTeam(null);
    setWinnerReactionTimeMs(null);
    setRaceStartTimestamp(null);
    setTieTeamsList([]);
    setLiveStableFrames(0);
    setGameState('COUNTDOWN');
    setCountdownNum('3');
    soundService.playCountdownTick(3);

    setTimeout(() => {
      setCountdownNum('2');
      soundService.playCountdownTick(2);
    }, 1000);

    setTimeout(() => {
      setCountdownNum('1');
      soundService.playCountdownTick(1);
    }, 2000);

    setTimeout(() => {
      setCountdownNum('😁 CƯỜI!!!');
      soundService.playSmileChime();
      const startTime = performance.now();
      setRaceStartTimestamp(startTime);
      setGameState('DETECTING');
    }, 3000);
  };

  // Capture neutral baseline in READY state
  const handleCaptureNeutralBaseline = () => {
    if (currentMetrics && currentMetrics.faceDetected) {
      detectorRef.current.addBaselineSample(currentMetrics);
      detectorRef.current.addBaselineSample(currentMetrics);
      setHasNeutralBaseline(true);
      soundService.playClick();
    }
  };

  // Answering & Points Handling
  const handleSelectAnswer = (optionIndex: number) => {
    if (gameState !== 'ANSWERING') return;
    setSelectedAnswer(optionIndex);

    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    const basePts = currentQuestion.isSpecial ? (currentQuestion.specialPoints || settings.specialPoints) : (currentQuestion.normalPoints || settings.normalPoints);

    if (isCorrect) {
      // ACCEPTANCE TEST 6: Winner trả lời đúng câu 10 điểm -> +10
      soundService.playCorrect();
      confetti({ particleCount: 80, spread: 70 });
      setTeams((prev) =>
        prev.map((t) => (t.id === winnerTeam?.id ? { ...t, score: t.score + basePts } : t))
      );

      // Record score event
      if (winnerTeam) {
        ScoresRepository.recordScore({
          sessionId,
          gameSlug: 'smile-race',
          questionId: currentQuestion.id,
          teamCode: winnerTeam.teamCode,
          eventType: currentQuestion.isSpecial ? 'SPECIAL_CORRECT' : 'RACE_CORRECT',
          points: basePts,
          note: `Đội ${winnerTeam.name} cười nhanh nhất và trả lời đúng`,
        });

        SmileRaceRepository.recordRaceResult({
          sessionId,
          questionId: currentQuestion.id,
          winnerTeamId: winnerTeam.id,
          winnerTeamName: winnerTeam.name,
          winnerTimestamp: raceStartTimestamp,
          reactionTimeMs: winnerReactionTimeMs,
          smileScore: winnerSmileScore,
          markerConfidence: 0.8,
          isTie: false,
          detectionMethod: 'COMPUTER_VISION_SMILE',
          answerCorrect: true,
          stealTeamId: null,
          stealCorrect: null,
          pointsAwarded: basePts,
          playedAt: Date.now(),
        });
      }

      setGameState('CORRECT');
    } else {
      // ACCEPTANCE TEST 7: Winner trả lời sai -> không điểm, chuyển STEAL
      soundService.playWrong();
      if (winnerTeam) {
        ScoresRepository.recordScore({
          sessionId,
          gameSlug: 'smile-race',
          questionId: currentQuestion.id,
          teamCode: winnerTeam.teamCode,
          eventType: 'RACE_WRONG',
          points: 0,
          note: `Đội ${winnerTeam.name} trả lời sai`,
        });
      }

      // Prepare Steal
      if (activeTeams.length === 2) {
        const otherTeam = activeTeams.find((t) => t.id !== winnerTeam?.id) || activeTeams[0];
        setStealTeam(otherTeam);
        setGameState('STEAL');
      } else {
        // ACCEPTANCE TEST 10: 3–4 đội -> giáo viên chọn đội cướp trong các đội còn lại
        if (settings.stealMode === 'TEACHER_SELECT') {
          setStealTeam(null);
          setGameState('STEAL');
        } else if (settings.stealMode === 'NEXT_TEAM') {
          const remaining = activeTeams.filter((t) => t.id !== winnerTeam?.id);
          setStealTeam(remaining[0]);
          setGameState('STEAL');
        } else if (settings.stealMode === 'LOWEST_SCORE') {
          const remaining = activeTeams.filter((t) => t.id !== winnerTeam?.id);
          remaining.sort((a, b) => a.score - b.score);
          setStealTeam(remaining[0]);
          setGameState('STEAL');
        } else {
          const remaining = activeTeams.filter((t) => t.id !== winnerTeam?.id);
          const rand = remaining[Math.floor(Math.random() * remaining.length)];
          setStealTeam(rand);
          setGameState('STEAL');
        }
      }
    }
  };

  // Calculate Steal Points
  const calculateStealPoints = (): number => {
    const origPts = currentQuestion.isSpecial ? (currentQuestion.specialPoints || settings.specialPoints) : (currentQuestion.normalPoints || settings.normalPoints);
    if (settings.stealRoundingMode === 'CEIL') return Math.ceil(origPts / 2);
    if (settings.stealRoundingMode === 'ROUND') return Math.round(origPts / 2);
    return Math.floor(origPts / 2); // default FLOOR: 10 -> 5, 20 -> 10, 15 -> 7
  };

  // Steal answer choice
  const handleStealAnswer = (optionIndex: number) => {
    if (!stealTeam || gameState !== 'STEAL') return;
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    const stealPts = calculateStealPoints();

    if (isCorrect) {
      // ACCEPTANCE TEST 8: Đội khác cướp đúng câu 10 điểm -> +5
      // ACCEPTANCE TEST 9: Câu đặc biệt 20 điểm, cướp đúng -> +10
      soundService.playCorrect();
      confetti({ particleCount: 70, spread: 60 });
      setTeams((prev) =>
        prev.map((t) => (t.id === stealTeam.id ? { ...t, score: t.score + stealPts } : t))
      );

      ScoresRepository.recordScore({
        sessionId,
        gameSlug: 'smile-race',
        questionId: currentQuestion.id,
        teamCode: stealTeam.teamCode,
        eventType: 'STEAL_CORRECT',
        points: stealPts,
        note: `Đội ${stealTeam.name} cướp quyền thành công`,
      });

      SmileRaceRepository.recordRaceResult({
        sessionId,
        questionId: currentQuestion.id,
        winnerTeamId: winnerTeam?.id || null,
        winnerTeamName: winnerTeam?.name || null,
        winnerTimestamp: raceStartTimestamp,
        reactionTimeMs: winnerReactionTimeMs,
        smileScore: winnerSmileScore,
        markerConfidence: 0.8,
        isTie: false,
        detectionMethod: 'COMPUTER_VISION_SMILE',
        answerCorrect: false,
        stealTeamId: stealTeam.id,
        stealCorrect: true,
        pointsAwarded: stealPts,
        playedAt: Date.now(),
      });

      setGameState('STEAL_CORRECT');
    } else {
      soundService.playWrong();
      ScoresRepository.recordScore({
        sessionId,
        gameSlug: 'smile-race',
        questionId: currentQuestion.id,
        teamCode: stealTeam.teamCode,
        eventType: 'STEAL_WRONG',
        points: 0,
        note: `Đội ${stealTeam.name} cướp quyền nhưng trả lời sai`,
      });

      SmileRaceRepository.recordRaceResult({
        sessionId,
        questionId: currentQuestion.id,
        winnerTeamId: winnerTeam?.id || null,
        winnerTeamName: winnerTeam?.name || null,
        winnerTimestamp: raceStartTimestamp,
        reactionTimeMs: winnerReactionTimeMs,
        smileScore: winnerSmileScore,
        markerConfidence: 0.8,
        isTie: false,
        detectionMethod: 'COMPUTER_VISION_SMILE',
        answerCorrect: false,
        stealTeamId: stealTeam.id,
        stealCorrect: false,
        pointsAwarded: 0,
        playedAt: Date.now(),
      });

      setGameState('STEAL_WRONG');
    }
  };

  // Move to next question or Finish
  const handleProceedNext = () => {
    detectorRef.current.resetBaseline();
    setHasNeutralBaseline(false);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setWinnerTeam(null);
      setWinnerReactionTimeMs(null);
      setStealTeam(null);
      setSelectedAnswer(null);
      setGameState('READY');
    } else {
      soundService.playChampionFanfare();
      confetti({ particleCount: 120, spread: 100 });
      setGameState('FINISHED');
    }
  };

  // Start new game session
  const handleStartGameFromSetup = () => {
    if (selectedLessonId) {
      const lesson = lessons.find((l) => l.id === selectedLessonId);
      if (lesson && lesson.questions.length > 0) {
        setQuestions(lesson.questions);
      }
    }
    setCurrentQuestionIndex(0);
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
    setGameState('READY');
  };

  // Sorted teams for final leaderboard
  const sortedTeams = [...activeTeams].sort((a, b) => b.score - a.score);
  const championTeam = sortedTeams[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-purple-50/60 to-cyan-50 text-slate-800 flex flex-col relative overflow-x-hidden font-sans">
      {/* Top Game Bar */}
      <header className="px-4 py-3 bg-white/90 backdrop-blur-md border-b-2 border-amber-200/90 shadow-sm flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEduplay}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Về Trang Chủ Eduplay"
          >
            <Home className="w-4 h-4 text-purple-600" />
            <span className="hidden sm:inline">Trang chủ</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">😁</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wider bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  SMILE RACE
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                  ĐẠI CHIẾN NỤ CƯỜI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                “3 – 2 – 1 – CƯỜI! Đội tạo cử chỉ cười hợp lệ nhanh nhất giành quyền trả lời.”
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${
              showDebug ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-white text-slate-600 border-slate-200'
            }`}
            title="Bật/Tắt HUD Thông số AI"
          >
            {showDebug ? <Eye className="w-4 h-4 text-purple-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
            <span className="hidden md:inline">Debug HUD</span>
          </button>

          <button
            onClick={() => setIsCalibrationOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-xs flex items-center gap-1.5 transition-all"
            title="Mở bảng hiệu chuẩn camera"
          >
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>Test nụ cười</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            title={isSoundMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col">
        {/* ============================================================ */}
        {/* SCREEN 1: SETUP SCREEN */}
        {/* ============================================================ */}
        {gameState === 'SETUP' && (
          <div className="flex-1 flex items-center justify-center py-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-xl max-w-2xl w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="text-5xl inline-block animate-pulse">😁</span>
                <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
                  SMILE RACE – THIẾT LẬP PHÒNG CHƠI
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Game đối kháng nhận diện nụ cười thời gian thực dành cho 2 – 4 đội lớp học
                </p>
              </div>

              {/* Number of Teams */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Số lượng đội thi đấu:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTeamCount(num as any)}
                      className={`py-3 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all ${
                        teamCount === num
                          ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-md scale-102'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{num} ĐỘI</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Teams Config */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tên & Thẻ màu các đội:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTeams.map((team, idx) => (
                    <div
                      key={team.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center gap-3"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-sm flex-shrink-0"
                        style={{ backgroundColor: team.color }}
                      >
                        {idx + 1}
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
                          className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-400"
                        />
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <span>Marker màu:</span>
                          <span className="font-bold uppercase" style={{ color: team.color }}>
                            {team.markerColor}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Question Bank Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Bộ câu hỏi trắc nghiệm:
                </label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">-- Dùng bộ câu hỏi mặc định (10 câu Tin học & Kỹ năng) --</option>
                  {lessons.map((ls) => (
                    <option key={ls.id} value={ls.id}>
                      {ls.lessonTitle} ({ls.questions.length} câu - {ls.subject})
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartGameFromSetup}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500 text-white font-black text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>VÀO PHÒNG ĐUA NỤ CƯỜI</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREENS 2-7: ACTIVE GAME LOOP (READY, COUNTDOWN, DETECTING, QUESTION, RESULT) */}
        {/* ============================================================ */}
        {gameState !== 'SETUP' && gameState !== 'FINISHED' && (
          <div className="flex-1 flex flex-col gap-4">
            {/* Team Scoreboard Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {activeTeams.map((team) => {
                const isWinner = winnerTeam?.id === team.id;
                const isStealing = stealTeam?.id === team.id;
                return (
                  <div
                    key={team.id}
                    className={`rounded-2xl p-2.5 sm:p-3 border-2 transition-all flex items-center justify-between ${
                      isWinner
                        ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-300 animate-pulse'
                        : isStealing
                        ? 'bg-purple-50 border-purple-400 shadow-md'
                        : 'bg-white border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                      <div className="truncate">
                        <div className="text-[11px] sm:text-xs font-black truncate text-slate-800">
                          {team.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {isWinner ? '👑 GIÀNH QUYỀN' : isStealing ? '⚡ CƯỚP QUYỀN' : team.teamCode}
                        </div>
                      </div>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-purple-700 pl-2">
                      {team.score}đ
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Middle Stage: Webcam + Countdown or Question Card */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Left/Center: Video & Computer Vision Display (7 cols) */}
              <div className="lg:col-span-7 flex flex-col bg-slate-950 rounded-3xl p-3 border-2 border-slate-800 shadow-2xl relative overflow-hidden min-h-[340px]">
                {/* Video Feed */}
                <div className="relative flex-1 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <canvas
                    ref={canvasOverlayRef}
                    width={320}
                    height={240}
                    className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
                  />

                  {/* Countdown Big Overlay (3 - 2 - 1 - 😁 CƯỜI!!!) */}
                  <AnimatePresence>
                    {gameState === 'COUNTDOWN' && (
                      <motion.div
                        key={countdownNum}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.4, opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 pointer-events-none"
                      >
                        <span className="text-7xl sm:text-9xl font-black text-amber-400 drop-shadow-[0_8px_20px_rgba(245,158,11,0.6)]">
                          {countdownNum}
                        </span>
                        <span className="text-sm font-bold text-amber-200 mt-2 uppercase tracking-widest">
                          Chuẩn bị sẵn sàng!
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tie Freeze Overlay */}
                  {gameState === 'TIE' && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 bg-amber-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center text-white z-30"
                    >
                      <span className="text-6xl animate-bounce mb-2">⚡</span>
                      <h3 className="text-2xl sm:text-3xl font-black text-amber-300">QUÁ SÁT NHAU!</h3>
                      <p className="text-sm text-amber-100 max-w-sm mt-1">
                        Hai đội tạo cử chỉ nụ cười trong vòng {settings.tieThresholdMs}ms! Bất phân thắng bại!
                      </p>
                      <button
                        onClick={handleStartCountdown}
                        className="mt-4 px-6 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-lg flex items-center gap-2 transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>😁 CƯỜI LẠI!</span>
                      </button>
                    </motion.div>
                  )}

                  {/* Winner Freeze Overlay */}
                  {gameState === 'WINNER_LOCKED' && winnerTeam && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 bg-purple-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-white z-20"
                    >
                      <span className="text-6xl mb-2 animate-pulse">😁</span>
                      <h3 className="text-2xl sm:text-3xl font-black text-amber-300 drop-shadow-md">
                        {winnerTeam.name} CƯỜI NHANH NHẤT!
                      </h3>
                      <p className="text-sm text-purple-200 mt-1 font-semibold">
                        Thời gian phản xạ: <span className="font-mono text-cyan-300">{winnerReactionTimeMs}ms</span>
                      </p>
                      <div className="mt-3 px-3 py-1 rounded-full bg-white/20 text-xs font-bold text-amber-200 border border-amber-300/40">
                        GIÀNH QUYỀN TRẢ LỜI CÂU HỎI!
                      </div>
                    </motion.div>
                  )}

                  {/* Camera Error Overlay */}
                  {cameraErrorMsg && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center text-white z-20">
                      <Camera className="w-10 h-10 text-rose-400 mb-2" />
                      <p className="font-bold text-sm text-rose-300">{cameraErrorMsg}</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">
                        Không sao! Giáo viên có thể dùng các nút chọn đội thủ công bên dưới.
                      </p>
                    </div>
                  )}

                  {/* Top Live Detection Badge */}
                  {showDebug && gameState === 'DETECTING' && (
                    <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-10 pointer-events-none">
                      <div className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-amber-400/50 text-[11px] font-bold text-amber-300 flex items-center gap-2">
                        <span>Mặt: {currentMetrics?.faceDetected ? '✅' : '❌'}</span>
                        <span>|</span>
                        <span>Nụ cười: {Math.round((currentMetrics?.smileGestureScore || 0) * 100)}%</span>
                        <span>|</span>
                        <span>Ổn định: {liveStableFrames}/{settings.requiredStableFrames}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Action buttons & Teacher Fallback */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                  {gameState === 'READY' && (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
                      <button
                        onClick={handleCaptureNeutralBaseline}
                        className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        <span>🎯 Lấy chuẩn trung tính</span>
                        {hasNeutralBaseline && <span className="text-emerald-400 text-[10px] font-bold">(Đã lưu)</span>}
                      </button>

                      <button
                        onClick={handleStartCountdown}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm sm:text-base shadow-lg hover:shadow-amber-400/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4 fill-current text-purple-700" />
                        <span>BẮT ĐẦU TRANH QUYỀN (3 - 2 - 1 - CƯỜI)</span>
                      </button>
                    </div>
                  )}

                  {/* Fallback Manual Winner Selection */}
                  {['READY', 'COUNTDOWN', 'DETECTING', 'TIE'].includes(gameState) && (
                    <div className="w-full pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
                      <span>Bấm chọn đội thắng thủ công (khi không dùng camera):</span>
                      <div className="flex gap-1.5">
                        {activeTeams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => handleManualSelectWinner(team)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white transition-opacity hover:opacity-80"
                            style={{ backgroundColor: team.color }}
                          >
                            {team.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Question & Steal Stage (5 cols) */}
              <div className="lg:col-span-5 flex flex-col bg-white rounded-3xl p-4 sm:p-5 border-2 border-purple-200 shadow-xl justify-between">
                {/* Question Info Header */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                    <span className="text-xs font-black text-purple-700 tracking-wider">
                      CÂU {currentQuestionIndex + 1} / {questions.length}
                    </span>

                    <div className="flex items-center gap-2">
                      {currentQuestion.isSpecial ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>CÂU ĐẶC BIỆT ({currentQuestion.specialPoints || settings.specialPoints}Đ)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {currentQuestion.normalPoints || settings.normalPoints} Điểm
                        </span>
                      )}

                      {/* Timer */}
                      {gameState === 'ANSWERING' && (
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span className={questionTimer <= 5 ? 'text-rose-600 font-black animate-pulse' : ''}>
                            {questionTimer}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="pt-3">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {currentQuestion.question}
                    </h2>
                  </div>
                </div>

                {/* State-based Action Box */}
                <div className="my-3 flex-1 flex flex-col justify-center">
                  {/* Before winner locked */}
                  {['READY', 'COUNTDOWN', 'DETECTING', 'TIE'].includes(gameState) && (
                    <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 text-center space-y-2">
                      <span className="text-3xl inline-block animate-bounce">😁</span>
                      <p className="text-xs font-bold text-amber-900">
                        Đang chờ cử chỉ nụ cười hợp lệ...
                      </p>
                      <p className="text-[11px] text-amber-700">
                        Đội nào cười thật tươi và cầm đúng màu thẻ trước webcam sẽ giành quyền mở khóa câu hỏi!
                      </p>
                    </div>
                  )}

                  {/* Steal Banner */}
                  {gameState === 'STEAL' && (
                    <div className="bg-purple-100 rounded-2xl p-3.5 border-2 border-purple-400 text-center space-y-2 animate-fade-in">
                      <div className="text-xs font-black text-purple-900 uppercase tracking-wide flex items-center justify-center gap-1">
                        <Zap className="w-4 h-4 text-amber-500 fill-current" />
                        <span>CƠ HỘI CƯỚP QUYỀN TRẢ LỜI!</span>
                      </div>
                      <p className="text-xs text-purple-800">
                        Đội cướp trả lời đúng sẽ nhận: <span className="font-black text-purple-950">+{calculateStealPoints()} điểm</span>
                      </p>

                      {/* If teacher select mode */}
                      {!stealTeam && (
                        <div className="pt-2">
                          <div className="text-[11px] font-bold text-slate-600 mb-1.5">
                            Giáo viên chọn đội cướp quyền:
                          </div>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {activeTeams
                              .filter((t) => t.id !== winnerTeam?.id)
                              .map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => setStealTeam(t)}
                                  className="px-3 py-1.5 rounded-xl font-bold text-xs text-white shadow-xs hover:opacity-90 transition-all"
                                  style={{ backgroundColor: t.color }}
                                >
                                  {t.name}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {stealTeam && (
                        <div className="text-xs font-black text-purple-900">
                          Đang cho đội: <span className="underline">{stealTeam.name}</span> trả lời!
                        </div>
                      )}
                    </div>
                  )}

                  {/* Correct / Wrong Result Banner */}
                  {['CORRECT', 'STEAL_CORRECT'].includes(gameState) && (
                    <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 text-center space-y-1 animate-fade-in">
                      <div className="text-sm font-black text-emerald-800 flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span>CHÍNH XÁC! XUẤT SẮC!</span>
                      </div>
                      <p className="text-xs text-emerald-700 font-medium">
                        Điểm thưởng đã được cộng vào bảng điểm của đội!
                      </p>
                    </div>
                  )}

                  {['WRONG', 'STEAL_WRONG'].includes(gameState) && (
                    <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-center space-y-1 animate-fade-in">
                      <div className="text-sm font-black text-rose-800 flex items-center justify-center gap-1.5">
                        <XCircle className="w-5 h-5 text-rose-600" />
                        <span>TIẾC QUÁ! CHƯA CHÍNH XÁC!</span>
                      </div>
                    </div>
                  )}

                  {/* Explanation during Result */}
                  {['CORRECT', 'STEAL_CORRECT', 'STEAL_WRONG'].includes(gameState) && currentQuestion.explanation && (
                    <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                      <span className="font-bold text-slate-900">Giải thích: </span>
                      {currentQuestion.explanation}
                    </div>
                  )}
                </div>

                {/* Option Choices A, B, C, D */}
                <div className="space-y-2">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedAnswer === idx;
                    const isCorrectAnswer = idx === currentQuestion.correctAnswer;
                    const showCorrect = ['CORRECT', 'STEAL_CORRECT', 'STEAL_WRONG'].includes(gameState);

                    let btnClass = 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700';

                    if (showCorrect) {
                      if (isCorrectAnswer) {
                        btnClass = 'bg-emerald-100 border-emerald-500 text-emerald-900 font-bold';
                      } else if (isSelected && !isCorrectAnswer) {
                        btnClass = 'bg-rose-100 border-rose-400 text-rose-900 line-through';
                      }
                    } else if (isSelected) {
                      btnClass = 'bg-purple-100 border-purple-500 text-purple-900 font-bold';
                    }

                    const isDisabled = !['ANSWERING', 'STEAL'].includes(gameState) || (gameState === 'STEAL' && !stealTeam);

                    return (
                      <button
                        key={idx}
                        disabled={isDisabled}
                        onClick={() => {
                          if (gameState === 'ANSWERING') {
                            handleSelectAnswer(idx);
                          } else if (gameState === 'STEAL') {
                            handleStealAnswer(idx);
                          }
                        }}
                        className={`w-full p-2.5 sm:p-3 rounded-2xl border-2 text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${btnClass} ${
                          isDisabled ? 'cursor-default opacity-85' : 'cursor-pointer hover:scale-[1.01]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-white border border-slate-300 font-black text-xs flex items-center justify-center text-slate-700 flex-shrink-0">
                            {['A', 'B', 'C', 'D'][idx]}
                          </span>
                          <span>{option}</span>
                        </div>
                        {showCorrect && isCorrectAnswer && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>

                {/* Next Question Button */}
                {['CORRECT', 'STEAL_CORRECT', 'STEAL_WRONG'].includes(gameState) && (
                  <div className="pt-4">
                    <button
                      onClick={handleProceedNext}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <span>{currentQuestionIndex < questions.length - 1 ? 'CÂU TIẾP THEO' : 'XEM KẾT QUẢ CHUNG CUỘC'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 8: FINISHED PODIUM & CERTIFICATE */}
        {/* ============================================================ */}
        {gameState === 'FINISHED' && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-2xl max-w-2xl w-full text-center space-y-6">
              <span className="text-6xl inline-block animate-bounce">🏆</span>
              <div>
                <h2 className="text-3xl font-black bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
                  CHÚC MỪNG QUÁN QUÂN SMILE RACE!
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Đại chiến nụ cười khép lại với những màn phản xạ vô cùng rạng rỡ!
                </p>
              </div>

              {/* Podium Leaderboard */}
              <div className="space-y-3">
                {sortedTeams.map((team, rank) => (
                  <div
                    key={team.id}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                      rank === 0
                        ? 'bg-amber-50 border-amber-400 shadow-md scale-102'
                        : rank === 1
                        ? 'bg-purple-50/50 border-purple-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '🎖️'}
                      </span>
                      <div className="text-left">
                        <div className="text-sm font-black text-slate-900">{team.name}</div>
                        <div className="text-xs text-slate-500">Hạng {rank + 1}</div>
                      </div>
                    </div>
                    <div className="text-xl font-black text-purple-700">{team.score} Điểm</div>
                  </div>
                ))}
              </div>

              {/* Buttons: Certificate & Play Again */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowCertificate(true)}
                  className="py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>XUẤT GIẤY KHEN VÔ ĐỊCH</span>
                </button>

                <button
                  onClick={() => {
                    setGameState('SETUP');
                  }}
                  className="py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-2xl w-full border-4 border-amber-400 shadow-2xl space-y-5 text-center relative"
            >
              <div className="border-2 border-amber-300 rounded-2xl p-6 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/50 space-y-4">
                <div className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                  {schoolName} • LỚP {className}
                </div>
                <div className="text-4xl">🏆</div>
                <h2 className="text-2xl sm:text-3xl font-black text-amber-700 tracking-wider">
                  GIẤY CHỨNG NHẬN VÔ ĐỊCH
                </h2>
                <p className="text-xs text-slate-600">Trao tặng cho tập thể:</p>
                <div className="text-2xl sm:text-3xl font-black text-purple-900 underline decoration-amber-400 decoration-wavy">
                  {championTeam.name}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 max-w-md mx-auto leading-relaxed">
                  Đã xuất sắc giành chiến thắng trong trò chơi <strong>SMILE RACE – ĐẠI CHIẾN NỤ CƯỜI</strong> với tốc độ phản xạ cử chỉ nụ cười và kiến thức xuất sắc ({championTeam.score} điểm)!
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md"
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
    </div>
  );
};
