import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { FocusModeType, PomodoroSettings, StreakStats, ActiveFocusSession } from '../models/focus';
import { Repository, getTodayDateString } from '../services/storage/repository';
import { FocusTimerEngine } from '../services/focus/FocusTimerEngine';

interface FocusContextType {
  mode: FocusModeType;
  isActive: boolean;
  secondsRemaining: number;
  selectedTaskId: string | null;
  completedSessionsToday: number;
  settings: PomodoroSettings;
  streakStats: StreakStats;
  activeSession: ActiveFocusSession | null;
  
  setSelectedTaskId: (taskId: string | null) => void;
  startTimer: (taskTitle?: string) => void;
  pauseTimer: (taskTitle?: string) => void;
  resetTimer: () => void;
  skipSession: () => void;
  updateSettings: (newSettings: Partial<PomodoroSettings>) => Promise<void>;
  recordCompletedTaskStreak: () => Promise<void>;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const engine = FocusTimerEngine.getInstance();

  const [settings, setSettings] = useState<PomodoroSettings>(engine.getSettings());
  const [mode, setMode] = useState<FocusModeType>(engine.getMode());
  const [isActive, setIsActive] = useState<boolean>(engine.getIsActive());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(engine.getRemainingSeconds());
  const [selectedTaskId, setSelectedTaskIdState] = useState<string | null>(engine.getSelectedTaskId());
  const [completedSessionsToday, setCompletedSessionsToday] = useState<number>(engine.getCompletedSessionsToday());
  const [activeSession, setActiveSession] = useState<ActiveFocusSession | null>(engine.getSession());
  const [streakStats, setStreakStats] = useState<StreakStats>({
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: '',
    history: {},
  });

  // Load saved streak on mount & init engine
  useEffect(() => {
    async function loadInitial() {
      const stats = await Repository.loadStreakStats();
      setStreakStats(stats);
      await engine.init();

      // Sync state from engine after init
      setSettings(engine.getSettings());
      setMode(engine.getMode());
      setIsActive(engine.getIsActive());
      setSecondsRemaining(engine.getRemainingSeconds());
      setSelectedTaskIdState(engine.getSelectedTaskId());
      setCompletedSessionsToday(engine.getCompletedSessionsToday());
      setActiveSession(engine.getSession());
    }
    loadInitial();

    // Subscribe to engine state updates
    const unsubscribe = engine.subscribe((event) => {
      setMode(event.mode);
      setIsActive(event.isActive);
      setSecondsRemaining(event.secondsRemaining);
      setSelectedTaskIdState(event.selectedTaskId);
      setCompletedSessionsToday(event.completedSessionsToday);
      setActiveSession(event.session);
      setSettings(engine.getSettings());

      if (event.type === 'completed') {
        Repository.loadStreakStats().then(setStreakStats);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const setSelectedTaskId = useCallback((taskId: string | null) => {
    setSelectedTaskIdState(taskId);
    engine.setSelectedTaskId(taskId);
  }, []);

  const startTimer = useCallback((taskTitle?: string) => {
    engine.startTimer(taskTitle);
  }, []);

  const pauseTimer = useCallback((taskTitle?: string) => {
    engine.pauseTimer(taskTitle);
  }, []);

  const resetTimer = useCallback(() => {
    engine.resetTimer();
  }, []);

  const skipSession = useCallback(() => {
    engine.skipSession();
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<PomodoroSettings>) => {
    await engine.updateSettings(newSettings);
    setSettings(engine.getSettings());
    setSecondsRemaining(engine.getRemainingSeconds());
  }, []);

  const recordCompletedTaskStreak = useCallback(async () => {
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
  }, [streakStats]);

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
        activeSession,
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

