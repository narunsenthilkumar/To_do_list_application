export type FocusModeType = 'work' | 'shortBreak' | 'longBreak';
export type FocusSessionStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface ActiveFocusSession {
  id: string;
  status: FocusSessionStatus;
  mode: FocusModeType;
  durationMs: number;
  startedAt: number | null; // Epoch timestamp ms
  pausedAt: number | null;  // Epoch timestamp ms
  accumulatedMs: number;
  endsAt: number | null;     // Epoch timestamp ms
  completedAt?: string | null;
  taskId?: string | null;
  updatedAt: number;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  durationMinutes: number;
  completedAt: string;
  mode: FocusModeType;
}

export interface FocusShieldSettings {
  enabled: boolean;
  strictMode: boolean;
  dndEnabled: boolean;
  emergencyUnlockAllowed: boolean;
  blockedPackages: string[];
}

export const DEFAULT_FOCUS_SHIELD_SETTINGS: FocusShieldSettings = {
  enabled: false,
  strictMode: false,
  dndEnabled: false,
  emergencyUnlockAllowed: true,
  blockedPackages: [
    'com.instagram.android',
    'com.google.android.youtube',
    'com.facebook.katana',
    'com.twitter.android',
    'com.zhiliaoapp.musically',
  ],
};

export interface PomodoroSettings {
  focusDuration: number;     // Minutes, default 25
  shortBreakDuration: number; // Minutes, default 5
  longBreakDuration: number;  // Minutes, default 15
  longBreakInterval: number;  // Sessions count, default 4
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  shieldSettings?: FocusShieldSettings;
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate?: string;
  history: Record<string, number>; // YYYY-MM-DD -> completed count
}
