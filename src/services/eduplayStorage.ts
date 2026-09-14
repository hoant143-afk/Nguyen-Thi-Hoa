import { Classroom, DEFAULT_CLASSES, MatchHistoryEntry } from '../data/classData';
import { Question } from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';

/**
 * 🎓 EDUPLAY - MULTI-USER LOCAL STORAGE MANAGER
 * Implements strict UID namespacing for teacher data:
 * eduplay_${uid}_* for private teacher resources
 * eduplay_system_* for public/default system resources
 */

export const SYSTEM_STORAGE_NAMESPACES = {
  SYSTEM_QUESTIONS: 'eduplay_system_questions',
  GAME_CATALOG: 'eduplay_game_catalog',
  SYSTEM_SETTINGS: 'eduplay_system_settings_v1',
};

export const STORAGE_NAMESPACES = {
  CLASSES: 'classes',
  QUESTIONS: 'questions',
  SESSION_HISTORY: 'history',
  SYSTEM_SETTINGS: 'system_settings_v1',
  SETTINGS: 'system_settings_v1',
  LUCKY_WHEEL: 'lucky_wheel_state',
  TEAM_CHALLENGE: 'team_challenge_state',
  QUIZ_BATTLE: 'quiz_battle_state',
  CAM_RACE: 'cam_race_state',
  SMILE_RACE: 'smile_race_state',
  FASTEST_HAND: 'fastest_hand_state',
  RANDOM_TEAM: 'random_team_state',
};

let currentTeacherUid: string = '';

export class EduplayStorage {
  public static setTeacherUid(uid: string | null | undefined): void {
    currentTeacherUid = uid ? uid.trim() : '';
  }

  public static getTeacherUid(): string {
    return currentTeacherUid;
  }

  public static getUserKey(resource: string): string {
    if (currentTeacherUid) {
      return `eduplay_${currentTeacherUid}_${resource}`;
    }
    return `eduplay_guest_${resource}`;
  }

  // Classes & Students (Teacher Scoped)
  public static getClasses(): Classroom[] {
    try {
      const key = this.getUserKey('classes');
      const data = localStorage.getItem(key);
      if (!data) {
        this.saveClasses(DEFAULT_CLASSES);
        return DEFAULT_CLASSES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_CLASSES;
    }
  }

  public static saveClasses(classes: Classroom[]): void {
    try {
      const key = this.getUserKey('classes');
      localStorage.setItem(key, JSON.stringify(classes));
    } catch (e) {
      console.error('Error saving classes to storage', e);
    }
  }

  // Question Bank (Teacher Scoped)
  public static getQuestions(): Question[] {
    try {
      const key = this.getUserKey('questions');
      const data = localStorage.getItem(key);
      if (!data) {
        this.saveQuestions(DEFAULT_QUESTIONS);
        return DEFAULT_QUESTIONS;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUESTIONS;
    } catch {
      return DEFAULT_QUESTIONS;
    }
  }

  public static saveQuestions(questions: Question[]): void {
    try {
      const key = this.getUserKey('questions');
      localStorage.setItem(key, JSON.stringify(questions));
    } catch (e) {
      console.error('Error saving questions to storage', e);
    }
  }

  // Match History (Teacher Scoped)
  public static getHistory(): MatchHistoryEntry[] {
    try {
      const key = this.getUserKey('match_history');
      const data = localStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static addHistoryEntry(entry: Omit<MatchHistoryEntry, 'id'>): void {
    try {
      const current = this.getHistory();
      const newEntry: MatchHistoryEntry = {
        ...entry,
        id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
      const updated = [newEntry, ...current].slice(0, 50); // keep last 50
      const key = this.getUserKey('match_history');
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Error recording match history', e);
    }
  }

  // Game-specific generic helpers (scoped to teacher)
  public static getGameData<T>(namespace: string, fallback: T): T {
    try {
      const key = this.getUserKey(namespace);
      const data = localStorage.getItem(key);
      if (!data) return fallback;
      return JSON.parse(data) as T;
    } catch {
      return fallback;
    }
  }

  public static setGameData<T>(namespace: string, value: T): void {
    try {
      const key = this.getUserKey(namespace);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${namespace} data`, e);
    }
  }

  public static saveGameData<T>(namespace: string, value: T): void {
    this.setGameData(namespace, value);
  }

  // System Settings Helper (Public/System shared)
  public static getSettings(): Record<string, any> {
    try {
      const data = localStorage.getItem(SYSTEM_STORAGE_NAMESPACES.SYSTEM_SETTINGS);
      if (!data) {
        return {
          schoolName: 'TRƯỜNG TIỂU HỌC CHU VĂN AN',
          className: '5A1',
          teacherName: 'Thầy Hoàng',
          defaultTeamCount: 4,
        };
      }
      return JSON.parse(data);
    } catch {
      return {
        schoolName: 'TRƯỜNG TIỂU HỌC CHU VĂN AN',
        className: '5A1',
        teacherName: 'Thầy Hoàng',
        defaultTeamCount: 4,
      };
    }
  }

  public static saveSettings(settings: Record<string, any>): void {
    try {
      localStorage.setItem(SYSTEM_STORAGE_NAMESPACES.SYSTEM_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving system settings', e);
    }
  }

  /**
   * Clear transient memory cache on logout / account switch
   */
  public static clearUserTransientState(): void {
    currentTeacherUid = '';
  }
}
