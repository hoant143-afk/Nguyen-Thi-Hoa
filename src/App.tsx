import React, { useState, useEffect, useCallback } from 'react';
import { GameSession, GameSettings, GameState, TeamId, Question } from './types';
import { DEFAULT_QUESTIONS, DEFAULT_SETTINGS } from './data/defaultQuestions';
import { GameRepository } from './repositories/gameRepository';
import { ScoringService } from './services/scoringService';
import { soundService } from './services/soundService';

import { Scoreboard } from './components/Scoreboard';
import { HomeScreen } from './components/HomeScreen';
import { ReadyScreen } from './components/ReadyScreen';
import { CountdownScreen } from './components/CountdownScreen';
import { CameraRaceScreen } from './components/CameraRaceScreen';
import { WinnerFreezeScreen } from './components/WinnerFreezeScreen';
import { TieScreen } from './components/TieScreen';
import { QuestionScreen } from './components/QuestionScreen';
import { AnswerResultScreen } from './components/AnswerResultScreen';
import { StealScreen } from './components/StealScreen';
import { FinalResultScreen } from './components/FinalResultScreen';
import { CertificateScreen } from './components/CertificateScreen';
import { CameraCalibrationModal } from './components/CameraCalibrationModal';
import { AdminModal } from './components/AdminModal';

export default function App() {
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
      // Grand Final
      setSession((prev) => ({ ...prev, state: 'FINAL_RESULT' }));
    } else {
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

  // Go to Home
  const handleGoHome = () => {
    setSession((prev) => ({ ...prev, state: 'HOME' }));
  };

  // Open Certificate screen
  const handleOpenCertificate = () => {
    setSession((prev) => ({ ...prev, state: 'CERTIFICATE' }));
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

      {/* Main Content Area rendered based on state */}
      <main className="flex-1 flex flex-col justify-center relative overflow-hidden">
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
            onCountdownComplete={handleCountdownComplete}
          />
        )}

        {session.state === 'CAMERA_RACE' && (
          <CameraRaceScreen
            session={session}
            settings={settings}
            raceStartTimestamp={session.raceStartTimestamp}
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
            settings={settings}
            onProceedToQuestion={handleProceedToQuestion}
          />
        )}

        {session.state === 'TIE_FREEZE' && (
          <TieScreen
            session={session}
            onRetryRace={handleRetryRace}
          />
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

        {session.state === 'ANSWER_RESULT' && session.currentRaceWinner && selectedAnswerIndex !== null && (
          <AnswerResultScreen
            session={session}
            answeringTeam={session.currentRaceWinner}
            selectedAnswerIndex={selectedAnswerIndex}
            isCorrect={isAnswerCorrect}
            onProceedToNext={handleProceedToNext}
            onProceedToSteal={handleProceedToSteal}
          />
        )}

        {session.state === 'STEAL' && stealingTeam && selectedAnswerIndex !== null && (
          <StealScreen
            session={session}
            settings={settings}
            stealingTeam={stealingTeam}
            previousWrongIndex={selectedAnswerIndex}
            onStealSubmit={handleStealSubmit}
            onProceedToNext={handleProceedToNext}
          />
        )}

        {session.state === 'FINAL_RESULT' && (
          <FinalResultScreen
            session={session}
            onOpenCertificate={handleOpenCertificate}
            onRestartGame={handleRestartGame}
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

      {/* Global Calibration & Admin Modals */}
      <CameraCalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        settings={settings}
        onUpdateSettings={handleSaveSettings}
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
}
