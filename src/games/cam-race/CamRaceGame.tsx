import React, { useState, useEffect, useCallback } from 'react';
import { GameSession, GameSettings, TeamId, Question } from '../../types';
import { DEFAULT_QUESTIONS } from '../../data/defaultQuestions';
import { GameRepository } from '../../repositories/gameRepository';
import { ScoringService } from '../../services/scoringService';
import { soundService } from '../../services/soundService';
import { EduplayStorage } from '../../services/eduplayStorage';
import { apiClient } from '../../services/apiClient';
import { SessionsRepository } from '../../repositories/sessionsRepository';
import { CamRaceRepository } from '../../repositories/camRaceRepository';
import { CertificateRepository } from '../../repositories/certificateRepository';

import { Scoreboard } from '../../components/Scoreboard';
import { HomeScreen } from '../../components/HomeScreen';
import { ReadyScreen } from '../../components/ReadyScreen';
import { CountdownScreen } from '../../components/CountdownScreen';
import { CameraRaceScreen } from '../../components/CameraRaceScreen';
import { WinnerFreezeScreen } from '../../components/WinnerFreezeScreen';
import { TieScreen } from '../../components/TieScreen';
import { QuestionScreen } from '../../components/QuestionScreen';
import { AnswerResultScreen } from '../../components/AnswerResultScreen';
import { StealScreen } from '../../components/StealScreen';
import { FinalResultScreen } from '../../components/FinalResultScreen';
import { CertificateScreen } from '../../components/CertificateScreen';
import { CameraCalibrationModal } from '../../components/CameraCalibrationModal';
import { AdminModal } from '../../components/AdminModal';

interface CamRaceGameProps {
  onBackToEduplay: () => void;
}

export const CamRaceGame: React.FC<CamRaceGameProps> = ({ onBackToEduplay }) => {
  const cloudSessionIdRef = React.useRef<string | null>(null);
  const [settings, setSettings] = useState<GameSettings>(() => GameRepository.loadSettings());
  const [questions, setQuestions] = useState<Question[]>(() => GameRepository.loadQuestions());
  const [savedSession, setSavedSession] = useState<GameSession | null>(() => GameRepository.loadSession());

  const [session, setSession] = useState<GameSession>(() => {
    const loaded = GameRepository.loadSession();
    if (loaded) return loaded;

    return {
      gameId: `game_${Date.now()}`,
      blueTeamName: 'BLUE TECH',
      orangeTeamName: 'ORANGE CODE',
      className: '5A1',
      teacherName: 'Thầy Hoàng',
      schoolName: 'Trường Tiểu học Chu Văn An',
      currentQuestionIndex: 0,
      blueScore: 0,
      orangeScore: 0,
      currentRaceWinner: null,
      winnerSnapshotUrl: null,
      raceStartTimestamp: null,
      winnerReactionTimeMs: null,
      history: [],
      questions: DEFAULT_QUESTIONS,
      state: 'HOME',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  // Temporary question answering state
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(false);
  const [stealingTeam, setStealingTeam] = useState<TeamId | null>(null);

  // Save session to localStorage when updated
  useEffect(() => {
    if (session.state !== 'HOME') {
      GameRepository.saveSession(session);
      setSavedSession(session);
    }
  }, [session]);

  // Sync sound settings
  useEffect(() => {
    soundService.setMuted(!settings.soundEnabled || isSoundMuted);
    soundService.setVolume(settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume, isSoundMuted]);

  // Start new game handler
  const handleStartNewGame = (formData: {
    blueTeamName: string;
    orangeTeamName: string;
    className: string;
    teacherName: string;
    schoolName: string;
  }) => {
    const newSession: GameSession = {
      gameId: `game_${Date.now()}`,
      blueTeamName: formData.blueTeamName,
      orangeTeamName: formData.orangeTeamName,
      className: formData.className,
      teacherName: formData.teacherName,
      schoolName: formData.schoolName,
      currentQuestionIndex: 0,
      blueScore: 0,
      orangeScore: 0,
      currentRaceWinner: null,
      winnerSnapshotUrl: null,
      raceStartTimestamp: null,
      winnerReactionTimeMs: null,
      history: [],
      questions: questions,
      state: 'READY',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSession(newSession);

    // If Cloud Mode is active, create cloud session on Google Sheets
    if (apiClient.getMode() === 'cloud') {
      SessionsRepository.createSession({
        gameSlug: 'cam-race',
        activityName: `Cam Race - ${formData.className}`,
        className: formData.className,
        blueTeamName: formData.blueTeamName,
        orangeTeamName: formData.orangeTeamName,
        totalQuestions: questions.length,
      })
        .then((cloudSes) => {
          if (cloudSes) {
            cloudSessionIdRef.current = cloudSes.id;
          }
        })
        .catch(() => {});
    }
  };

  // Resume saved game
  const handleResumeGame = () => {
    if (savedSession) {
      setSession(savedSession);
    }
  };

  // Start countdown & camera race from ready state
  const handleStartCountdown = () => {
    setSession((prev) => ({
      ...prev,
      currentRaceWinner: null,
      winnerSnapshotUrl: null,
      winnerReactionTimeMs: null,
      raceStartTimestamp: null,
      state: 'CAMERA_RACE',
    }));
  };

  // Countdown finished with RUNNN -> Activate Camera Race
  const handleCountdownComplete = (raceStartTimestamp: number) => {
    setSession((prev) => ({
      ...prev,
      raceStartTimestamp,
      state: 'CAMERA_RACE',
    }));
  };

  // Winner locked in Camera Race
  const handleWinnerLock = useCallback(
    (winner: TeamId, snapshotUrl: string | null, reactionTimeMs: number) => {
      setSession((prev) => {
        const teamName = winner === 'blue' ? prev.blueTeamName : prev.orangeTeamName;
        const currentQ = prev.questions[prev.currentQuestionIndex];
        const newMoments = [...(prev.moments || [])];

        if (snapshotUrl) {
          newMoments.push({
            questionIndex: prev.currentQuestionIndex,
            questionText: currentQ?.question || `Câu ${prev.currentQuestionIndex + 1}`,
            winner,
            teamName,
            snapshotUrl,
            reactionTimeMs,
            timestamp: Date.now(),
          });
        }

        // Send race detection metrics to Cloud (strictly without images or biometric data)
        if (apiClient.getMode() === 'cloud' && cloudSessionIdRef.current) {
          CamRaceRepository.recordRaceDetection({
            sessionId: cloudSessionIdRef.current,
            questionId: currentQ?.id || prev.currentQuestionIndex + 1,
            questionOrder: prev.currentQuestionIndex + 1,
            winnerTeam: winner === 'blue' ? 'BLUE' : 'ORANGE',
            timeDifferenceMs: reactionTimeMs,
            detectionMethod: 'CAMERA',
          }).catch(() => {});
        }

        return {
          ...prev,
          currentRaceWinner: winner,
          winnerSnapshotUrl: snapshotUrl,
          winnerReactionTimeMs: reactionTimeMs,
          moments: newMoments,
          state: 'WINNER_FREEZE',
        };
      });
    },
    []
  );

  // Tie detected in Camera Race
  const handleTie = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      state: 'TIE_FREEZE',
    }));
  }, []);

  // Retry race after Tie
  const handleRetryRace = () => {
    setSession((prev) => ({
      ...prev,
      currentRaceWinner: null,
      winnerSnapshotUrl: null,
      winnerReactionTimeMs: null,
      raceStartTimestamp: null,
      state: 'CAMERA_RACE',
    }));
  };

  // Proceed from Winner Freeze to Question screen
  const handleProceedToQuestion = () => {
    setSelectedAnswerIndex(null);
    setSession((prev) => ({ ...prev, state: 'QUESTION' }));
  };

  // Answer selected in Question Screen
  const handleSelectAnswer = (choiceIdx: number) => {
    setSelectedAnswerIndex(choiceIdx);
    const currentQ = session.questions[session.currentQuestionIndex];
    const isCorrect = choiceIdx === currentQ.correctAnswer;
    setIsAnswerCorrect(isCorrect);

    const winner = session.currentRaceWinner || 'blue';
    const points = isCorrect
      ? currentQ.isSpecial
        ? settings.specialPoints
        : currentQ.normalPoints || settings.normalPoints
      : 0;

    const { updatedSession } = ScoringService.recordTransaction(
      session,
      currentQ.id,
      winner,
      isCorrect
        ? currentQ.isSpecial
          ? 'SPECIAL_CORRECT'
          : 'RACE_CORRECT'
        : 'RACE_WRONG',
      points
    );

    setSession({
      ...updatedSession,
      state: 'ANSWER_RESULT',
    });

    // Cloud record answer
    if (apiClient.getMode() === 'cloud' && cloudSessionIdRef.current) {
      const letters = ['A', 'B', 'C', 'D'];
      CamRaceRepository.submitAnswer({
        sessionId: cloudSessionIdRef.current,
        questionId: currentQ.id,
        teamCode: winner === 'blue' ? 'BLUE' : 'ORANGE',
        answer: letters[choiceIdx] || 'A',
        answerType: 'RACE',
        roundNumber: session.currentQuestionIndex + 1,
      }).catch(() => {});
    }
  };

  // 15s Timer expired without answer in Question screen -> Handover to other team
  const handleQuestionTimeout = () => {
    setSelectedAnswerIndex(-1);
    setIsAnswerCorrect(false);
    const currentQ = session.questions[session.currentQuestionIndex];
    const winner = session.currentRaceWinner || 'blue';

    const { updatedSession } = ScoringService.recordTransaction(
      session,
      currentQ.id,
      winner,
      'RACE_WRONG',
      0
    );

    setSession({
      ...updatedSession,
      state: 'ANSWER_RESULT',
    });
  };

  // Proceed to next question or final result
  const handleProceedToNext = () => {
    const nextIdx = session.currentQuestionIndex + 1;
    if (nextIdx >= session.questions.length) {
      // Grand Final: log match to Eduplay match history
      EduplayStorage.addHistoryEntry({
        gameId: 'cam-race',
        gameName: 'CAM RACE',
        className: session.className || '5A1',
        timestamp: Date.now(),
        winner:
          session.blueScore > session.orangeScore
            ? session.blueTeamName
            : session.orangeScore > session.blueScore
            ? session.orangeTeamName
            : 'Hòa nhau',
        summary: `Điểm số: ${session.blueTeamName} (${session.blueScore}) - ${session.orangeTeamName} (${session.orangeScore})`,
      });

      setSession((prev) => ({ ...prev, state: 'FINAL_RESULT' }));

      // Finish cloud session and issue winner certificate on Google Sheets
      if (apiClient.getMode() === 'cloud' && cloudSessionIdRef.current) {
        SessionsRepository.finishSession(cloudSessionIdRef.current).catch(() => {});
        const winnerName =
          session.blueScore > session.orangeScore
            ? session.blueTeamName
            : session.orangeScore > session.blueScore
            ? session.orangeTeamName
            : 'Đồng hạng Nhất';

        CertificateRepository.issueCertificate({
          sessionId: cloudSessionIdRef.current,
          recipientName: winnerName,
          awardTitle: 'QUÁN QUÂN CAM RACE',
          score: Math.max(session.blueScore, session.orangeScore),
          schoolName: session.schoolName,
        }).catch(() => {});
      }
    } else {
      // Complete current question on cloud
      if (apiClient.getMode() === 'cloud' && cloudSessionIdRef.current) {
        CamRaceRepository.completeQuestion(cloudSessionIdRef.current, nextIdx).catch(() => {});
      }

      // Next Question Ready Screen
      setSession((prev) => ({
        ...prev,
        currentQuestionIndex: nextIdx,
        currentRaceWinner: null,
        winnerSnapshotUrl: null,
        winnerReactionTimeMs: null,
        raceStartTimestamp: null,
        state: 'READY',
      }));
    }
  };

  // Proceed to Steal stage when answer is wrong
  const handleProceedToSteal = () => {
    const currentWinner = session.currentRaceWinner || 'blue';
    const stealTeam: TeamId = currentWinner === 'blue' ? 'orange' : 'blue';
    setStealingTeam(stealTeam);
    setSession((prev) => ({ ...prev, state: 'STEAL' }));
  };

  // Steal answer submitted
  const handleStealSubmit = (choiceIdx: number) => {
    const currentQ = session.questions[session.currentQuestionIndex];
    const stealTeam = stealingTeam || 'orange';
    const isCorrect = choiceIdx === currentQ.correctAnswer;
    const points = isCorrect ? (currentQ.isSpecial ? 10 : currentQ.stealPoints || settings.stealPoints) : 0;

    const { updatedSession } = ScoringService.recordTransaction(
      session,
      currentQ.id,
      stealTeam,
      isCorrect ? 'STEAL_CORRECT' : 'STEAL_WRONG',
      points
    );

    setSession(updatedSession);

    // Cloud record steal answer
    if (apiClient.getMode() === 'cloud' && cloudSessionIdRef.current) {
      const letters = ['A', 'B', 'C', 'D'];
      CamRaceRepository.submitAnswer({
        sessionId: cloudSessionIdRef.current,
        questionId: currentQ.id,
        teamCode: stealTeam === 'blue' ? 'BLUE' : 'ORANGE',
        answer: letters[choiceIdx] || 'A',
        answerType: 'STEAL',
        roundNumber: session.currentQuestionIndex + 1,
      }).catch(() => {});
    }
  };

  // Restart match from beginning
  const handleRestartGame = () => {
    const newSession: GameSession = {
      ...session,
      gameId: `game_${Date.now()}`,
      currentQuestionIndex: 0,
      blueScore: 0,
      orangeScore: 0,
      currentRaceWinner: null,
      winnerSnapshotUrl: null,
      raceStartTimestamp: null,
      winnerReactionTimeMs: null,
      history: [],
      state: 'READY',
      updatedAt: Date.now(),
    };
    setSession(newSession);
  };

  // Go to Cam Race Home setup
  const handleGoHome = () => {
    setSession((prev) => ({ ...prev, state: 'HOME' }));
  };

  // Admin save questions
  const handleSaveQuestions = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    GameRepository.saveQuestions(newQuestions);
    setSession((prev) => ({ ...prev, questions: newQuestions }));
  };

  // Admin save settings
  const handleSaveSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    GameRepository.saveSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Banner indicating EDUPLAY Navigation */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundService.playClick();
              onBackToEduplay();
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 px-3 py-1 rounded-lg border border-slate-700 transition-colors font-bold cursor-pointer"
          >
            <span>← Về Trang Chủ EDUPLAY</span>
          </button>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline font-medium">
            Trò chơi: <strong className="text-cyan-400">🏃 CAM RACE – Thi đấu webcam</strong>
          </span>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Hệ thống AI Vision đã sẵn sàng</span>
        </div>
      </div>

      {/* Persistent Scoreboard on Top (visible in match states) */}
      {session.state !== 'HOME' && session.state !== 'CERTIFICATE' && (
        <Scoreboard
          session={session}
          settings={settings}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
          onSoundToggle={() => setIsSoundMuted(!isSoundMuted)}
          onGoHome={handleGoHome}
          isSoundMuted={isSoundMuted}
        />
      )}

      {/* Main Game Screen Router */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 relative">
        {session.state === 'HOME' && (
          <HomeScreen
            initialSession={session}
            savedSession={savedSession}
            onStartNewGame={handleStartNewGame}
            onResumeGame={handleResumeGame}
            onOpenCalibration={() => setIsCalibrationOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
            settings={settings}
          />
        )}

        {session.state === 'READY' && (
          <ReadyScreen
            session={session}
            settings={settings}
            onStartCountdown={handleStartCountdown}
            onGoHome={handleGoHome}
          />
        )}

        {session.state === 'COUNTDOWN' && (
          <CountdownScreen
            session={session}
            settings={settings}
            onCountdownComplete={handleCountdownComplete}
          />
        )}

        {session.state === 'CAMERA_RACE' && (
          <CameraRaceScreen
            session={session}
            settings={settings}
            onWinnerLock={handleWinnerLock}
            onTie={handleTie}
          />
        )}

        {session.state === 'WINNER_FREEZE' && session.currentRaceWinner && (
          <WinnerFreezeScreen
            session={session}
            winner={session.currentRaceWinner}
            snapshotUrl={session.winnerSnapshotUrl}
            reactionTimeMs={session.winnerReactionTimeMs}
            onProceed={handleProceedToQuestion}
          />
        )}

        {session.state === 'TIE_FREEZE' && (
          <TieScreen onRetry={handleRetryRace} />
        )}

        {session.state === 'QUESTION' && session.currentRaceWinner && (
          <QuestionScreen
            session={session}
            settings={settings}
            activeTeam={session.currentRaceWinner}
            onSelectAnswer={handleSelectAnswer}
            onTimeout={handleQuestionTimeout}
          />
        )}

        {session.state === 'ANSWER_RESULT' && selectedAnswerIndex !== null && session.currentRaceWinner && (
          <AnswerResultScreen
            session={session}
            isCorrect={isAnswerCorrect}
            selectedIndex={selectedAnswerIndex}
            activeTeam={session.currentRaceWinner}
            onProceedNext={handleProceedToNext}
            onProceedSteal={handleProceedToSteal}
          />
        )}

        {session.state === 'STEAL' && stealingTeam && selectedAnswerIndex !== null && (
          <StealScreen
            session={session}
            settings={settings}
            stealingTeam={stealingTeam}
            previousWrongIndex={selectedAnswerIndex}
            onStealSubmit={handleStealSubmit}
            onProceedNext={handleProceedToNext}
          />
        )}

        {session.state === 'FINAL_RESULT' && (
          <FinalResultScreen
            session={session}
            onRestart={handleRestartGame}
            onOpenCertificate={() => setSession((prev) => ({ ...prev, state: 'CERTIFICATE' }))}
            onGoHome={handleGoHome}
          />
        )}

        {session.state === 'CERTIFICATE' && (
          <CertificateScreen
            session={session}
            onBack={() => setSession((prev) => ({ ...prev, state: 'FINAL_RESULT' }))}
            onGoHome={handleGoHome}
          />
        )}
      </main>

      {/* Global Modals */}
      <CameraCalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        questions={questions}
        settings={settings}
        onSaveQuestions={handleSaveQuestions}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
};
