import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Home,
  RotateCcw,
  Play,
  HelpCircle,
  Trophy,
  CheckCircle2,
  XCircle,
  Camera,
  AlertTriangle,
  Zap,
  Sliders,
  Shield,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  Maximize2,
  Minimize2,
  Settings as SettingsIcon,
  Crown,
} from 'lucide-react';
import { Question, QuestionBankLesson } from '../../types';
import { DEFAULT_QUESTIONS } from '../../data/defaultQuestions';
import { DEFAULT_QUESTION_BANKS } from '../../data/questionBanksData';
import { soundService } from '../../services/soundService';
import { QuestionBankSelector } from '../../components/common/QuestionBankSelector';
import { QuestionImportModal } from '../../components/common/QuestionImportModal';
import {
  FruitSlashSettings,
  FruitSlashState,
  FlyingFruit,
  HandTrackResult,
  TeamMatchStats,
} from './types';
import { FruitSlashDetector, SlashEvent } from './fruitSlashDetector';
import { FruitSlashArena } from './FruitSlashArena';
import { FruitSlashQuestionView } from './FruitSlashQuestionView';

interface FruitSlashGameProps {
  onBackToEduplay: () => void;
}

const DEFAULT_SETTINGS: FruitSlashSettings = {
  team1Name: 'Đội Xanh',
  team2Name: 'Đội Cam',
  totalQuestions: 10,
  answerTimeLimit: 15,
  difficulty: 'MEDIUM',
  enableBoom: true,
  enableSpecialItems: true,
  stealTimeLimit: 10,
  soundEnabled: true,
};

export const FruitSlashGame: React.FC<FruitSlashGameProps> = ({ onBackToEduplay }) => {
  // Game Settings & State Machine
  const [gameState, setGameState] = useState<FruitSlashState>('SETUP');
  const [settings, setSettings] = useState<FruitSlashSettings>(DEFAULT_SETTINGS);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(DEFAULT_QUESTIONS.slice(0, 10));
  const [selectedLesson, setSelectedLesson] = useState<QuestionBankLesson | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);

  // Sound & Fullscreen
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Teams Statistics
  const [team1Stats, setTeam1Stats] = useState<TeamMatchStats>({
    score: 0,
    correctAnswers: 0,
    fruitsSliced: 0,
    boomsHit: 0,
    hasShield: false,
    freezeUntilTimestamp: 0,
    doublePointsActive: false,
  });

  const [team2Stats, setTeam2Stats] = useState<TeamMatchStats>({
    score: 0,
    correctAnswers: 0,
    fruitsSliced: 0,
    boomsHit: 0,
    hasShield: false,
    freezeUntilTimestamp: 0,
    doublePointsActive: false,
  });

  // Winner of current fruit slash race
  const [roundWinnerTeam, setRoundWinnerTeam] = useState<'team1' | 'team2' | null>(null);
  const [roundWinnerReactionMs, setRoundWinnerReactionMs] = useState<number | null>(null);
  const [roundNotification, setRoundNotification] = useState<string | null>(null);

  // Countdown state
  const [countdownValue, setCountdownValue] = useState<number | string>(3);

  // Question & Steal state
  const [activeAnsweringTeam, setActiveAnsweringTeam] = useState<'team1' | 'team2'>('team1');
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [isStealMode, setIsStealMode] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Webcam Management
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState<boolean>(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('k1_toan_b1');
  const [showDebug, setShowDebug] = useState<boolean>(false);

  // Hand tracking state
  const detectorRef = useRef<FruitSlashDetector>(new FruitSlashDetector());
  const [team1Hand, setTeam1Hand] = useState<HandTrackResult>({
    detected: false,
    x: 25,
    y: 50,
    vx: 0,
    vy: 0,
    speed: 0,
    isSlashing: false,
    slashAngle: 0,
    trail: [],
    lastSlashTimestamp: 0,
  });
  const [team2Hand, setTeam2Hand] = useState<HandTrackResult>({
    detected: false,
    x: 75,
    y: 50,
    vx: 0,
    vy: 0,
    speed: 0,
    isSlashing: false,
    slashAngle: 0,
    trail: [],
    lastSlashTimestamp: 0,
  });

  const latestHandsRef = useRef<{ team1: HandTrackResult; team2: HandTrackResult }>({
    team1: detectorRef.current.getEmptyResult('team1'),
    team2: detectorRef.current.getEmptyResult('team2'),
  });

  const roundStartTimestampRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current && streamRef.current.active) {
        if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.muted = true;
          videoRef.current.defaultMuted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(() => {});
        }
        detectorRef.current.setVideoElement(videoRef.current);
        setCameraStream(streamRef.current);
        setCameraError(null);
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
      } catch {
        // Fallback to basic constraint if overconstrained
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.defaultMuted = true;
        videoRef.current.playsInline = true;
        videoRef.current.play().catch(() => {});
        detectorRef.current.setVideoElement(videoRef.current);
      }
      setCameraError(null);
    } catch (err: any) {
      console.warn('Webcam stream error:', err);
      setCameraError(err?.message || 'Không thể kết nối webcam. Vui lòng kiểm tra quyền camera trong trình duyệt.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Main High-Speed Detection Loop (Throttles React state to 4 FPS for UI, runs detector at 60 FPS for Arena)
  useEffect(() => {
    let lastUiUpdate = 0;
    const loop = (now: number) => {
      const activeVideo = videoRef.current;
      const result = detectorRef.current.processFrame(now, activeVideo);
      latestHandsRef.current = { team1: result.team1, team2: result.team2 };

      // Throttle React state updates to UI badges (4 FPS) to eliminate lag/freezing
      if (now - lastUiUpdate > 250) {
        lastUiUpdate = now;
        setTeam1Hand(result.team1);
        setTeam2Hand(result.team2);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Sound Toggle
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundService.setMuted(next);
  };

  // Start Game from SETUP
  const handleStartGame = () => {
    soundService.playClick();
    const count = Math.min(settings.totalQuestions, activeQuestions.length);
    setActiveQuestions(activeQuestions.slice(0, count));
    setCurrentQuestionIdx(0);

    // Reset scores
    setTeam1Stats({
      score: 0,
      correctAnswers: 0,
      fruitsSliced: 0,
      boomsHit: 0,
      hasShield: false,
      freezeUntilTimestamp: 0,
      doublePointsActive: false,
    });
    setTeam2Stats({
      score: 0,
      correctAnswers: 0,
      fruitsSliced: 0,
      boomsHit: 0,
      hasShield: false,
      freezeUntilTimestamp: 0,
      doublePointsActive: false,
    });

    setGameState('CAMERA_READY');
  };

  // Start Round Countdown: 3 -> 2 -> 1 -> GO!
  const startCountdown = () => {
    setGameState('COUNTDOWN');
    setRoundNotification('CHUẨN BỊ...');
    let count = 3;
    setCountdownValue(count);
    soundService.playCountdownTick(count);

    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownValue(count);
        soundService.playCountdownTick(count);
      } else if (count === 0) {
        setCountdownValue('GO!');
        soundService.playCountdownGo();
      } else {
        clearInterval(timer);
        setRoundNotification('CHÉM TRÁI CÂY ĐỂ GIÀNH QUYỀN!');
        roundStartTimestampRef.current = performance.now();
        setRoundWinnerTeam(null);
        setRoundWinnerReactionMs(null);
        setGameState('FRUIT_ROUND');
      }
    }, 850);
  };

  // Fruit Sliced in Arena
  const handleFruitSliced = (fruit: FlyingFruit, team: 'team1' | 'team2', timestamp: number) => {
    if (gameState !== 'FRUIT_ROUND') return;

    // Check freeze
    const now = Date.now();
    if (team === 'team1' && team1Stats.freezeUntilTimestamp > now) {
      setRoundNotification(`${settings.team1Name} đang bị đóng băng!`);
      return;
    }
    if (team === 'team2' && team2Stats.freezeUntilTimestamp > now) {
      setRoundNotification(`${settings.team2Name} đang bị đóng băng!`);
      return;
    }

    soundService.playFruitSlice();

    // Increment fruits sliced stat
    if (team === 'team1') {
      setTeam1Stats((prev) => ({ ...prev, fruitsSliced: prev.fruitsSliced + 1 }));
    } else {
      setTeam2Stats((prev) => ({ ...prev, fruitsSliced: prev.fruitsSliced + 1 }));
    }

    // Reaction time
    const reactionMs = Math.round(timestamp - roundStartTimestampRef.current);
    const teamName = team === 'team1' ? settings.team1Name : settings.team2Name;

    setRoundWinnerTeam(team);
    setRoundWinnerReactionMs(reactionMs);
    setActiveAnsweringTeam(team);
    setGameState('TEAM_WON_SLASH');
    setRoundNotification(`🎉 ${teamName.toUpperCase()} ĐÃ CHÉM TRÚNG VÀ GIÀNH QUYỀN! (${reactionMs}ms)`);
    soundService.playSmileWinner();

    // Transition to QUESTION after 1.2s
    setTimeout(() => {
      setSelectedAnswerIndex(null);
      setIsAnswerSubmitted(false);
      setIsAnswerCorrect(null);
      setIsStealMode(false);
      setShowExplanation(false);
      setGameState('QUESTION');
    }, 1200);
  };

  // Boom Hit in Arena
  const handleBoomHit = (fruit: FlyingFruit, team: 'team1' | 'team2') => {
    soundService.playBoomExplosion();

    const victimTeam = team;
    const opponentTeam = victimTeam === 'team1' ? 'team2' : 'team1';
    const victimName = victimTeam === 'team1' ? settings.team1Name : settings.team2Name;
    const opponentName = opponentTeam === 'team1' ? settings.team1Name : settings.team2Name;

    // Check Shield
    if (victimTeam === 'team1' && team1Stats.hasShield) {
      soundService.playShieldBlock();
      setTeam1Stats((prev) => ({ ...prev, hasShield: false, boomsHit: prev.boomsHit + 1 }));
      setRoundNotification(`🛡️ KHIÊN ĐÃ BẢO VỆ ${victimName.toUpperCase()} KHỎI BOM!`);
      return;
    }
    if (victimTeam === 'team2' && team2Stats.hasShield) {
      soundService.playShieldBlock();
      setTeam2Stats((prev) => ({ ...prev, hasShield: false, boomsHit: prev.boomsHit + 1 }));
      setRoundNotification(`🛡️ KHIÊN ĐÃ BẢO VỆ ${victimName.toUpperCase()} KHỎI BOM!`);
      return;
    }

    // Victim hit boom: opponent gets +10 points!
    if (victimTeam === 'team1') {
      setTeam1Stats((prev) => ({ ...prev, boomsHit: prev.boomsHit + 1 }));
      setTeam2Stats((prev) => ({ ...prev, score: prev.score + 10 }));
    } else {
      setTeam2Stats((prev) => ({ ...prev, boomsHit: prev.boomsHit + 1 }));
      setTeam1Stats((prev) => ({ ...prev, score: prev.score + 10 }));
    }

    setRoundNotification(`💥 BOOM! ${victimName} chém trúng bom! ${opponentName} được +10 điểm!`);
  };

  // Special Item Sliced
  const handleSpecialItemSliced = (fruit: FlyingFruit, team: 'team1' | 'team2') => {
    soundService.playBonusItem();
    const teamName = team === 'team1' ? settings.team1Name : settings.team2Name;
    const opponentName = team === 'team1' ? settings.team2Name : settings.team1Name;

    switch (fruit.specialType) {
      case 'golden_fruit':
        if (team === 'team1') {
          setTeam1Stats((prev) => ({ ...prev, doublePointsActive: true }));
        } else {
          setTeam2Stats((prev) => ({ ...prev, doublePointsActive: true }));
        }
        setRoundNotification(`🌟 ${teamName} nhận TRÁI CÂY VÀNG (X2 điểm câu này)!`);
        break;

      case 'clock':
        setRoundNotification(`⏳ ${teamName} nhận ĐỒNG HỒ (+5 giây thời gian trả lời)!`);
        break;

      case 'shield':
        soundService.playShieldBlock();
        if (team === 'team1') {
          setTeam1Stats((prev) => ({ ...prev, hasShield: true }));
        } else {
          setTeam2Stats((prev) => ({ ...prev, hasShield: true }));
        }
        setRoundNotification(`🛡️ ${teamName} kích hoạt KHIÊN BẢO VỆ (chống 1 lần nổ Boom)!`);
        break;

      case 'freeze':
        soundService.playFreeze();
        const freezeDuration = Date.now() + 2000;
        if (team === 'team1') {
          setTeam2Stats((prev) => ({ ...prev, freezeUntilTimestamp: freezeDuration }));
        } else {
          setTeam1Stats((prev) => ({ ...prev, freezeUntilTimestamp: freezeDuration }));
        }
        setRoundNotification(`❄️ ${teamName} đóng băng tay ${opponentName} trong 2 giây!`);
        break;
    }
  };

  // Manual slash trigger for mouse fallback
  const handleManualSlash = (team: 'team1' | 'team2', from: { x: number; y: number }, to: { x: number; y: number }) => {
    detectorRef.current.triggerManualSlash(team, from, to, performance.now());
    latestHandsRef.current = detectorRef.current.getLatestResults(performance.now());
  };

  // Answer selected in Question View
  const handleAnswerSelected = (selectedIdx: number) => {
    if (isAnswerSubmitted) return;

    setSelectedAnswerIndex(selectedIdx);
    setIsAnswerSubmitted(true);

    const currentQ = activeQuestions[currentQuestionIdx];
    const isCorrect = selectedIdx === currentQ.correctAnswer;
    setIsAnswerCorrect(isCorrect);

    if (isCorrect) {
      soundService.playCorrect();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      // Calculate score
      let pts = isStealMode ? 5 : 10;
      const isDouble =
        activeAnsweringTeam === 'team1' ? team1Stats.doublePointsActive : team2Stats.doublePointsActive;
      if (isDouble && !isStealMode) {
        pts *= 2;
      }

      if (activeAnsweringTeam === 'team1') {
        setTeam1Stats((prev) => ({
          ...prev,
          score: prev.score + pts,
          correctAnswers: prev.correctAnswers + 1,
          doublePointsActive: false,
        }));
      } else {
        setTeam2Stats((prev) => ({
          ...prev,
          score: prev.score + pts,
          correctAnswers: prev.correctAnswers + 1,
          doublePointsActive: false,
        }));
      }

      setRoundNotification(`🎯 CHÍNH XÁC! +${pts} ĐIỂM CHO ${activeAnsweringTeam === 'team1' ? settings.team1Name : settings.team2Name}!`);
      setTimeout(() => {
        setShowExplanation(true);
        setGameState('SHOW_RESULT');
      }, 1500);
    } else {
      // Wrong answer
      soundService.playWrong();

      if (!isStealMode) {
        // Switch to STEAL mode for opponent
        const opponentTeam = activeAnsweringTeam === 'team1' ? 'team2' : 'team1';
        const opponentName = opponentTeam === 'team1' ? settings.team1Name : settings.team2Name;
        setRoundNotification(`❌ CHƯA CHÍNH XÁC! QUYỀN TRẢ LỜI CƯỚP ĐIỂM THUỘC VỀ ${opponentName.toUpperCase()}!`);

        setTimeout(() => {
          setActiveAnsweringTeam(opponentTeam);
          setIsStealMode(true);
          setSelectedAnswerIndex(null);
          setIsAnswerSubmitted(false);
          setIsAnswerCorrect(null);
        }, 1200);
      } else {
        // Opponent also wrong: show correct answer
        setRoundNotification(`❌ RẤT TIẾC! CẢ HAI ĐỘI ĐỀU CHƯA ĐÚNG.`);
        setTimeout(() => {
          setShowExplanation(true);
          setGameState('SHOW_RESULT');
        }, 1500);
      }
    }
  };

  // Question Time Expired
  const handleQuestionTimeExpired = () => {
    soundService.playWrong();
    if (!isStealMode) {
      // Switch to STEAL
      const opponentTeam = activeAnsweringTeam === 'team1' ? 'team2' : 'team1';
      const opponentName = opponentTeam === 'team1' ? settings.team1Name : settings.team2Name;
      setRoundNotification(`⏰ HẾT GIỜ! QUYỀN CƯỚP ĐIỂM CHO ${opponentName.toUpperCase()}!`);
      setTimeout(() => {
        setActiveAnsweringTeam(opponentTeam);
        setIsStealMode(true);
        setSelectedAnswerIndex(null);
        setIsAnswerSubmitted(false);
      }, 1000);
    } else {
      // Both ran out of time
      setRoundNotification(`⏰ HẾT THỜI GIAN TRẢ LỜI!`);
      setTimeout(() => {
        setShowExplanation(true);
        setGameState('SHOW_RESULT');
      }, 1000);
    }
  };

  // Next Question / Round
  const handleProceedNext = () => {
    soundService.playClick();
    if (currentQuestionIdx + 1 < activeQuestions.length) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setGameState('CAMERA_READY');
    } else {
      // Match Finished!
      soundService.playChampionFanfare();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
      });
      setGameState('GAME_OVER');
    }
  };

  // Current Question
  const currentQ = activeQuestions[currentQuestionIdx] || activeQuestions[0];
  const activeHand = activeAnsweringTeam === 'team1' ? team1Hand : team2Hand;

  // Keyboard Shortcuts (Space for Start/Proceed, 1-4 for answers)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        if (gameState === 'CAMERA_READY') {
          e.preventDefault();
          startCountdown();
        } else if (gameState === 'SHOW_RESULT') {
          e.preventDefault();
          handleProceedNext();
        }
      } else if (
        [
          'Digit1',
          'Digit2',
          'Digit3',
          'Digit4',
          'Numpad1',
          'Numpad2',
          'Numpad3',
          'Numpad4',
          'KeyA',
          'KeyB',
          'KeyC',
          'KeyD',
        ].includes(e.code)
      ) {
        if (gameState === 'QUESTION' || gameState === 'ANSWER' || gameState === 'STEAL') {
          const idxMap: Record<string, number> = {
            Digit1: 0,
            Numpad1: 0,
            KeyA: 0,
            Digit2: 1,
            Numpad2: 1,
            KeyB: 1,
            Digit3: 2,
            Numpad3: 2,
            KeyC: 2,
            Digit4: 3,
            Numpad4: 3,
            KeyD: 3,
          };
          const selected = idxMap[e.code];
          if (selected !== undefined && currentQ && selected < currentQ.options.length) {
            handleAnswerSelected(selected);
          }
        }
      } else if (e.key === 'd' || e.key === 'D') {
        setShowDebug((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentQ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Master Video element for camera stream and vision detection */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        width={640}
        height={480}
        onLoadedMetadata={(e) => {
          detectorRef.current.setVideoElement(e.currentTarget);
          e.currentTarget.play().catch(() => {});
        }}
        onCanPlay={(e) => {
          detectorRef.current.setVideoElement(e.currentTarget);
          e.currentTarget.play().catch(() => {});
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '640px',
          height: '480px',
          opacity: 0.001,
          pointerEvents: 'none',
          zIndex: -50,
        }}
      />

      {/* TOP HEADER / NAVIGATION */}
      <header className="h-16 px-4 md:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundService.playClick();
              onBackToEduplay();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Trang chủ Eduplay</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 border-l border-slate-700 pl-3">
            <span className="text-xl">🍉</span>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                <span>FRUIT SLASH QUIZ</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Chém trái cây
                </span>
              </h1>
              <p className="text-[10px] text-slate-400">Đại chiến phản xạ tay webcam 2 đội</p>
            </div>
          </div>
        </div>

        {/* Center Round / Score Banner in-game */}
        {gameState !== 'SETUP' && gameState !== 'GAME_OVER' && (
          <div className="flex items-center gap-4">
            {/* Team 1 Score */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-sky-950/80 border border-sky-500/40">
              <span className="text-xs font-bold text-sky-300">{settings.team1Name}</span>
              <span className="text-base font-black text-white font-mono">{team1Stats.score}</span>
            </div>

            {/* Question Progress */}
            <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-black text-amber-300">
              Câu {currentQuestionIdx + 1} / {activeQuestions.length}
            </div>

            {/* Team 2 Score */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40">
              <span className="text-xs font-bold text-amber-300">{settings.team2Name}</span>
              <span className="text-base font-black text-white font-mono">{team2Stats.score}</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {gameState !== 'SETUP' && (
            <button
              onClick={() => {
                soundService.playClick();
                setGameState('SETUP');
              }}
              title="Cài đặt lại"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowDebug((prev) => !prev)}
            title="Bật/Tắt hiển thị điểm tin cậy nhận diện bàn tay (Phím D)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              showDebug
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Debug Tay:</span>
            <span className={showDebug ? 'text-emerald-400 font-mono' : 'text-slate-400'}>
              {showDebug ? 'BẬT' : 'TẮT'}
            </span>
          </button>

          <button
            onClick={toggleSound}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toàn màn hình"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT ROUTER */}
      <main className="flex-1 flex flex-col p-2 sm:p-4 max-w-7xl w-full mx-auto relative overflow-hidden">
        {/* =======================================================
            STATE: SETUP (Teacher configuration screen)
        ======================================================= */}
        {gameState === 'SETUP' && (
          <div className="flex-1 flex flex-col justify-center items-center py-6">
            <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              {/* Header Title */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black">
                  <span>🍉 FRUIT SLASH QUIZ</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  Chém Trái Cây Giành Quyền Trả Lời
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
                  Học sinh dùng webcam và chuyển động tay vung chém trái cây bay trên màn hình. Đội chém trúng trước giành quyền trả lời câu hỏi!
                </p>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team Names */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👥 Tên 2 Đội Thi Đấu</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-sky-400 block mb-1">Đội 1 (Bên Trái)</span>
                      <input
                        type="text"
                        value={settings.team1Name}
                        onChange={(e) => setSettings({ ...settings, team1Name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-sky-500/40 text-white font-bold text-sm focus:outline-hidden focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-amber-400 block mb-1">Đội 2 (Bên Phải)</span>
                      <input
                        type="text"
                        value={settings.team2Name}
                        onChange={(e) => setSettings({ ...settings, team2Name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white font-bold text-sm focus:outline-hidden focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Difficulty & Time */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡ Độ khó & Tốc độ bay</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setSettings({ ...settings, difficulty: diff })}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          settings.difficulty === diff
                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {diff === 'EASY' ? 'Dễ' : diff === 'MEDIUM' ? 'Trung bình' : 'Khó'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Questions */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    Số câu hỏi trong trận
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSettings({ ...settings, totalQuestions: num })}
                        className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          settings.totalQuestions === num
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {num} câu
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Time Limit */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    Thời gian trả lời câu hỏi
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 15, 20, 30].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSettings({ ...settings, answerTimeLimit: sec })}
                        className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          settings.answerTimeLimit === sec
                            ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {sec} giây
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles: Boom & Special Items */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-white">💣 Quả Bom (Boom)</p>
                    <p className="text-[11px] text-slate-400">Chém trúng bom: mất quyền, đối thủ +10 điểm</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, enableBoom: !settings.enableBoom })}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.enableBoom ? 'bg-rose-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        settings.enableBoom ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-white">✨ Vật phẩm đặc biệt</p>
                    <p className="text-[11px] text-slate-400">Trái cây vàng (x2 điểm), Đồng hồ (+5s), Khiên, Băng</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, enableSpecialItems: !settings.enableSpecialItems })}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.enableSpecialItems ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        settings.enableSpecialItems ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Question Bank Selection */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    📚 Bộ câu hỏi bài học hiện tại:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBankModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    >
                      <span>Chọn Ngân Hàng Đầy Đủ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    >
                      <span>Nhập Excel / Tạo mới</span>
                    </button>
                  </div>
                </div>

                <select
                  value={selectedLessonId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedLessonId(id);
                    const found = DEFAULT_QUESTION_BANKS.find((l) => l.id === id);
                    if (found) {
                      setSelectedLesson(found);
                      setActiveQuestions(found.questions);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-200 bg-slate-900 focus:outline-hidden focus:border-rose-400"
                >
                  {DEFAULT_QUESTION_BANKS.map((ls) => (
                    <option key={ls.id} value={ls.id}>
                      [Khối {ls.grade} - {ls.subject}] {ls.lessonTitle} ({ls.questions.length} câu)
                    </option>
                  ))}
                </select>

                <p className="text-[11px] text-slate-400">
                  Đang dùng: <span className="text-amber-400 font-bold">{selectedLesson?.lessonTitle || 'Bài 1: Các số từ 1 đến 10'}</span> ({activeQuestions.length} câu sẵn sàng)
                </p>
              </div>

              {/* Camera Status & Hand Detection Banner */}
              <div className={`p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs border transition-all ${
                cameraStream && !cameraError
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cameraStream && !cameraError ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="font-bold">
                    {cameraStream && !cameraError
                      ? 'Webcam đã sẵn sàng'
                      : (cameraError || 'Chưa nhận được tín hiệu camera')}
                  </span>
                  {cameraStream && !cameraError && (
                    <span className="text-[11px] text-slate-300 pl-2 border-l border-emerald-500/30">
                      ✋ {settings.team1Name}: {team1Hand.detected ? '✅ Đã nhận diện' : '⏳ Đưa tay lên để quét'} | ✋ {settings.team2Name}: {team2Hand.detected ? '✅ Đã nhận diện' : '⏳ Đưa tay lên để quét'}
                    </span>
                  )}
                </div>

                {(!cameraStream || cameraError) && (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all"
                  >
                    Bật lại Camera
                  </button>
                )}
              </div>

              {/* Bottom CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span>Kiểm tra webcam & Nhận diện tay</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartGame}
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-rose-500/25 cursor-pointer active:scale-95 transition-all"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>BẮT ĐẦU TRÒ CHƠI</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            STATE: CAMERA_READY, COUNTDOWN, FRUIT_ROUND, TEAM_WON_SLASH
            (FULL STAGE EXPANDED CAMERA ARENA - FRUITS FLY DIRECTLY INSIDE CAMERA!)
        ======================================================= */}
        {(gameState === 'CAMERA_READY' ||
          gameState === 'COUNTDOWN' ||
          gameState === 'FRUIT_ROUND' ||
          gameState === 'TEAM_WON_SLASH') && (
          <div className="flex-1 flex flex-col min-h-[540px] md:min-h-[620px] h-full relative">
            <FruitSlashArena
              settings={settings}
              videoStream={cameraStream || streamRef.current}
              team1Hand={team1Hand}
              team2Hand={team2Hand}
              getLatestHands={() => latestHandsRef.current}
              team1Score={team1Stats.score}
              team2Score={team2Stats.score}
              team1FruitsSliced={team1Stats.fruitsSliced}
              team2FruitsSliced={team2Stats.fruitsSliced}
              isRoundActive={gameState === 'FRUIT_ROUND'}
              roundWinnerTeam={roundWinnerTeam}
              roundNotification={roundNotification}
              countdownValue={countdownValue}
              isCountdownActive={gameState === 'COUNTDOWN'}
              onFruitSliced={handleFruitSliced}
              onBoomHit={handleBoomHit}
              onSpecialItemSliced={handleSpecialItemSliced}
              onManualSlash={handleManualSlash}
              showDebug={showDebug}
              onToggleDebug={() => setShowDebug((prev) => !prev)}
            />

            {/* CAMERA_READY OVERLAY (Before starting the slash countdown) */}
            {gameState === 'CAMERA_READY' && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40">
                <div className="max-w-lg w-full bg-slate-900/95 border-2 border-rose-500/50 rounded-3xl p-6 md:p-8 text-center space-y-4 shadow-2xl">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-3xl mx-auto animate-bounce">
                    🍉
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-black text-white">
                      Vòng {currentQuestionIdx + 1} / {activeQuestions.length}: Chém Trái Cây
                    </h3>
                    <p className="text-xs md:text-sm text-slate-300">
                      Học sinh 2 đội đứng vào 2 bên khung camera (Đội 1 bên Trái, Đội 2 bên Phải). Vung tay chém trái cây bay trên màn hình!
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={startCountdown}
                      className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-rose-500/30 cursor-pointer active:scale-95 transition-all"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>BẮT ĐẦU VÒNG ĐUA (Phím Cách)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =======================================================
            STATE: QUESTION, ANSWER, STEAL, SHOW_RESULT
            (SPLIT VIEW: PROMINENT WEBCAMS ON SIDES + QUESTION IN CENTER)
        ======================================================= */}
        {(gameState === 'QUESTION' ||
          gameState === 'ANSWER' ||
          gameState === 'STEAL' ||
          gameState === 'SHOW_RESULT') && (
          <div className="flex-1 flex flex-col gap-3 min-h-[520px] h-full relative">
            <div className="flex-1 grid grid-cols-12 gap-3 h-full">
              {/* LEFT COLUMN: TEAM 1 WEBCAM (PROMINENT & LIVE) */}
              <div
                className={`col-span-3 flex flex-col justify-between rounded-2xl border-2 p-3 transition-all relative overflow-hidden bg-slate-900/90 ${
                  activeAnsweringTeam === 'team1'
                    ? 'border-sky-400 ring-4 ring-sky-400/30 shadow-2xl shadow-sky-500/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Team 1 Header Info */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">⚔️</span>
                    <div>
                      <h3 className="text-sm md:text-base font-black text-sky-400 leading-tight">
                        {settings.team1Name}
                      </h3>
                      <p className="text-[10px] text-slate-400">Đội bên trái</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white font-mono">{team1Stats.score}</span>
                    <span className="text-[10px] text-slate-400 block font-bold">Điểm</span>
                  </div>
                </div>

                {/* Team 1 Live Camera View (Mirrored Left Half) */}
                <div className="my-2 flex-1 rounded-xl overflow-hidden bg-black/60 relative border border-slate-800">
                  {cameraError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-rose-400 text-xs">
                      <AlertTriangle className="w-6 h-6 mb-1" />
                      <span>{cameraError}</span>
                    </div>
                  ) : (
                    <div className="w-full h-full relative overflow-hidden">
                      <video
                        ref={(el) => {
                          if (el && streamRef.current && el.srcObject !== streamRef.current) {
                            el.srcObject = streamRef.current;
                            el.play().catch(() => {});
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover -scale-x-100"
                        style={{ objectPosition: 'left center' }}
                      />

                      {/* Hand Tracking Cursor Indicator */}
                      {team1Hand.detected && (
                        <div
                          className="absolute w-6 h-6 rounded-full border-2 border-sky-400 bg-sky-400/30 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform"
                          style={{
                            left: `${team1Hand.x * 2}%`,
                            top: `${team1Hand.y}%`,
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Active Answering Badge */}
                  {activeAnsweringTeam === 'team1' && (
                    <div className="absolute top-2 left-2 bg-sky-500 text-white font-black text-[11px] px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                      <span>👑</span>
                      <span>ĐANG TRẢ LỜI</span>
                    </div>
                  )}
                </div>

                {/* Team 1 Status Footer */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 z-10">
                  <span
                    className={`inline-flex items-center gap-1 ${
                      team1Hand.detected ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        team1Hand.detected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    {team1Hand.detected ? 'Đã nhận diện tay' : 'Chưa nhận diện tay'}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    🍎 {team1Stats.fruitsSliced} | 💣 {team1Stats.boomsHit}
                  </span>
                </div>
              </div>

              {/* CENTER COLUMN: QUESTION VIEW OR SHOW RESULT (6 COLUMNS) */}
              <div className="col-span-6 flex flex-col justify-between h-full relative">
                {(gameState === 'QUESTION' || gameState === 'ANSWER' || gameState === 'STEAL') && (
                  <FruitSlashQuestionView
                    question={currentQ}
                    questionNumber={currentQuestionIdx + 1}
                    totalQuestions={activeQuestions.length}
                    activeTeam={activeAnsweringTeam}
                    team1Name={settings.team1Name}
                    team2Name={settings.team2Name}
                    isStealMode={isStealMode}
                    timeLimit={isStealMode ? settings.stealTimeLimit : settings.answerTimeLimit}
                    activeHand={activeHand}
                    isDoublePointsActive={
                      activeAnsweringTeam === 'team1'
                        ? team1Stats.doublePointsActive
                        : team2Stats.doublePointsActive
                    }
                    onAnswerSelected={handleAnswerSelected}
                    onTimeExpired={handleQuestionTimeExpired}
                    selectedAnswerIndex={selectedAnswerIndex}
                    isAnswerSubmitted={isAnswerSubmitted}
                    showCorrectAnswer={isAnswerSubmitted}
                  />
                )}

                {gameState === 'SHOW_RESULT' && (
                  <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-900/95 rounded-2xl border border-slate-800 text-center space-y-4 shadow-xl">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto">
                      {isAnswerCorrect ? '🎉' : '💡'}
                    </div>

                    <div className="space-y-2 max-w-lg">
                      <h3 className="text-xl font-black text-white">
                        {isAnswerCorrect ? 'Câu trả lời chính xác!' : 'Đáp án đúng là:'}
                      </h3>
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm">
                        {currentQ.options[currentQ.correctAnswer]}
                      </div>
                      {currentQ.explanation && (
                        <p className="text-xs text-slate-400 italic pt-1">
                          Giải thích: {currentQ.explanation}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleProceedNext}
                      className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
                    >
                      <span>
                        {currentQuestionIdx + 1 < activeQuestions.length
                          ? 'CÂU TIẾP THEO (Phím Cách)'
                          : 'XEM KẾT QUẢ CHUNG CUỘC'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: TEAM 2 WEBCAM (PROMINENT & LIVE) */}
              <div
                className={`col-span-3 flex flex-col justify-between rounded-2xl border-2 p-3 transition-all relative overflow-hidden bg-slate-900/90 ${
                  activeAnsweringTeam === 'team2'
                    ? 'border-amber-400 ring-4 ring-amber-400/30 shadow-2xl shadow-amber-500/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Team 2 Header Info */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🔥</span>
                    <div>
                      <h3 className="text-sm md:text-base font-black text-amber-400 leading-tight">
                        {settings.team2Name}
                      </h3>
                      <p className="text-[10px] text-slate-400">Đội bên phải</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white font-mono">{team2Stats.score}</span>
                    <span className="text-[10px] text-slate-400 block font-bold">Điểm</span>
                  </div>
                </div>

                {/* Team 2 Live Camera View (Mirrored Right Half) */}
                <div className="my-2 flex-1 rounded-xl overflow-hidden bg-black/60 relative border border-slate-800">
                  {cameraError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-rose-400 text-xs">
                      <AlertTriangle className="w-6 h-6 mb-1" />
                      <span>{cameraError}</span>
                    </div>
                  ) : (
                    <div className="w-full h-full relative overflow-hidden">
                      <video
                        ref={(el) => {
                          if (el && streamRef.current && el.srcObject !== streamRef.current) {
                            el.srcObject = streamRef.current;
                            el.play().catch(() => {});
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover -scale-x-100"
                        style={{ objectPosition: 'right center' }}
                      />

                      {/* Hand Tracking Cursor Indicator */}
                      {team2Hand.detected && (
                        <div
                          className="absolute w-6 h-6 rounded-full border-2 border-amber-400 bg-amber-400/30 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform"
                          style={{
                            left: `${(team2Hand.x - 50) * 2}%`,
                            top: `${team2Hand.y}%`,
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Active Answering Badge */}
                  {activeAnsweringTeam === 'team2' && (
                    <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 font-black text-[11px] px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                      <span>👑</span>
                      <span>ĐANG TRẢ LỜI</span>
                    </div>
                  )}
                </div>

                {/* Team 2 Status Footer */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 z-10">
                  <span
                    className={`inline-flex items-center gap-1 ${
                      team2Hand.detected ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        team2Hand.detected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    {team2Hand.detected ? 'Đã nhận diện tay' : 'Chưa nhận diện tay'}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    🍎 {team2Stats.fruitsSliced} | 💣 {team2Stats.boomsHit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            STATE: GAME_OVER (Match summary & celebration)
        ======================================================= */}
        {gameState === 'GAME_OVER' && (
          <div className="flex-1 flex flex-col justify-center items-center py-6">
            <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6">
              {/* Champion Trophy */}
              <div className="space-y-2">
                <div className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-4xl mx-auto shadow-lg shadow-amber-500/20">
                  🏆
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white">
                  {team1Stats.score > team2Stats.score
                    ? `CHÚC MỪNG ${settings.team1Name.toUpperCase()} CHIẾN THẮNG!`
                    : team2Stats.score > team1Stats.score
                    ? `CHÚC MỪNG ${settings.team2Name.toUpperCase()} CHIẾN THẮNG!`
                    : 'KẾT QUẢ HOÀ NHAU XUẤT SẮC!'}
                </h2>
                <p className="text-xs text-slate-400">
                  Trận đấu hoàn tất {activeQuestions.length} câu hỏi tương tác phản xạ chém trái cây.
                </p>
              </div>

              {/* Statistics Comparison Grid */}
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                {/* Team 1 Card */}
                <div className={`p-4 rounded-2xl border-2 space-y-3 ${
                  team1Stats.score >= team2Stats.score ? 'bg-sky-950/40 border-sky-400' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-base text-sky-400">{settings.team1Name}</span>
                    <span className="font-black text-2xl text-white font-mono">{team1Stats.score} đ</span>
                  </div>
                  <div className="text-xs space-y-1.5 text-slate-300">
                    <p className="flex justify-between">
                      <span>Số câu trả lời đúng:</span>
                      <strong className="text-emerald-400">{team1Stats.correctAnswers}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Trái cây đã chém:</span>
                      <strong className="text-sky-300">{team1Stats.fruitsSliced}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Số lần dính Boom:</span>
                      <strong className="text-rose-400">{team1Stats.boomsHit}</strong>
                    </p>
                  </div>
                </div>

                {/* Team 2 Card */}
                <div className={`p-4 rounded-2xl border-2 space-y-3 ${
                  team2Stats.score >= team1Stats.score ? 'bg-amber-950/40 border-amber-400' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-base text-amber-400">{settings.team2Name}</span>
                    <span className="font-black text-2xl text-white font-mono">{team2Stats.score} đ</span>
                  </div>
                  <div className="text-xs space-y-1.5 text-slate-300">
                    <p className="flex justify-between">
                      <span>Số câu trả lời đúng:</span>
                      <strong className="text-emerald-400">{team2Stats.correctAnswers}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Trái cây đã chém:</span>
                      <strong className="text-amber-300">{team2Stats.fruitsSliced}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Số lần dính Boom:</span>
                      <strong className="text-rose-400">{team2Stats.boomsHit}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>CHƠI LẠI TRẬN NÀY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameState('SETUP')}
                  className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Cài đặt bộ câu hỏi khác</span>
                </button>

                <button
                  type="button"
                  onClick={onBackToEduplay}
                  className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Home className="w-4 h-4" />
                  <span>Về trang chủ Eduplay</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* WEBCAM PREVIEW MODAL */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-sky-400" />
                  <span>Kiểm tra webcam & Nhận diện tay</span>
                </h3>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="aspect-video w-full rounded-2xl bg-black relative overflow-hidden border border-slate-800">
                <video
                  ref={(el) => {
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch(() => {});
                    }
                    if (el) {
                      detectorRef.current.setVideoElement(el);
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />

                {/* Split Center Line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-dashed bg-rose-500/60 pointer-events-none" />

                {/* Team 1 Reticle */}
                {team1Hand.detected && (
                  <div
                    className="absolute w-8 h-8 rounded-full border-2 border-sky-400 bg-sky-400/30 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[10px] text-sky-300 font-bold pointer-events-none"
                    style={{ left: `${team1Hand.x}%`, top: `${team1Hand.y}%` }}
                  >
                    T1
                  </div>
                )}

                {/* Team 2 Reticle */}
                {team2Hand.detected && (
                  <div
                    className="absolute w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-400/30 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[10px] text-amber-300 font-bold pointer-events-none"
                    style={{ left: `${team2Hand.x}%`, top: `${team2Hand.y}%` }}
                  >
                    T2
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-sky-500/30 text-sky-300">
                  <p className="font-bold">Nửa trái: {settings.team1Name}</p>
                  <p className="text-[11px] text-slate-400">
                    Trạng thái: {team1Hand.detected ? '✅ Đã nhận diện tay' : '⏳ Đưa tay lên để kiểm tra'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300">
                  <p className="font-bold">Nửa phải: {settings.team2Name}</p>
                  <p className="text-[11px] text-slate-400">
                    Trạng thái: {team2Hand.detected ? '✅ Đã nhận diện tay' : '⏳ Đưa tay lên để kiểm tra'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    detectorRef.current.resetTracking();
                    startCamera();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khởi động lại nhận diện</span>
                </button>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-rose-600/30"
                >
                  Hoàn tất kiểm tra
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* QUESTION IMPORT MODAL */}
      <QuestionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentQuestions={activeQuestions}
        saveAsLesson={true}
        onImportSuccess={(newQuestions) => {
          setActiveQuestions(newQuestions);
          setIsImportModalOpen(false);
        }}
      />

      {/* QUESTION BANK SELECTOR MODAL */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto p-4 sm:p-6 text-slate-100">
            <QuestionBankSelector
              selectedLessonId={selectedLessonId}
              isModal={true}
              onClose={() => setIsBankModalOpen(false)}
              onSelectLesson={(lesson) => {
                setSelectedLessonId(lesson.id);
                setSelectedLesson(lesson);
                setActiveQuestions(lesson.questions);
                setIsBankModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
