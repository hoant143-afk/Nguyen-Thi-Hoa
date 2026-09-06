import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { GameSettings, DetectionResult, TeamId } from '../types';
import { analyzeVideoFrame, captureSnapshot } from '../utils/colorDetection';
import { soundService } from '../services/soundService';

interface UseRaceDetectionProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  settings: GameSettings;
  isActive: boolean;
  isHoldActive?: boolean;
  raceStartTimestamp: number | null;
  questionIndex?: number;
  blueTeamName?: string;
  orangeTeamName?: string;
  onWinnerLock: (winner: TeamId, snapshotUrl: string | null, reactionTimeMs: number) => void;
  onTie: () => void;
}

export function useRaceDetection({
  videoRef,
  settings,
  isActive,
  isHoldActive = false,
  raceStartTimestamp,
  questionIndex,
  blueTeamName,
  orangeTeamName,
  onWinnerLock,
  onTie,
}: UseRaceDetectionProps) {
  const [detection, setDetection] = useState<DetectionResult>({
    hasPerson: false,
    status: 'NO_CARD',
    blueScore: 0,
    orangeScore: 0,
    blueStableFrames: 0,
    orangeStableFrames: 0,
    blueCardDetected: false,
    orangeCardDetected: false,
    timestamp: 0,
    winnerCandidate: null,
  });

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0);

  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isLockedRef = useRef<boolean>(false);

  const blueStableCountRef = useRef<number>(0);
  const orangeStableCountRef = useRef<number>(0);
  const blueCandidateTimeRef = useRef<number | null>(null);
  const orangeCandidateTimeRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(performance.now());

  // Ambient baseline tracking to eliminate false triggers from room background
  const blueBaselineRef = useRef<number>(0);
  const orangeBaselineRef = useRef<number>(0);
  const baselineSamplesRef = useRef<number>(0);

  // Reset state when race becomes active
  useEffect(() => {
    if (isActive) {
      isLockedRef.current = false;
      setIsLocked(false);
      blueStableCountRef.current = 0;
      orangeStableCountRef.current = 0;
      blueCandidateTimeRef.current = null;
      orangeCandidateTimeRef.current = null;
      blueBaselineRef.current = 0;
      orangeBaselineRef.current = 0;
      baselineSamplesRef.current = 0;
    }
  }, [isActive]);

  const processFrame = useCallback(() => {
    if (!isActive || isLockedRef.current || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    if (!processingCanvasRef.current) {
      processingCanvasRef.current = document.createElement('canvas');
    }

    const now = performance.now();

    // FPS calculation
    frameCountRef.current++;
    if (now - lastFpsUpdateRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }

    // Run computer vision analysis
    const { result, updatedBlueStable, updatedOrangeStable } = analyzeVideoFrame(
      video,
      processingCanvasRef.current,
      settings,
      blueStableCountRef.current,
      orangeStableCountRef.current,
      {
        blueBaseline: blueBaselineRef.current,
        orangeBaseline: orangeBaselineRef.current,
      }
    );

    setDetection(result);

    // During 3-2-1 Countdown: Continuously calibrate background ambient noise
    if (isHoldActive) {
      if (result.roiStats) {
        const bRatio = result.roiStats.blueRatio;
        const oRatio = result.roiStats.orangeRatio;
        // Moving baseline average
        blueBaselineRef.current = (blueBaselineRef.current * 0.85) + (bRatio * 0.15);
        orangeBaselineRef.current = (orangeBaselineRef.current * 0.85) + (oRatio * 0.15);
        baselineSamplesRef.current++;
      }

      blueStableCountRef.current = 0;
      orangeStableCountRef.current = 0;
      blueCandidateTimeRef.current = null;
      orangeCandidateTimeRef.current = null;
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // STRICT RULE: All detection before active raceStartTimestamp is INVALID.
    if (!raceStartTimestamp || now < raceStartTimestamp) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    blueStableCountRef.current = updatedBlueStable;
    orangeStableCountRef.current = updatedOrangeStable;

    const minRequiredFrames = Math.max(2, settings.minStableFrames || 3);

    // Record candidate trigger timestamps
    if (updatedBlueStable >= minRequiredFrames && !blueCandidateTimeRef.current) {
      blueCandidateTimeRef.current = now;
    }
    if (updatedOrangeStable >= minRequiredFrames && !orangeCandidateTimeRef.current) {
      orangeCandidateTimeRef.current = now;
    }

    const blueTime = blueCandidateTimeRef.current;
    const orangeTime = orangeCandidateTimeRef.current;

    // Check for Genuine Tie
    if (blueTime && orangeTime) {
      const timeDiff = Math.abs(blueTime - orangeTime);
      const tieThreshold = Math.min(80, settings.tieThresholdMs || 80);
      const scoreDiff = Math.abs(result.blueScore - result.orangeScore);

      // Only tie if both times are within ultra-close window (<80ms) and score is close (<15%)
      if (timeDiff <= tieThreshold && scoreDiff < 15) {
        isLockedRef.current = true;
        setIsLocked(true);
        soundService.playTieWarning();
        onTie();
        return;
      }
    }

    // If one team clearly qualified as winnerCandidate
    if (result.winnerCandidate && !isLockedRef.current) {
      // Check if candidate has achieved requisite stability
      const winner = result.winnerCandidate;
      const winnerScore = winner === 'blue' ? result.blueScore : result.orangeScore;

      if (winnerScore >= 70) {
        isLockedRef.current = true;
        setIsLocked(true);

        const reactionTimeMs = Math.max(120, Math.round(now - raceStartTimestamp));
        const teamWinnerName = winner === 'blue' ? blueTeamName : orangeTeamName;
        const snapshot = captureSnapshot(video, {
          winner,
          teamName: teamWinnerName,
          questionIndex,
          reactionTimeMs,
        });

        soundService.playShutter();
        setTimeout(() => {
          soundService.playRaceLock(winner);
        }, 80);

        onWinnerLock(winner, snapshot, reactionTimeMs);
        return;
      }
    }

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [
    isActive,
    isHoldActive,
    raceStartTimestamp,
    settings,
    videoRef,
    blueTeamName,
    orangeTeamName,
    questionIndex,
    onWinnerLock,
    onTie,
  ]);

  useEffect(() => {
    if (isActive) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isActive, processFrame]);

  const triggerManualWinner = useCallback(
    (winner: TeamId) => {
      if (isLockedRef.current) return;
      isLockedRef.current = true;
      setIsLocked(true);

      const reactionTimeMs = raceStartTimestamp ? Math.round(performance.now() - raceStartTimestamp) : 800;
      const teamWinnerName = winner === 'blue' ? blueTeamName : orangeTeamName;

      let snapshot: string | null = null;
      if (videoRef.current) {
        snapshot = captureSnapshot(videoRef.current, {
          winner,
          teamName: teamWinnerName,
          questionIndex,
          reactionTimeMs,
        });
      }

      soundService.playShutter();
      setTimeout(() => {
        soundService.playRaceLock(winner === 'orange' ? 'orange' : 'blue');
      }, 80);

      onWinnerLock(winner, snapshot, reactionTimeMs);
    },
    [blueTeamName, orangeTeamName, questionIndex, raceStartTimestamp, videoRef, onWinnerLock]
  );

  const triggerManualTie = useCallback(() => {
    if (isLockedRef.current) return;
    isLockedRef.current = true;
    setIsLocked(true);
    soundService.playTieWarning();
    onTie();
  }, [onTie]);

  return {
    detection,
    isLocked,
    fps,
    triggerManualWinner,
    triggerManualTie,
  };
}
