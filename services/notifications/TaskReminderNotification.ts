import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task, ReminderOption } from '../../models/task';
import { Repository } from '../storage/repository';
import { NotificationCapability } from './NotificationCapability';
import { haptics } from '../haptics';

export type IncompleteTaskIndicationMode = 'off' | 'notification' | 'alarm' | 'both';

export const REMINDER_CHANNEL_ID = 'taskora_reminders';
export const ALARM_CHANNEL_ID = 'taskora_alarms';

export class TaskReminderNotification {
  private static channelsInitialized = false;

  /**
   * Initializes notification and alarm channels on Android
   */
  static async ensureChannels(): Promise<void> {
    if (Platform.OS !== 'android' || this.channelsInitialized) return;

    try {
      // 1. Standard Reminders Channel
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Task Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // 2. Alarm Mode Channel (High Urgency)
      await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
        name: 'Task Alarms',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#FF3B30',
        bypassDnd: false, // Respect system DND controls
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      this.channelsInitialized = true;
    } catch (e) {
      console.warn('[TaskReminderNotification] Channel setup warning:', e);
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
      hours = isNaN(h) ? 9 : h;
      minutes = isNaN(m) ? 0 : m;
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
   * Schedules reminder for a task according to user's configured indication mode
   */
  static async scheduleTaskReminder(task: Task, projectName?: string): Promise<string | undefined> {
    if (!task.dueDate || !task.reminder || task.reminder === 'none' || task.completed) {
      return undefined;
    }

    const triggerDate = this.calculateTriggerDate(task.dueDate, task.dueTime, task.reminder);
    if (!triggerDate) return undefined;

    const indicationMode = await Repository.loadIncompleteTaskIndication();
    if (indicationMode === 'off') {
      return undefined;
    }

    const permState = await NotificationCapability.checkPermission();
    if (permState !== 'granted') {
      const granted = await NotificationCapability.requestPermission();
      if (!granted) return undefined;
    }

    try {
      if (task.notificationId) {
        await this.cancelTaskReminder(task.notificationId);
      }

      await this.ensureChannels();

      const timeLabel = task.dueTime ? `Due at ${task.dueTime}` : 'Due today';
      const projectLabel = projectName ? ` • ${projectName}` : '';
      const priorityLabel = task.priority !== 'none' ? ` [${task.priority.toUpperCase()}]` : '';
      const bodyText = `${timeLabel}${projectLabel}${priorityLabel}${task.notes ? `\n${task.notes.slice(0, 80)}` : ''}`;

      // 1. Electron Desktop
      if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
        const diffMs = triggerDate.getTime() - Date.now();
        const timerId = `timer-${Date.now()}`;
        if (diffMs > 0 && diffMs < 2147483647) {
          setTimeout(() => {
            (window as any).electronAPI.showNotification({
              title: `KIVENTA: ${task.title}`,
              body: bodyText,
            });
            if (indicationMode === 'alarm' || indicationMode === 'both') {
              haptics.notification();
            }
          }, diffMs);
        }
        return timerId;
      }

      // 2. Web Browser
      if (Platform.OS === 'web') {
        const diffMs = triggerDate.getTime() - Date.now();
        const timerId = `timer-web-${Date.now()}`;
        if (diffMs > 0 && diffMs < 2147483647) {
          setTimeout(() => {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`KIVENTA: ${task.title}`, { body: bodyText });
            }
          }, diffMs);
        }
        return timerId;
      }

      // 3. Android / Mobile Expo
      const isAlarm = indicationMode === 'alarm' || indicationMode === 'both';
      const channelId = isAlarm ? ALARM_CHANNEL_ID : REMINDER_CHANNEL_ID;

      const notifContent: Notifications.NotificationContentInput = {
        title: `KIVENTA: ${task.title}`,
        body: bodyText,
        data: {
          type: 'task_reminder',
          taskId: task.id,
          indicationMode,
        },
        sound: true,
        categoryIdentifier: 'TASK_REMINDER_ACTIONS',
      };

      if (Platform.OS === 'android') {
        (notifContent as any).channelId = channelId;
        (notifContent as any).priority = isAlarm
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH;
      }

      const notifId = await Notifications.scheduleNotificationAsync({
        content: notifContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      return notifId;
    } catch (e) {
      console.warn('[TaskReminderNotification] Schedule error:', e);
      return undefined;
    }
  }

  /**
   * Cancels a scheduled task reminder
   */
  static async cancelTaskReminder(notificationId?: string): Promise<void> {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.warn('[TaskReminderNotification] Cancel error:', e);
    }
  }

  /**
   * Cancels all scheduled notifications
   */
  static async cancelAll(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('[TaskReminderNotification] Cancel all error:', e);
    }
  }
}
