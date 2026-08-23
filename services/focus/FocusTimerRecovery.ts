import { ActiveFocusSession, FocusSession, PomodoroSettings } from '../../models/focus';
import { FocusTimerPersistence } from './FocusTimerPersistence';
import { FocusTimerNotification } from './FocusTimerNotification';
import { Repository, getTodayDateString } from '../storage/repository';
import { haptics } from '../haptics';

export interface RecoveryResult {
  status: 'idle' | 'still_running' | 'paused' | 'completed_while_away';
  session: ActiveFocusSession | null;
  remainingMs: number;
  completedSessionsTodayDelta: number;
}

export class FocusTimerRecovery {
  /**
   * Reconciles the persisted session against the authoritative real clock (Date.now())
   */
  static async reconcile(settings: PomodoroSettings): Promise<RecoveryResult> {
    const session = await FocusTimerPersistence.loadActiveSession();

    if (!session || session.status === 'idle') {
      return {
        status: 'idle',
        session: null,
        remainingMs: settings.focusDuration * 60 * 1000,
        completedSessionsTodayDelta: 0,
      };
    }

    const now = Date.now();

    // 1. Session is Paused
    if (session.status === 'paused') {
      const remainingMs = Math.max(0, session.durationMs - session.accumulatedMs);
      return {
        status: 'paused',
        session,
        remainingMs,
        completedSessionsTodayDelta: 0,
      };
    }

    // 2. Session is Running
    if (session.status === 'running') {
      const endsAt = session.endsAt || (session.startedAt ? session.startedAt + session.durationMs : now);

      if (now >= endsAt) {
        // --- Timer COMPLETED while the application was backgrounded or terminated ---
        const completedAtIso = new Date(endsAt).toISOString();
        const durationMinutes = Math.round(session.durationMs / (60 * 1000));

        // Save session history log
        if (session.mode === 'work') {
          const newSessionRecord: FocusSession = {
            id: session.id,
            taskId: session.taskId || undefined,
            durationMinutes: durationMinutes || settings.focusDuration,
            completedAt: completedAtIso,
            mode: 'work',
          };
          const existingSessions = await Repository.loadFocusSessions();
          await Repository.saveFocusSessions([newSessionRecord, ...existingSessions]);

          // Update streak statistics
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
        }

        // Clean up active session
        await FocusTimerPersistence.clearActiveSession();
        await FocusTimerNotification.clearAll();

        haptics.success();

        return {
          status: 'completed_while_away',
          session: {
            ...session,
            status: 'completed',
            completedAt: completedAtIso,
          },
          remainingMs: 0,
          completedSessionsTodayDelta: session.mode === 'work' ? 1 : 0,
        };
      }

      // Still running!
      const remainingMs = Math.max(0, endsAt - now);
      return {
        status: 'still_running',
        session,
        remainingMs,
        completedSessionsTodayDelta: 0,
      };
    }

    return {
      status: 'idle',
      session: null,
      remainingMs: settings.focusDuration * 60 * 1000,
      completedSessionsTodayDelta: 0,
    };
  }
}
