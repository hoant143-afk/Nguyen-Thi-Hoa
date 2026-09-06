import { TeamPreset } from '../types';

export type { TeamPreset };

export interface Student {
  id: string;
  name: string;
  stars?: number;
  gender?: 'M' | 'F';
}

export interface Classroom {
  id: string;
  name: string;
  grade: string;
  teacherName: string;
  schoolName: string;
  defaultTeams?: {
    name: string;
    color: string;
    badge: string;
  }[];
  students?: Student[];
}

export const DEFAULT_TEAM_PRESETS: TeamPreset[] = [
  { code: 'TEAM1', defaultName: 'ĐỘI XANH', color: '#3b82f6', accentColor: '#60a5fa', badge: '🔵' },
  { code: 'TEAM2', defaultName: 'ĐỘI CAM', color: '#f97316', accentColor: '#fb923c', badge: '🟠' },
  { code: 'TEAM3', defaultName: 'ĐỘI XANH LÁ', color: '#22c55e', accentColor: '#4ade80', badge: '🟢' },
  { code: 'TEAM4', defaultName: 'ĐỘI TÍM', color: '#a855f7', accentColor: '#c084fc', badge: '🟣' },
];

export const TEAM_COLOR_OPTIONS = [
  { name: 'Xanh dương', color: '#3b82f6', badge: '🔵' },
  { name: 'Cam rực', color: '#f97316', badge: '🟠' },
  { name: 'Xanh lá', color: '#22c55e', badge: '🟢' },
  { name: 'Tím mộng mơ', color: '#a855f7', badge: '🟣' },
  { name: 'Đỏ chiến thắng', color: '#ef4444', badge: '🔴' },
  { name: 'Vàng rạng rỡ', color: '#eab308', badge: '🟡' },
  { name: 'Hồng phấn chấn', color: '#ec4899', badge: '🌸' },
  { name: 'Cyan công nghệ', color: '#06b6d4', badge: '💠' },
];

export const DEFAULT_CLASSES: Classroom[] = [
  {
    id: 'class_5a1',
    name: '5A1',
    grade: 'Lớp 5',
    teacherName: 'Thầy Hoàng',
    schoolName: 'Trường Tiểu học Chu Văn An',
  },
  {
    id: 'class_5a2',
    name: '5A2',
    grade: 'Lớp 5',
    teacherName: 'Cô Thu Hương',
    schoolName: 'Trường Tiểu học Chu Văn An',
  },
  {
    id: 'class_4a1',
    name: '4A1',
    grade: 'Lớp 4',
    teacherName: 'Thầy Minh',
    schoolName: 'Trường Tiểu học Chu Văn An',
  },
];

export interface MatchHistoryEntry {
  id: string;
  gameId: string;
  gameName: string;
  className: string;
  timestamp: number;
  winner: string; // Tên đội chiến thắng
  summary: string;
  teamCount?: number;
  teams?: {
    name: string;
    score: number;
    color: string;
    rank?: number;
  }[];
  details?: Record<string, unknown>;
}

