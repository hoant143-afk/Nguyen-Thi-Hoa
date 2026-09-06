import { Classroom, DEFAULT_CLASSES, MatchHistoryEntry } from '../data/classData';
import { Question } from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';

export const STORAGE_NAMESPACES = {
  CLASSES: 'eduplay_classes_v1',
  QUESTIONS: 'eduplay_questions_bank_v1',
  MATCH_HISTORY: 'eduplay_match_history_v1',
  QUIZ_BATTLE: 'eduplay_quizbattle_state_v1',
  LUCKY_WHEEL: 'eduplay_luckywheel_config_v1',
  FASTEST_HAND: 'eduplay_fastesthand_state_v1',
  RANDOM_PICKER: 'eduplay_randompicker_state_v1',
  TEAM_CHALLENGE: 'eduplay_teamchallenge_state_v1',
};

export class EduplayStorage {
  // Classes & Students
  public static getClasses(): Classroom[] {
    try {
      const data = localStorage.getItem(STORAGE_NAMESPACES.CLASSES);
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
      localStorage.setItem(STORAGE_NAMESPACES.CLASSES, JSON.stringify(classes));
    } catch (e) {
      console.error('Error saving classes to storage', e);
    }
  }

  // Question Bank
  public static getQuestions(): Question[] {
    try {
      const data = localStorage.getItem(STORAGE_NAMESPACES.QUESTIONS);
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
      localStorage.setItem(STORAGE_NAMESPACES.QUESTIONS, JSON.stringify(questions));
    } catch (e) {
      console.error('Error saving questions to storage', e);
    }
  }

  // Match History
  public static getHistory(): MatchHistoryEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_NAMESPACES.MATCH_HISTORY);
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
      localStorage.setItem(STORAGE_NAMESPACES.MATCH_HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error recording match history', e);
    }
  }

  // Game-specific generic helpers
  public static getGameData<T>(namespace: string, fallback: T): T {
    try {
      const data = localStorage.getItem(namespace);
      if (!data) return fallback;
      return JSON.parse(data) as T;
    } catch {
      return fallback;
    }
  }

  public static setGameData<T>(namespace: string, value: T): void {
    try {
      localStorage.setItem(namespace, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${namespace} data`, e);
    }
  }
}
