export type GameState =
  | 'HOME'
  | 'READY'
  | 'COUNTDOWN'
  | 'CAMERA_RACE'
  | 'WINNER_FREEZE'
  | 'TIE_FREEZE'
  | 'QUESTION'
  | 'ANSWER_RESULT'
  | 'STEAL'
  | 'STEAL_RESULT'
  | 'EXPLANATION'
  | 'FINAL_RESULT'
  | 'CERTIFICATE';

export type TeamId = 'blue' | 'orange';

export interface Team {
  id: TeamId;
  name: string;
  color: string;
  accentColor: string;
  score: number;
}

export interface Question {
  id: number;
  question: string;
  options: string[]; // 4 choices [A, B, C, D]
  correctAnswer: number; // 0, 1, 2, 3
  explanation: string;
  category: string;
  isSpecial?: boolean;
  normalPoints?: number;
  stealPoints?: number;
}

export interface ScoreTransaction {
  id: string;
  questionId: number;
  teamId: TeamId;
  type: 'RACE_CORRECT' | 'RACE_WRONG' | 'STEAL_CORRECT' | 'STEAL_WRONG' | 'SPECIAL_CORRECT';
  points: number;
  timestamp: number;
  snapshotUrl?: string | null;
  reactionTimeMs?: number | null;
}

export interface RoundMoment {
  questionIndex: number;
  questionText: string;
  winner: TeamId | null;
  teamName: string;
  snapshotUrl: string;
  reactionTimeMs: number | null;
  timestamp: number;
}

export interface DetectionResult {
  hasPerson: boolean;
  status: 'NO_CARD' | 'SEARCHING' | 'TRACKING_BLUE' | 'TRACKING_ORANGE' | 'TRACKING_BOTH' | 'LOCKED';
  blueScore: number; // 0 - 100 confidence
  orangeScore: number; // 0 - 100 confidence
  blueStableFrames: number;
  orangeStableFrames: number;
  blueCardDetected: boolean;
  orangeCardDetected: boolean;
  timestamp: number;
  winnerCandidate?: TeamId | null;
  isTie?: boolean;
  blueBounds?: { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number } | null;
  orangeBounds?: { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number } | null;
  roiStats?: {
    totalPixels: number;
    bluePixels: number;
    orangePixels: number;
    blueRatio: number;
    orangeRatio: number;
  };
}

export interface GameStats {
  totalQuestions: number;
  blueWinsCamera: number;
  orangeWinsCamera: number;
  blueCorrect: number;
  orangeCorrect: number;
  blueStealCorrect: number;
  orangeStealCorrect: number;
  blueTotalAttempts: number;
  orangeTotalAttempts: number;
  fastestReactionTimeMs: number;
}

export interface GameSettings {
  normalPoints: number;
  stealPoints: number;
  specialPoints: number;
  totalQuestions: number;
  countdownSeconds: number;
  cameraHoldSeconds: number;
  tieThresholdMs: number;
  freezeDurationMs: number;
  minStableFrames: number;
  blueHueMin: number;
  blueHueMax: number;
  orangeHueMin: number;
  orangeHueMax: number;
  minColorCoveragePercent: number;
  questionTimeLimitSeconds: number;
  soundEnabled: boolean;
  soundVolume: number;
  highContrastMode: boolean;
}

export interface GameSession {
  gameId: string;
  blueTeamName: string;
  orangeTeamName: string;
  className: string;
  teacherName: string;
  schoolName: string;
  currentQuestionIndex: number;
  blueScore: number;
  orangeScore: number;
  currentRaceWinner: TeamId | null;
  winnerSnapshotUrl: string | null;
  raceStartTimestamp: number | null;
  winnerReactionTimeMs: number | null;
  moments?: RoundMoment[];
  history: ScoreTransaction[];
  questions: Question[];
  state: GameState;
  createdAt: number;
  updatedAt: number;
}

export interface CertificateConfig {
  schoolName: string;
  className: string;
  teacherName: string;
  title: string;
  customMessage: string;
  themeColor: 'gold' | 'cyan' | 'amber' | 'royal';
  showSeal: boolean;
  dateStr: string;
}
