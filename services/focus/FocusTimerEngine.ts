import { ActiveFocusSession, FocusModeType, FocusSession, PomodoroSettings } from '../../models/focus';
import { FocusTimerPersistence } from './FocusTimerPersistence';
import { FocusTimerNotification } from './FocusTimerNotification';
import { FocusTimerLifecycle } from './FocusTimerLifecycle';
import { FocusTimerRecovery } from './FocusTimerRecovery';
import { FocusShieldService } from './FocusShieldService';
import { Repository, getTodayDateString } from '../storage/repository';
import { haptics } from '../haptics';

export type FocusTimerEngineEvent = {
  type: 'tick' | 'state_change' | 'completed' | 'mode_change';
  session: ActiveFocusSession | null;
  mode: FocusModeType;
  secondsRemaining: number;
  isActive: boolean;
  selectedTaskId: string | null;
  completedSessionsToday: number;
};

export type FocusTimerEngineListener = (event: FocusTimerEngineEvent) => void;

export class FocusTimerEngine {
  private static instance: FocusTimerEngine | null = null;

  private session: ActiveFocusSession | null = null;
  private settings: PomodoroSettings = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
  };
  private mode: FocusModeType = 'work';
  private selectedTaskId: string | null = null;
  private completedSessionsToday: number = 0;
  private listeners: Set<FocusTimerEngineListener> = new Set();
  private tickInterval: any = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): FocusTimerEngine {
    if (!this.instance) {
      this.instance = new FocusTimerEngine();
    }
    return this.instance;
  }

  /**
   * Initializes engine, loads settings, reconciles any backgrounded session
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Load settings & today's completed session count
    const [savedSettings, savedSessions] = await Promise.all([
      Repository.loadPomodoroSettings(),
      Repository.loadFocusSessions(),
    ]);
    this.settings = savedSettings;

    const todayStr = getTodayDateString();
    const todaySessions = savedSessions.filter((s) => s.completedAt.startsWith(todayStr));
    this.completedSessionsToday = todaySessions.length;

    // 2. Reconcile persisted active session
    await this.reconcile();

    // 3. Register lifecycle hook for background/foreground transitions
    FocusTimerLifecycle.subscribe(async (state) => {
      if (state === 'foreground') {
        await this.reconcile();
      } else if (state === 'background') {
        if (this.session && this.session.status === 'running') {
          await FocusTimerPersistence.saveActiveSession(this.session);
          await FocusTimerNotification.scheduleCompletionNotification(this.session);
        }
      }
    });
  }

  /**
   * Reconciles current session state with real world clock (Date.now())
   */
  async reconcile(): Promise<void> {
    const result = await FocusTimerRecovery.reconcile(this.settings);

    if (result.status === 'completed_while_away') {
      this.completedSessionsToday += result.completedSessionsTodayDelta;
      this.session = null;
      this.stopTickInterval();

      // Determine next mode
      if (result.session?.mode === 'work') {
        if (this.completedSessionsToday % this.settings.longBreakInterval === 0) {
          this.mode = 'longBreak';
        } else {
          this.mode = 'shortBreak';
        }
      } else {
        this.mode = 'work';
      }

      this.emitEvent('completed');
      return;
    }

    if (result.status === 'still_running' && result.session) {
      this.session = result.session;
      this.mode = result.session.mode;
      this.selectedTaskId = result.session.taskId || null;
      this.startTickInterval();
      this.emitEvent('state_change');
      return;
    }

    if (result.status === 'paused' && result.session) {
      this.session = result.session;
      this.mode = result.session.mode;
      this.selectedTaskId = result.session.taskId || null;
      this.stopTickInterval();
      this.emitEvent('state_change');
      return;
    }

    // Idle
    this.session = null;
    this.stopTickInterval();
    this.emitEvent('state_change');
  }

  /**
   * Starts or resumes a focus timer session
   */
  async startTimer(taskTitle?: string): Promise<void> {
    const now = Date.now();
    const durationMs = this.getModeDurationMs(this.mode);

    if (this.session && this.session.status === 'paused') {
      // Resuming paused session
      const remainingMs = Math.max(0, this.session.durationMs - this.session.accumulatedMs);
      this.session = {
        ...this.session,
        status: 'running',
        startedAt: now,
        pausedAt: null,
        endsAt: now + remainingMs,
        updatedAt: now,
      };
    } else {
      // Starting fresh session
      this.session = {
        id: `sess-${now}-${Math.random().toString(36).substr(2, 6)}`,
        status: 'running',
        mode: this.mode,
        durationMs,
        startedAt: now,
        pausedAt: null,
        accumulatedMs: 0,
        endsAt: now + durationMs,
        taskId: this.selectedTaskId,
        updatedAt: now,
      };
    }

    await FocusTimerPersistence.saveActiveSession(this.session);
    await FocusTimerNotification.scheduleCompletionNotification(this.session, taskTitle);
    await FocusTimerNotification.updateOngoingNotification(
      this.session,
      Math.ceil(this.getRemainingMs() / 1000),
      taskTitle
    );

    // Activate Focus Shield if enabled
    if (this.mode === 'work' && this.settings.shieldSettings?.enabled && this.session.endsAt) {
      await FocusShieldService.syncShieldConfig(this.settings.shieldSettings);
      await FocusShieldService.activateShield(this.session.endsAt);
    }

    this.startTickInterval();
    this.emitEvent('state_change');
    haptics.medium();
  }

  /**
   * Pauses the currently running timer
   */
  async pauseTimer(taskTitle?: string): Promise<void> {
    if (!this.session || this.session.status !== 'running') return;

    const now = Date.now();
    const elapsedSinceStart = this.session.startedAt ? now - this.session.startedAt : 0;
    const newAccumulatedMs = this.session.accumulatedMs + elapsedSinceStart;

    this.session = {
      ...this.session,
      status: 'paused',
      pausedAt: now,
      accumulatedMs: newAccumulatedMs,
      endsAt: null,
      updatedAt: now,
    };

    this.stopTickInterval();
    await FocusTimerPersistence.saveActiveSession(this.session);
    await FocusTimerNotification.cancelScheduledCompletion();
    await FocusTimerNotification.updateOngoingNotification(
      this.session,
      Math.ceil(this.getRemainingMs() / 1000),
      taskTitle
    );

    await FocusShieldService.deactivateShield();

    this.emitEvent('state_change');
    haptics.light();
  }

  /**
   * Resets the timer back to idle state
   */
  async resetTimer(): Promise<void> {
    this.session = null;
    this.stopTickInterval();
    await FocusTimerPersistence.clearActiveSession();
    await FocusTimerNotification.clearAll();
    await FocusShieldService.deactivateShield();

    this.emitEvent('state_change');
    haptics.light();
  }

  /**
   * Skips to the next session mode
   */
  async skipSession(): Promise<void> {
    this.session = null;
    this.stopTickInterval();
    await FocusTimerPersistence.clearActiveSession();
    await FocusTimerNotification.clearAll();
    await FocusShieldService.deactivateShield();

    if (this.mode === 'work') {
      this.mode = 'shortBreak';
    } else {
      this.mode = 'work';
    }

    this.emitEvent('mode_change');
    haptics.medium();
  }

  /**
   * Completes the current session
   */
  async handleSessionCompletion(taskTitle?: string): Promise<void> {
    const now = Date.now();
    this.stopTickInterval();

    if (this.mode === 'work') {
      const newSessionCount = this.completedSessionsToday + 1;
      this.completedSessionsToday = newSessionCount;

      // Save session log
      const newSession: FocusSession = {
        id: this.session?.id || `sess-${now}`,
        taskId: this.selectedTaskId || undefined,
        durationMinutes: this.settings.focusDuration,
        completedAt: new Date().toISOString(),
        mode: 'work',
      };
      const existing = await Repository.loadFocusSessions();
      await Repository.saveFocusSessions([newSession, ...existing]);

      // Update streak
      const todayStr = getTodayDateString();
      const stats = await Repository.loadStreakStats();
      const updatedHistory = { ...stats.history, [todayStr]: (stats.history[todayStr] || 0) + 1 };
      let newStreak = stats.currentStreak;
      if (stats.lastCompletedDate !== todayStr) {
        newStreak = stats.currentStreak + 1;
      }
      await Repository.saveStreakStats({
        currentStreak: newStreak,
        bestStreak: Math.max(newStreak, stats.bestStreak),
        lastCompletedDate: todayStr,
        history: updatedHistory,
      });

      // Clear session
      this.session = null;
      await FocusTimerPersistence.clearActiveSession();
      await FocusTimerNotification.clearAll();
      await FocusShieldService.deactivateShield();

      // Next mode
      if (newSessionCount % this.settings.longBreakInterval === 0) {
        this.mode = 'longBreak';
      } else {
        this.mode = 'shortBreak';
      }
    } else {
      // Break ended
      this.session = null;
      await FocusTimerPersistence.clearActiveSession();
      await FocusTimerNotification.clearAll();
      this.mode = 'work';
    }

    this.emitEvent('completed');
    haptics.success();
  }

  /**
   * Sets the selected task ID for the session
   */
  setSelectedTaskId(taskId: string | null): void {
    this.selectedTaskId = taskId;
    if (this.session) {
      this.session.taskId = taskId;
      FocusTimerPersistence.saveActiveSession(this.session);
    }
    this.emitEvent('state_change');
  }

  /**
   * Updates pomodoro settings and re-evaluates timer
   */
  async updateSettings(newSettings: Partial<PomodoroSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await Repository.savePomodoroSettings(this.settings);
    this.emitEvent('state_change');
  }

  // --- Calculations ---

  getModeDurationMs(mode: FocusModeType): number {
    switch (mode) {
      case 'work':
        return this.settings.focusDuration * 60 * 1000;
      case 'shortBreak':
        return this.settings.shortBreakDuration * 60 * 1000;
      case 'longBreak':
        return this.settings.longBreakDuration * 60 * 1000;
    }
  }

  getRemainingMs(): number {
    if (!this.session) {
      return this.getModeDurationMs(this.mode);
    }

    if (this.session.status === 'running') {
      if (!this.session.endsAt) return this.session.durationMs;
      return Math.max(0, this.session.endsAt - Date.now());
    }

    if (this.session.status === 'paused') {
      return Math.max(0, this.session.durationMs - this.session.accumulatedMs);
    }

    return this.getModeDurationMs(this.mode);
  }

  getRemainingSeconds(): number {
    return Math.ceil(this.getRemainingMs() / 1000);
  }

  // --- Getters ---

  getSession(): ActiveFocusSession | null {
    return this.session;
  }

  getMode(): FocusModeType {
    return this.mode;
  }

  getIsActive(): boolean {
    return this.session?.status === 'running';
  }

  getSelectedTaskId(): string | null {
    return this.selectedTaskId;
  }

  getCompletedSessionsToday(): number {
    return this.completedSessionsToday;
  }

  getSettings(): PomodoroSettings {
    return this.settings;
  }

  // --- Subscriptions & Ticks ---

  subscribe(listener: FocusTimerEngineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitEvent(type: 'tick' | 'state_change' | 'completed' | 'mode_change'): void {
    const event: FocusTimerEngineEvent = {
      type,
      session: this.session,
      mode: this.mode,
      secondsRemaining: this.getRemainingSeconds(),
      isActive: this.getIsActive(),
      selectedTaskId: this.selectedTaskId,
      completedSessionsToday: this.completedSessionsToday,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.warn('[FocusTimerEngine] Error in event listener:', e);
      }
    });
  }

  private startTickInterval(): void {
    this.stopTickInterval();
    this.tickInterval = setInterval(() => {
      const remainingSecs = this.getRemainingSeconds();
      if (remainingSecs <= 0 && this.session?.status === 'running') {
        this.handleSessionCompletion();
      } else {
        this.emitEvent('tick');
      }
    }, 1000);
  }

  private stopTickInterval(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}
