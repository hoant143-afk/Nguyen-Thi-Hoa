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

export type TeamId = string; // 'blue' | 'orange' | 'team_1' | 'team_2' | 'team_3' | 'team_4'
export type TeamCount = 2 | 3 | 4;

export interface Team {
  id: string; // e.g. 'team_1', 'blue', 'orange'
  sessionId?: string;
  teamCode: 'TEAM1' | 'TEAM2' | 'TEAM3' | 'TEAM4' | 'BLUE' | 'ORANGE' | string;
  teamName: string;
  teamColor: string; // Hex code
  accentColor?: string;
  badge?: string; // Emoji e.g. 🔵, 🟠, 🟢, 🟣
  score: number;
  rank?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  bonusPoints?: number;
  stealWins?: number;
  specialCorrect?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface TeamPreset {
  code: 'TEAM1' | 'TEAM2' | 'TEAM3' | 'TEAM4';
  defaultName: string;
  color: string;
  accentColor: string;
  badge: string;
}

export interface TeamSetupConfig {
  teamCount: TeamCount;
  teams: {
    id: string;
    teamCode: string;
    teamName: string;
    teamColor: string;
    badge?: string;
  }[];
}

export interface Question {
  id: number;
  bankId?: string;
  subject?: string;
  grade?: string;
  topic?: string;
  questionType?: string;
  question: string;
  options: string[]; // 4 choices [A, B, C, D]
  correctAnswer: number; // 0, 1, 2, 3
  explanation: string;
  category: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  normalPoints?: number;
  bonusPoints?: number;
  specialPoints?: number;
  stealPoints?: number;
  isSpecial?: boolean;
  enabled?: boolean;
}

export interface ScoreTransaction {
  id: string;
  questionId?: number;
  teamId: string;
  teamCode?: string;
  type: 'RACE_CORRECT' | 'RACE_WRONG' | 'STEAL_CORRECT' | 'STEAL_WRONG' | 'SPECIAL_CORRECT' | 'BONUS_POINTS' | 'PENALTY_POINTS';
  points: number;
  timestamp: number;
  snapshotUrl?: string | null;
  reactionTimeMs?: number | null;
  note?: string;
}

export interface RoundMoment {
  questionIndex: number;
  questionText: string;
  winner: string | null;
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
  winnerCandidate?: 'blue' | 'orange' | null;
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
  currentRaceWinner: 'blue' | 'orange' | string | null;
  winnerSnapshotUrl: string | null;
  raceStartTimestamp: number | null;
  winnerReactionTimeMs: number | null;
  moments?: RoundMoment[];
  history: ScoreTransaction[];
  questions: Question[];
  state: GameState;
  createdAt: number;
  updatedAt: number;
  // Dynamic multi-team support
  teamCount?: TeamCount;
  teams?: Team[];
}

export interface UniversalGameSession {
  sessionId: string;
  gameSlug: string;
  activityName: string;
  className: string;
  teacherName: string;
  subject?: string;
  grade?: string;
  teamCount: TeamCount;
  status: 'PENDING' | 'PLAYING' | 'PAUSED' | 'FINISHED';
  currentRound: number;
  currentQuestion: number;
  totalQuestions: number;
  startedAt: number;
  finishedAt?: number;
  winnerTeamId?: string | null;
  teams: Team[];
}

export interface GameResult {
  sessionId: string;
  teamId: string;
  teamCode: string;
  teamName: string;
  teamColor: string;
  finalScore: number;
  rank: number; // 1 = Hạng 1, 2 = Hạng 2, etc.
  correctAnswers?: number;
  wrongAnswers?: number;
  bonusPoints?: number;
  winner: boolean;
  statsJson?: string;
}

export interface CertificateConfig {
  schoolName: string;
  className: string;
  teacherName: string;
  title: string; // e.g. "🏆 EDUPLAY CHAMPION"
  recipientTeamName: string; // Tên Đội được trao thưởng
  awardTitle?: string; // e.g. "QUÁN QUÂN", "Á QUÂN", "HẠNG BA"
  customMessage: string;
  themeColor: 'gold' | 'cyan' | 'amber' | 'royal' | 'emerald' | 'purple';
  showSeal: boolean;
  dateStr: string;
  score?: number;
}

