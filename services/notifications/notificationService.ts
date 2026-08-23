import * as Notifications from 'expo-notifications';
import { Task, ReminderOption } from '../../models/task';
import { NotificationCapability } from './NotificationCapability';
import { FocusNotification } from './FocusNotification';
import { TaskReminderNotification, IncompleteTaskIndicationMode } from './TaskReminderNotification';
import { NotificationActions } from './NotificationActions';

export type AlarmBehavior = 'notification_only' | 'sound_only' | 'vibration_only' | 'sound_and_vibration';

// Configure notification behavior for Expo (foreground presentation)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {}

export class NotificationService {
  /**
   * Request notification permission contextually
   */
  static async requestPermissions(): Promise<boolean> {
    return await NotificationCapability.requestPermission();
  }

  static async checkPermissions(): Promise<boolean> {
    const state = await NotificationCapability.checkPermission();
    return state === 'granted';
  }

  /**
   * Calculates trigger date based on due date, due time, and reminder option offset.
   */
  static calculateTriggerDate(dueDate: string, dueTime?: string, reminder?: ReminderOption): Date | null {
    return TaskReminderNotification.calculateTriggerDate(dueDate, dueTime, reminder);
  }

  /**
   * Schedules notification for a task across Android, Windows Electron, and Web.
   */
  static async scheduleTaskReminder(
    task: Task,
    alarmBehavior?: AlarmBehavior,
    projectName?: string
  ): Promise<string | undefined> {
    return await TaskReminderNotification.scheduleTaskReminder(task, projectName);
  }

  /**
   * Shows instant completion notification for Focus mode session
   */
  static async sendFocusCompletionNotification(
    sessionTitle: string = 'Focus Session Completed!',
    sessionBody: string = 'Great job staying productive. Time for a well-deserved break.'
  ): Promise<void> {
    const { ActiveFocusSession } = require('../../models/focus');
    const dummySession = {
      id: `sess-${Date.now()}`,
      status: 'running' as const,
      mode: 'work' as const,
      durationMs: 25 * 60 * 1000,
      startedAt: Date.now(),
      pausedAt: null,
      accumulatedMs: 0,
      endsAt: Date.now() + 100,
      updatedAt: Date.now(),
    };
    await FocusNotification.scheduleCompletion(dummySession);
  }

  static async cancelTaskReminder(notificationId?: string): Promise<void> {
    await TaskReminderNotification.cancelTaskReminder(notificationId);
  }

  static async cancelAllNotifications(): Promise<void> {
    await TaskReminderNotification.cancelAll();
    await FocusNotification.clear();
  }
}

export { NotificationCapability, FocusNotification, TaskReminderNotification, NotificationActions };

