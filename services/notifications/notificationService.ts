import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task, ReminderOption } from '../../models/task';

// Configure notification behavior for Expo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  /**
   * Request notification permission gracefully.
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('taskora_reminders', {
          name: 'Task Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#007AFF',
        });
      }

      return true;
    } catch (e) {
      console.warn('[NotificationService] Permission error', e);
      return false;
    }
  }

  static async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      return false;
    }
  }

  /**
   * Calculates trigger date based on due date, due time, and reminder option offset.
   */
  static calculateTriggerDate(dueDate: string, dueTime?: string, reminder?: ReminderOption): Date | null {
    if (!dueDate || !reminder || reminder === 'none') return null;

    const [year, month, day] = dueDate.split('-').map(Number);
    let hours = 9; // Default 9 AM if no time specified
    let minutes = 0;

    if (dueTime) {
      const [h, m] = dueTime.split(':').map(Number);
      hours = h;
      minutes = m;
    }

    const trigger = new Date(year, month - 1, day, hours, minutes);

    switch (reminder) {
      case '5m_before':
        trigger.setMinutes(trigger.getMinutes() - 5);
        break;
      case '15m_before':
        trigger.setMinutes(trigger.getMinutes() - 15);
        break;
      case '30m_before':
        trigger.setMinutes(trigger.getMinutes() - 30);
        break;
      case '1h_before':
        trigger.setHours(trigger.getHours() - 1);
        break;
      case '1d_before':
        trigger.setDate(trigger.getDate() - 1);
        break;
      case 'at_time':
      default:
        break;
    }

    // Must be in the future
    if (trigger.getTime() <= Date.now()) {
      return null;
    }

    return trigger;
  }

  /**
   * Schedules notification for a task and returns notification ID.
   */
  static async scheduleTaskReminder(task: Task): Promise<string | undefined> {
    if (!task.dueDate || !task.reminder || task.reminder === 'none' || task.completed) {
      return undefined;
    }

    const hasPermission = await this.checkPermissions();
    if (!hasPermission) return undefined;

    const triggerDate = this.calculateTriggerDate(task.dueDate, task.dueTime, task.reminder);
    if (!triggerDate) return undefined;

    try {
      if (task.notificationId) {
        await this.cancelTaskReminder(task.notificationId);
      }

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Taskora Reminder: ${task.title}`,
          body: task.notes ? task.notes.slice(0, 100) : 'Tap to open task details.',
          data: { taskId: task.id },
          sound: true,
        },
        trigger: {
          date: triggerDate,
        } as any,
      });

      return notifId;
    } catch (e) {
      console.warn('[NotificationService] Schedule error', e);
      return undefined;
    }
  }

  static async cancelTaskReminder(notificationId?: string): Promise<void> {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.warn('[NotificationService] Cancel error', e);
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('[NotificationService] Cancel all error', e);
    }
  }
}
