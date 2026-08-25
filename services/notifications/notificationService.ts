import * as Notifications from 'expo-notifications';
import { Task, ReminderOption } from '../../models/task';
import { NotificationCapability } from './NotificationCapability';
import { FocusNotification } from './FocusNotification';
import { TaskReminderNotification, IncompleteTaskIndicationMode } from './TaskReminderNotification';
import { ReminderScheduler } from './ReminderScheduler';
import { NotificationChannels } from './NotificationChannels';
import { NotificationRegistry } from './NotificationRegistry';
import { NotificationActions } from './NotificationActions';

export type AlarmBehavior = 'notification_only' | 'sound_only' | 'vibration_only' | 'sound_and_vibration';

// Configure notification presentation handler
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
   * Initializes notification channels
   */
  static async ensureChannels(): Promise<void> {
    await NotificationChannels.ensureChannels();
  }

  /**
   * Calculates trigger date based on due date, due time, and reminder option offset.
   */
  static calculateTriggerDate(dueDate: string, dueTime?: string, reminder?: ReminderOption): Date | null {
    const dummyTask: any = { dueDate, dueTime, reminder, completed: false };
    const resolved = ReminderScheduler.resolveReminderTrigger(dummyTask);
    return resolved ? resolved.triggerDate : null;
  }

  /**
   * Schedules notification for a task across Android, Windows Electron, and Web.
   */
  static async scheduleTaskReminder(
    task: Task,
    alarmBehavior?: AlarmBehavior,
    projectName?: string
  ): Promise<string | undefined> {
    return await ReminderScheduler.scheduleReminder(task, projectName);
  }

  /**
   * Reschedules an updated task reminder
   */
  static async rescheduleTaskReminder(task: Task, projectName?: string): Promise<string | undefined> {
    return await ReminderScheduler.rescheduleReminder(task, projectName);
  }

  /**
   * Snoozes a task reminder
   */
  static async snoozeTaskReminder(taskId: string, snoozeMinutes?: number): Promise<string | undefined> {
    return await ReminderScheduler.snoozeReminder(taskId, snoozeMinutes);
  }

  /**
   * Shows instant completion notification for Focus mode session
   */
  static async sendFocusCompletionNotification(
    sessionTitle: string = 'Focus Session Completed!',
    sessionBody: string = 'Great job staying productive. Time for a well-deserved break.'
  ): Promise<void> {
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

  static async cancelTaskReminder(notificationId?: string, taskId?: string): Promise<void> {
    if (taskId) {
      await ReminderScheduler.cancelReminder(taskId, notificationId);
    } else if (notificationId) {
      await TaskReminderNotification.cancelTaskReminder(notificationId);
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    await ReminderScheduler.cancelAllTaskReminders();
    await FocusNotification.clear();
  }

  /**
   * Reconciles all persisted task reminders on application startup
   */
  static async reconcileScheduledReminders(): Promise<{ reconciledCount: number; purgedCount: number }> {
    return await ReminderScheduler.reconcileScheduledReminders();
  }
}

export {
  NotificationCapability,
  FocusNotification,
  TaskReminderNotification,
  NotificationActions,
  ReminderScheduler,
  NotificationChannels,
  NotificationRegistry,
};

