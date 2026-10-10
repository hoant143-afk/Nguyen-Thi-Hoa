import { Question } from '../../types';

export type FruitSlashState =
  | 'SETUP'
  | 'CAMERA_READY'
  | 'COUNTDOWN'
  | 'FRUIT_ROUND'
  | 'TEAM_WON_SLASH'
  | 'QUESTION'
  | 'ANSWER'
  | 'STEAL'
  | 'SHOW_RESULT'
  | 'NEXT_ROUND'
  | 'GAME_OVER';

export type FruitDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface FruitSlashSettings {
  team1Name: string;
  team2Name: string;
  totalQuestions: number; // 5, 10, 15, 20
  answerTimeLimit: number; // 10, 15, 20, 30
  difficulty: FruitDifficulty;
  enableBoom: boolean;
  enableSpecialItems: boolean;
  stealTimeLimit: number; // 10s default
  soundEnabled: boolean;
}

export type FruitKind =
  | 'apple'
  | 'orange'
  | 'banana'
  | 'watermelon'
  | 'strawberry'
  | 'grape'
  | 'pineapple'
  | 'kiwi';

export type SpecialItemKind = 'golden_fruit' | 'clock' | 'shield' | 'freeze';

export type SpawnableKind = FruitKind | 'boom' | SpecialItemKind;

export interface FlyingFruit {
  id: string;
  kind: SpawnableKind;
  isBoom: boolean;
  isSpecial: boolean;
  specialType?: SpecialItemKind;
  x: number; // 0 to 100 (% of arena)
  y: number; // 0 to 100 (% of arena)
  vx: number; // velocity X (% per sec)
  vy: number; // velocity Y (% per sec)
  gravity: number; // gravity acceleration
  radius: number; // size in %
  rotation: number;
  rotationSpeed: number;
  sliced: boolean;
  sliceAngle?: number;
  slicedBy?: 'team1' | 'team2';
  sliceTimestamp?: number;
  sliceHalf1Offset?: { x: number; y: number; r: number };
  sliceHalf2Offset?: { x: number; y: number; r: number };
  sliceProgress?: number;
}

export interface HandPoint {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  time: number; // performance.now()
}

export interface HandTrackResult {
  detected: boolean;
  x: number; // 0 to 100 (% arena)
  y: number; // 0 to 100 (% arena)
  vx: number; // px/sec or %/sec
  vy: number;
  speed: number;
  isSlashing: boolean;
  slashAngle: number;
  trail: HandPoint[];
  lastSlashTimestamp: number;
  rawPoint?: { x: number; y: number };
}

export interface SlashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'juice' | 'spark' | 'smoke' | 'golden' | 'ice';
}

export interface TeamMatchStats {
  score: number;
  correctAnswers: number;
  fruitsSliced: number;
  boomsHit: number;
  hasShield: boolean;
  freezeUntilTimestamp: number;
  doublePointsActive: boolean;
}

export interface FruitSlashSession {
  settings: FruitSlashSettings;
  questions: Question[];
  currentQuestionIndex: number;
  team1Stats: TeamMatchStats;
  team2Stats: TeamMatchStats;
  currentWinnerTeam: 'team1' | 'team2' | null;
  currentWinnerReactionMs: number | null;
  winnerHandPoint?: { x: number; y: number };
}
