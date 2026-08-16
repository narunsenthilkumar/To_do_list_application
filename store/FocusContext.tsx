import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { FocusSession, FocusModeType, PomodoroSettings, StreakStats } from '../models/focus';
import { Repository, getTodayDateString } from '../services/storage/repository';
import { NotificationService } from '../services/notifications/notificationService';
import { haptics } from '../services/haptics';

interface FocusContextType {
  mode: FocusModeType;
  isActive: boolean;
  secondsRemaining: number;
  selectedTaskId: string | null;
  completedSessionsToday: number;
  settings: PomodoroSettings;
  streakStats: StreakStats;
  
  setSelectedTaskId: (taskId: string | null) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipSession: () => void;
  updateSettings: (newSettings: Partial<PomodoroSettings>) => Promise<void>;
  recordCompletedTaskStreak: () => Promise<void>;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PomodoroSettings>({
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
  });

  const [mode, setMode] = useState<FocusModeType>('work');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completedSessionsToday, setCompletedSessionsToday] = useState<number>(0);
  const [streakStats, setStreakStats] = useState<StreakStats>({
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: '',
    history: {},
  });

  const intervalRef = useRef<any>(null);

  // Load saved settings & streak on mount
  useEffect(() => {
    async function loadInitial() {
      const [savedSettings, savedStats, savedSessions] = await Promise.all([
        Repository.loadPomodoroSettings(),
        Repository.loadStreakStats(),
        Repository.loadFocusSessions(),
      ]);
      setSettings(savedSettings);
      setStreakStats(savedStats);
      setSecondsRemaining(savedSettings.focusDuration * 60);

      const todayStr = getTodayDateString();
      const todaySessions = savedSessions.filter((s) => s.completedAt.startsWith(todayStr));
      setCompletedSessionsToday(todaySessions.length);
    }
    loadInitial();
  }, []);

  // Timer Tick interval
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleTimerCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, mode, settings]);

  const handleTimerCompletion = async () => {
    setIsActive(false);
    haptics.success();

    if (mode === 'work') {
      const newSessionCount = completedSessionsToday + 1;
      setCompletedSessionsToday(newSessionCount);

      // Trigger cross-platform completion notification
      await NotificationService.sendFocusCompletionNotification(
        'Focus Session Completed! 🎉',
        `You finished your ${settings.focusDuration} min focus session. Take a break!`
      );

      // Save session log
      const newSession: FocusSession = {
        id: `sess-${Date.now()}`,
        taskId: selectedTaskId || undefined,
        durationMinutes: settings.focusDuration,
        completedAt: new Date().toISOString(),
        mode: 'work',
      };
      const existingSessions = await Repository.loadFocusSessions();
      await Repository.saveFocusSessions([newSession, ...existingSessions]);

      // Determine next mode (short vs long break)
      if (newSessionCount % settings.longBreakInterval === 0) {
        setMode('longBreak');
        setSecondsRemaining(settings.longBreakDuration * 60);
      } else {
        setMode('shortBreak');
        setSecondsRemaining(settings.shortBreakDuration * 60);
      }
    } else {
      // Break finished, return to work
      await NotificationService.sendFocusCompletionNotification(
        'Break Ended ⚡',
        'Ready to start your next focus session?'
      );
      setMode('work');
      setSecondsRemaining(settings.focusDuration * 60);
    }
  };

  const startTimer = () => {
    haptics.medium();
    setIsActive(true);
  };

  const pauseTimer = () => {
    haptics.light();
    setIsActive(false);
  };

  const resetTimer = () => {
    haptics.light();
    setIsActive(false);
    if (mode === 'work') {
      setSecondsRemaining(settings.focusDuration * 60);
    } else if (mode === 'shortBreak') {
      setSecondsRemaining(settings.shortBreakDuration * 60);
    } else {
      setSecondsRemaining(settings.longBreakDuration * 60);
    }
  };

  const skipSession = () => {
    haptics.medium();
    setIsActive(false);
    if (mode === 'work') {
      setMode('shortBreak');
      setSecondsRemaining(settings.shortBreakDuration * 60);
    } else {
      setMode('work');
      setSecondsRemaining(settings.focusDuration * 60);
    }
  };

  const updateSettings = async (newSettings: Partial<PomodoroSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await Repository.savePomodoroSettings(updated);
    if (!isActive) {
      if (mode === 'work') setSecondsRemaining(updated.focusDuration * 60);
      else if (mode === 'shortBreak') setSecondsRemaining(updated.shortBreakDuration * 60);
      else setSecondsRemaining(updated.longBreakDuration * 60);
    }
  };

  const recordCompletedTaskStreak = async () => {
    const todayStr = getTodayDateString();
    const updatedHistory = { ...streakStats.history, [todayStr]: (streakStats.history[todayStr] || 0) + 1 };
    
    let newStreak = streakStats.currentStreak;
    if (streakStats.lastCompletedDate !== todayStr) {
      newStreak = streakStats.currentStreak + 1;
    }

    const updatedStats: StreakStats = {
      currentStreak: newStreak,
      bestStreak: Math.max(newStreak, streakStats.bestStreak),
      lastCompletedDate: todayStr,
      history: updatedHistory,
    };

    setStreakStats(updatedStats);
    await Repository.saveStreakStats(updatedStats);
  };

  return (
    <FocusContext.Provider
      value={{
        mode,
        isActive,
        secondsRemaining,
        selectedTaskId,
        completedSessionsToday,
        settings,
        streakStats,
        setSelectedTaskId,
        startTimer,
        pauseTimer,
        resetTimer,
        skipSession,
        updateSettings,
        recordCompletedTaskStreak,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
};

export const useFocusStore = (): FocusContextType => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocusStore must be used within a FocusProvider');
  }
  return context;
};
