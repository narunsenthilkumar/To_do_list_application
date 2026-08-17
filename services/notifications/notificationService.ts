import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task, ReminderOption } from '../../models/task';
import { haptics } from '../haptics';

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
  private static channelInitialized: boolean = false;

  /**
   * Initializes notification channel on Android
   */
  private static async ensureAndroidChannel(alarmBehavior: AlarmBehavior = 'sound_and_vibration'): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      const hasSound = alarmBehavior === 'sound_only' || alarmBehavior === 'sound_and_vibration';
      const hasVib = alarmBehavior === 'vibration_only' || alarmBehavior === 'sound_and_vibration';

      await Notifications.setNotificationChannelAsync('taskora_reminders', {
        name: 'Task Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: hasSound ? 'default' : undefined,
        vibrationPattern: hasVib ? [0, 250, 250, 250] : undefined,
        enableVibrate: hasVib,
        lightColor: '#007AFF',
      });
      this.channelInitialized = true;
    } catch (e) {
      console.warn('[NotificationService] Channel setup warning:', e);
    }
  }

  /**
   * Request notification permission contextually (only when user configures a reminder)
   */
  static async requestPermissions(): Promise<boolean> {
    // 1. Electron Desktop
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      return true;
    }

    // 2. Web Browser
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          if (Notification.permission === 'granted') return true;
          if (Notification.permission !== 'denied') {
            const permPromise = Notification.requestPermission();
            const timeoutPromise = new Promise<NotificationPermission>((resolve) =>
              setTimeout(() => resolve(Notification.permission), 1200)
            );
            const status = await Promise.race([permPromise, timeoutPromise]);
            return status === 'granted';
          }
        } catch {}
      }
      return false;
    }

    // 3. Android / Mobile Expo
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        await this.ensureAndroidChannel();
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[NotificationService] Permission error', e);
      return false;
    }
  }

  static async checkPermissions(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      return true;
    }

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        return Notification.permission === 'granted';
      }
      return false;
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch {
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
   * Schedules notification for a task across Android, Windows Electron, and Web.
   */
  static async scheduleTaskReminder(
    task: Task,
    alarmBehavior: AlarmBehavior = 'sound_and_vibration'
  ): Promise<string | undefined> {
    if (!task.dueDate || !task.reminder || task.reminder === 'none' || task.completed) {
      return undefined;
    }

    const triggerDate = this.calculateTriggerDate(task.dueDate, task.dueTime, task.reminder);
    if (!triggerDate) return undefined;

    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) return undefined;
    }

    try {
      if (task.notificationId) {
        await this.cancelTaskReminder(task.notificationId);
      }

      // Windows Electron / Web Desktop scheduling
      if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
        const diffMs = triggerDate.getTime() - Date.now();
        const timerId = `timer-${Date.now()}`;
        if (diffMs > 0 && diffMs < 2147483647) {
          setTimeout(() => {
            (window as any).electronAPI.showNotification({
              title: `Taskora Reminder: ${task.title}`,
              body: task.notes ? task.notes.slice(0, 100) : task.dueTime ? `Due at ${task.dueTime}` : 'Due today',
            });
            if (alarmBehavior === 'sound_only' || alarmBehavior === 'sound_and_vibration') {
              haptics.notification();
            }
          }, diffMs);
        }
        return timerId;
      }

      // Android / Native Expo Scheduling
      await this.ensureAndroidChannel(alarmBehavior);

      const hasSound = alarmBehavior === 'sound_only' || alarmBehavior === 'sound_and_vibration';

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Taskora: ${task.title}`,
          body: task.notes ? task.notes.slice(0, 100) : task.dueTime ? `Due at ${task.dueTime}` : 'Due today',
          data: { taskId: task.id },
          sound: hasSound,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      return notifId;
    } catch (e) {
      console.warn('[NotificationService] Schedule error', e);
      return undefined;
    }
  }

  /**
   * Shows instant completion notification for Focus mode session
   */
  static async sendFocusCompletionNotification(
    sessionTitle: string = 'Focus Session Completed!',
    sessionBody: string = 'Great job staying productive. Time for a well-deserved break.'
  ): Promise<void> {
    try {
      // 1. Electron Desktop
      if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
        (window as any).electronAPI.showNotification({
          title: sessionTitle,
          body: sessionBody,
        });
        haptics.success();
        return;
      }

      // 2. Web Browser
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(sessionTitle, { body: sessionBody });
        haptics.success();
        return;
      }

      // 3. Android / Mobile Expo
      await Notifications.scheduleNotificationAsync({
        content: {
          title: sessionTitle,
          body: sessionBody,
          sound: true,
        },
        trigger: null, // send immediately
      });
      haptics.success();
    } catch (e) {
      console.warn('[NotificationService] Focus completion notification error:', e);
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
