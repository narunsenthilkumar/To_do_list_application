import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ActiveFocusSession } from '../../models/focus';
import { haptics } from '../haptics';

export const FOCUS_NOTIFICATION_CHANNEL_ID = 'taskora-focus';
export const FOCUS_COMPLETION_CHANNEL_ID = 'taskora-focus-completion';

export class FocusTimerNotification {
  private static ongoingNotificationId: string | null = null;
  private static scheduledCompletionNotifId: string | null = null;
  private static isChannelInitialized = false;
  private static lastUpdatedSecs: number = -1;

  /**
   * Ensures dedicated Android notification channels exist with proper properties
   */
  static async ensureNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android' || this.isChannelInitialized) return;

    try {
      // 1. Ongoing Active Focus Session Channel
      await Notifications.setNotificationChannelAsync(FOCUS_NOTIFICATION_CHANNEL_ID, {
        name: 'Taskora Focus Session',
        importance: Notifications.AndroidImportance.LOW, // Low so it doesn't chime continuously on updates
        sound: undefined,
        enableVibrate: false,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // 2. Focus Session Completion Channel (Alarm & Sound)
      await Notifications.setNotificationChannelAsync(FOCUS_COMPLETION_CHANNEL_ID, {
        name: 'Focus Session Completed',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#007AFF',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      this.isChannelInitialized = true;
    } catch (e) {
      console.warn('[FocusTimerNotification] Failed creating notification channels:', e);
    }
  }

  /**
   * Formats remaining seconds as MM:SS
   */
  private static formatDuration(secs: number): string {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  /**
   * Updates or creates the ongoing notification for an active focus session
   */
  static async updateOngoingNotification(
    session: ActiveFocusSession,
    remainingSeconds: number,
    taskTitle?: string
  ): Promise<void> {
    if (session.status !== 'running' && session.status !== 'paused') {
      await this.cancelOngoingNotification();
      return;
    }

    // Avoid redundant updates if second didn't change
    if (this.lastUpdatedSecs === remainingSeconds) return;
    this.lastUpdatedSecs = remainingSeconds;

    try {
      await this.ensureNotificationChannels();

      const timeFormatted = this.formatDuration(remainingSeconds);
      const modeLabel = session.mode === 'work' ? 'Deep Focus' : 'Break Time';
      const heading = taskTitle ? `${taskTitle}` : `Focus Session`;
      const subtitle = session.status === 'running' ? `${timeFormatted} remaining` : `Paused (${timeFormatted})`;

      // Android / Native Expo notification
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const notifContent: Notifications.NotificationContentInput = {
          title: `Taskora — ${modeLabel}`,
          body: `${heading} • ${subtitle}`,
          data: {
            type: 'focus_session',
            sessionId: session.id,
            mode: session.mode,
            status: session.status,
          },
          categoryIdentifier: 'FOCUS_CONTROLS',
          sticky: session.status === 'running', // Ongoing on Android
          autoDismiss: false,
        };

        if (Platform.OS === 'android') {
          (notifContent as any).channelId = FOCUS_NOTIFICATION_CHANNEL_ID;
          (notifContent as any).priority = Notifications.AndroidNotificationPriority.LOW;
        }

        if (this.ongoingNotificationId) {
          await Notifications.dismissNotificationAsync(this.ongoingNotificationId).catch(() => {});
        }

        this.ongoingNotificationId = await Notifications.scheduleNotificationAsync({
          content: notifContent,
          trigger: null, // show immediately
        });
      }
    } catch (e) {
      console.warn('[FocusTimerNotification] Ongoing notification update error:', e);
    }
  }

  /**
   * Schedules a native notification to fire at exact completion time (endsAt)
   */
  static async scheduleCompletionNotification(
    session: ActiveFocusSession,
    taskTitle?: string
  ): Promise<void> {
    if (session.status !== 'running' || !session.endsAt) return;

    try {
      await this.cancelScheduledCompletion();
      await this.ensureNotificationChannels();

      const triggerDate = new Date(session.endsAt);
      if (triggerDate.getTime() <= Date.now()) return;

      const modeTitle = session.mode === 'work' ? 'Focus Session Completed! 🎉' : 'Break Ended ⚡';
      const modeBody =
        session.mode === 'work'
          ? taskTitle
            ? `Finished focusing on "${taskTitle}". Take a well-deserved break!`
            : 'Great job staying productive. Take a break!'
          : 'Ready to start your next focus session?';

      // Desktop Electron fallback
      if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
        const diffMs = triggerDate.getTime() - Date.now();
        if (diffMs > 0 && diffMs < 2147483647) {
          const timeoutId = setTimeout(() => {
            (window as any).electronAPI.showNotification({
              title: modeTitle,
              body: modeBody,
            });
            haptics.success();
          }, diffMs);
          this.scheduledCompletionNotifId = String(timeoutId);
        }
        return;
      }

      // Web Browser fallback
      if (Platform.OS === 'web') {
        const diffMs = triggerDate.getTime() - Date.now();
        if (diffMs > 0 && diffMs < 2147483647) {
          const timeoutId = setTimeout(() => {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(modeTitle, { body: modeBody });
            }
            haptics.success();
          }, diffMs);
          this.scheduledCompletionNotifId = String(timeoutId);
        }
        return;
      }

      // Android & iOS Native Scheduling
      const notifContent: Notifications.NotificationContentInput = {
        title: modeTitle,
        body: modeBody,
        sound: true,
        data: {
          type: 'focus_completed',
          sessionId: session.id,
          mode: session.mode,
        },
      };

      if (Platform.OS === 'android') {
        (notifContent as any).channelId = FOCUS_COMPLETION_CHANNEL_ID;
        (notifContent as any).priority = Notifications.AndroidNotificationPriority.MAX;
      }

      this.scheduledCompletionNotifId = await Notifications.scheduleNotificationAsync({
        content: notifContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    } catch (e) {
      console.warn('[FocusTimerNotification] Failed scheduling completion notification:', e);
    }
  }

  /**
   * Cancels any scheduled completion notification
   */
  static async cancelScheduledCompletion(): Promise<void> {
    if (this.scheduledCompletionNotifId) {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
          clearTimeout(Number(this.scheduledCompletionNotifId));
        } else if (Platform.OS === 'web') {
          clearTimeout(Number(this.scheduledCompletionNotifId));
        } else {
          await Notifications.cancelScheduledNotificationAsync(this.scheduledCompletionNotifId);
        }
      } catch {}
      this.scheduledCompletionNotifId = null;
    }
  }

  /**
   * Cancels the ongoing timer notification
   */
  static async cancelOngoingNotification(): Promise<void> {
    if (this.ongoingNotificationId) {
      try {
        await Notifications.dismissNotificationAsync(this.ongoingNotificationId);
      } catch {}
      this.ongoingNotificationId = null;
      this.lastUpdatedSecs = -1;
    }
  }

  /**
   * Cleans up all focus notifications
   */
  static async clearAll(): Promise<void> {
    await this.cancelOngoingNotification();
    await this.cancelScheduledCompletion();
  }
}
