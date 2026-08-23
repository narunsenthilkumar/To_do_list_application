import { ActiveFocusSession } from '../../models/focus';
import { StorageAdapter } from '../storage/storageAdapter';

export const FOCUS_STORAGE_KEYS = {
  ACTIVE_SESSION: '@taskora_active_focus_session',
  FOCUS_HISTORY: '@taskora_focus_sessions',
  POMODORO_SETTINGS: '@taskora_pomodoro_settings',
  STREAK_STATS: '@taskora_streak_stats',
};

export class FocusTimerPersistence {
  /**
   * Persists the active session state atomically to local storage
   */
  static async saveActiveSession(session: ActiveFocusSession | null): Promise<boolean> {
    try {
      if (!session) {
        return await StorageAdapter.removeItem(FOCUS_STORAGE_KEYS.ACTIVE_SESSION);
      }
      return await StorageAdapter.setItem(FOCUS_STORAGE_KEYS.ACTIVE_SESSION, session);
    } catch (e) {
      console.error('[FocusTimerPersistence] Error saving active session:', e);
      return false;
    }
  }

  /**
   * Loads the persisted active session state
   */
  static async loadActiveSession(): Promise<ActiveFocusSession | null> {
    try {
      return await StorageAdapter.getItem<ActiveFocusSession>(FOCUS_STORAGE_KEYS.ACTIVE_SESSION);
    } catch (e) {
      console.error('[FocusTimerPersistence] Error loading active session:', e);
      return null;
    }
  }

  /**
   * Clears the active session state
   */
  static async clearActiveSession(): Promise<boolean> {
    try {
      return await StorageAdapter.removeItem(FOCUS_STORAGE_KEYS.ACTIVE_SESSION);
    } catch (e) {
      console.error('[FocusTimerPersistence] Error clearing active session:', e);
      return false;
    }
  }
}
