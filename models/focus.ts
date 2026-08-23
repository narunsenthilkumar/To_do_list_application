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

export interface PomodoroSettings {
  focusDuration: number;     // Minutes, default 25
  shortBreakDuration: number; // Minutes, default 5
  longBreakDuration: number;  // Minutes, default 15
  longBreakInterval: number;  // Sessions count, default 4
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate?: string;
  history: Record<string, number>; // YYYY-MM-DD -> completed count
}

