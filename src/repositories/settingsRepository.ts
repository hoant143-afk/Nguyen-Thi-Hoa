import { apiClient } from '../services/apiClient';
import { GameSettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/defaultQuestions';

export class SettingsRepository {
  public static async getSettings(): Promise<GameSettings> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<Record<string, any>>('settings.get');
        if (res.success && res.data) {
          return {
            ...DEFAULT_SETTINGS,
            normalPoints: Number(res.data.defaultCorrectPoints) || DEFAULT_SETTINGS.normalPoints,
            stealPoints: Number(res.data.defaultStealPoints) || DEFAULT_SETTINGS.stealPoints,
            specialPoints: Number(res.data.defaultSpecialPoints) || DEFAULT_SETTINGS.specialPoints,
            totalQuestions: Number(res.data.defaultQuestionCount) || DEFAULT_SETTINGS.totalQuestions,
            countdownSeconds: Number(res.data.defaultCountdownSeconds) || DEFAULT_SETTINGS.countdownSeconds,
            tieThresholdMs: Number(res.data.camRaceTieThresholdMs) || DEFAULT_SETTINGS.tieThresholdMs,
            freezeDurationMs: Number(res.data.camRaceFreezeMs) || DEFAULT_SETTINGS.freezeDurationMs,
            soundEnabled: res.data.enableSound !== undefined ? Boolean(res.data.enableSound) : DEFAULT_SETTINGS.soundEnabled,
          };
        }
      } catch (err) {
        console.warn('Failed to load settings from cloud, falling back to local', err);
      }
    }

    // Local fallback
    try {
      const local = localStorage.getItem('camrace_settings_v3');
      if (local) return { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
    } catch {}
    return DEFAULT_SETTINGS;
  }
}
