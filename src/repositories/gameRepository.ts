import { GameSession, Question, GameSettings } from '../types';
import { DEFAULT_QUESTIONS, DEFAULT_SETTINGS } from '../data/defaultQuestions';

const STORAGE_KEYS = {
  SESSION: 'camrace_active_session_v3',
  QUESTIONS: 'camrace_custom_questions_v3',
  SETTINGS: 'camrace_settings_v3',
};

export class GameRepository {
  public static saveSession(session: GameSession): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save session to localStorage', e);
    }
  }

  public static loadSession(): GameSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!data) return null;
      return JSON.parse(data) as GameSession;
    } catch (e) {
      console.error('Failed to load session from localStorage', e);
      return null;
    }
  }

  public static clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  }

  public static saveQuestions(questions: Question[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
    } catch (e) {
      console.error('Failed to save questions', e);
    }
  }

  public static loadQuestions(): Question[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (!data) return DEFAULT_QUESTIONS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUESTIONS;
    } catch (e) {
      console.error('Failed to load questions, using defaults', e);
      return DEFAULT_QUESTIONS;
    }
  }

  public static saveSettings(settings: GameSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  public static loadSettings(): GameSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }
}
