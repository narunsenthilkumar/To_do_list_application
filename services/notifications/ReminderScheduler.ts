import * as Notifications from 'expo-notifications';
import { Platform, NativeModules } from 'react-native';
import { Task, ReminderOption, TaskReminderConfig } from '../../models/task';
import { Repository } from '../storage/repository';
import { NotificationChannels, TASK_REMINDERS_CHANNEL_ID, TASK_ALARMS_CHANNEL_ID } from './NotificationChannels';
import { NotificationRegistry } from './NotificationRegistry';
import { NotificationCapability } from './NotificationCapability';
import { haptics } from '../haptics';

export interface ResolvedReminderInfo {
  triggerDate: Date;
  triggerEpochMs: number;
  canonicalIso: string;
  timezone: string;
  isAlarm: boolean;
}

export class ReminderScheduler {
  /**
   * Resolves the canonical trigger date, epoch timestamp, and timezone for any task
   */
  static resolveReminderTrigger(task: Task): ResolvedReminderInfo | null {
    if (!task || task.completed) return null;

    const timezone =
      task.reminderConfig?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC';

    // 1. Explicit canonical trigger timestamp in reminderConfig
    if (task.reminderConfig?.triggerEpochMs && task.reminderConfig.triggerEpochMs > Date.now()) {
      const triggerDate = new Date(task.reminderConfig.triggerEpochMs);
      return {
        triggerDate,
        triggerEpochMs: task.reminderConfig.triggerEpochMs,
        canonicalIso: task.reminderConfig.triggerAt || triggerDate.toISOString(),
        timezone,
        isAlarm: task.reminderConfig.alarmMode === 'alarm' || task.reminderConfig.alarmMode === 'both',
      };
    }

    // 2. Custom Date & Time selection in task reminderConfig
    if (task.reminderConfig?.type === 'custom' && task.reminderConfig.customDate) {
      const timeStr = task.reminderConfig.customTime || task.dueTime || '09:00';
      const customRes = this.calculateCustomTrigger(task.reminderConfig.customDate, timeStr, timezone);
      if (customRes) {
        return {
          ...customRes,
          isAlarm: task.reminderConfig.alarmMode === 'alarm' || task.reminderConfig.alarmMode === 'both',
        };
      }
    }

    // 3. Due Date + Due Time + Reminder preset option
    const reminderOpt = task.reminder || task.reminderConfig?.presetOption;
    if (!task.dueDate || !reminderOpt || reminderOpt === 'none') {
      return null;
    }

    const [year, month, day] = task.dueDate.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    let hours = 9; // Default 9 AM if no time specified
    let minutes = 0;

    if (task.dueTime) {
      const [h, m] = task.dueTime.split(':').map(Number);
      hours = isNaN(h) ? 9 : h;
      minutes = isNaN(m) ? 0 : m;
    }

    // Construct local Date deterministically
    const trigger = new Date(year, month - 1, day, hours, minutes, 0, 0);

    switch (reminderOpt) {
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

    const triggerEpochMs = trigger.getTime();
    if (triggerEpochMs <= Date.now()) {
      return null; // Expired
    }

    return {
      triggerDate: trigger,
      triggerEpochMs,
      canonicalIso: trigger.toISOString(),
      timezone,
      isAlarm: task.reminderConfig?.alarmMode === 'alarm' || task.reminderConfig?.alarmMode === 'both',
    };
  }

  /**
   * Deterministically calculates canonical trigger from custom date string and time string
   */
  static calculateCustomTrigger(
    dateStr: string,
    timeStr: string,
    timezone?: string
  ): { triggerDate: Date; triggerEpochMs: number; canonicalIso: string; timezone: string } | null {
    if (!dateStr) return null;

    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    let hours = 9;
    let minutes = 0;
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      hours = isNaN(h) ? 9 : h;
      minutes = isNaN(m) ? 0 : m;
    }

    const trigger = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const triggerEpochMs = trigger.getTime();

    if (triggerEpochMs <= Date.now()) {
      return null;
    }

    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    return {
      triggerDate: trigger,
      triggerEpochMs,
      canonicalIso: trigger.toISOString(),
      timezone: tz,
    };
  }

  /**
   * Schedules a task reminder on the platform notification/alarm system
   */
  static async scheduleReminder(task: Task, projectName?: string): Promise<string | undefined> {
    if (task.completed) return undefined;

    const resolved = this.resolveReminderTrigger(task);
    if (!resolved) {
      if (task.notificationId) {
        await this.cancelReminder(task.id, task.notificationId);
      }
      return undefined;
    }

    const indicationMode = await Repository.loadIncompleteTaskIndication();
    if (indicationMode === 'off') {
      return undefined;
    }

    // Verify notification permission
    const permState = await NotificationCapability.checkPermission();
    if (permState !== 'granted') {
      const granted = await NotificationCapability.requestPermission();
      if (!granted) return undefined;
    }

    try {
      // Cancel previous notification registration if any
      const existing = await NotificationRegistry.getByTaskId(task.id);
      if (existing?.notificationId || task.notificationId) {
        await this.cancelReminder(task.id, existing?.notificationId || task.notificationId);
      }

      await NotificationChannels.ensureChannels();

      const timeLabel = task.dueTime ? `Due at ${task.dueTime}` : 'Due today';
      const projectLabel = projectName ? ` • ${projectName}` : '';
      const priorityLabel = task.priority !== 'none' ? ` [${task.priority.toUpperCase()}]` : '';
      const bodyText = `${timeLabel}${projectLabel}${priorityLabel}${task.notes ? `\n${task.notes.slice(0, 80)}` : ''}`;

      // 1. Electron Desktop
      if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
        const diffMs = resolved.triggerEpochMs - Date.now();
        const timerId = `timer-elec-${task.id}-${Date.now()}`;
        if (diffMs > 0 && diffMs < 2147483647) {
          setTimeout(() => {
            (window as any).electronAPI.showNotification({
              title: `KIVENTA: ${task.title}`,
              body: bodyText,
            });
            if (resolved.isAlarm || indicationMode === 'alarm' || indicationMode === 'both') {
              haptics.notification();
            }
          }, diffMs);
        }

        await NotificationRegistry.register({
          taskId: task.id,
          notificationId: timerId,
          triggerAt: resolved.canonicalIso,
          triggerEpochMs: resolved.triggerEpochMs,
          taskTitle: task.title,
          alarmMode: indicationMode,
          createdAt: new Date().toISOString(),
        });

        return timerId;
      }

      // 2. Web Browser
      if (Platform.OS === 'web') {
        const diffMs = resolved.triggerEpochMs - Date.now();
        const timerId = `timer-web-${task.id}-${Date.now()}`;
        if (diffMs > 0 && diffMs < 2147483647) {
          setTimeout(() => {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`KIVENTA: ${task.title}`, {
                body: bodyText,
                icon: '/favicon.png',
              });
            }
          }, diffMs);
        }

        await NotificationRegistry.register({
          taskId: task.id,
          notificationId: timerId,
          triggerAt: resolved.canonicalIso,
          triggerEpochMs: resolved.triggerEpochMs,
          taskTitle: task.title,
          alarmMode: indicationMode,
          createdAt: new Date().toISOString(),
        });

        return timerId;
      }

      // 3. Android Exact Alarm Native Module check
      const isAlarmRequested = resolved.isAlarm || indicationMode === 'alarm' || indicationMode === 'both';
      if (Platform.OS === 'android' && isAlarmRequested && NativeModules.TaskoraAlarmModule) {
        try {
          const alarmId = await NativeModules.TaskoraAlarmModule.scheduleExactAlarm(
            task.id,
            task.title,
            bodyText,
            resolved.triggerEpochMs
          );
          if (alarmId) {
            await NotificationRegistry.register({
              taskId: task.id,
              notificationId: alarmId,
              triggerAt: resolved.canonicalIso,
              triggerEpochMs: resolved.triggerEpochMs,
              taskTitle: task.title,
              alarmMode: 'alarm',
              createdAt: new Date().toISOString(),
            });
            return alarmId;
          }
        } catch (alarmErr) {
          console.warn('[ReminderScheduler] Exact alarm module fallback to standard notification:', alarmErr);
        }
      }

      // 4. Mobile Notifications (Android & iOS Expo)
      const channelId = isAlarmRequested ? TASK_ALARMS_CHANNEL_ID : TASK_REMINDERS_CHANNEL_ID;

      const notifContent: Notifications.NotificationContentInput = {
        title: `KIVENTA: ${task.title}`,
        body: bodyText,
        data: {
          type: 'task_reminder',
          taskId: task.id,
          indicationMode,
          triggerAt: resolved.canonicalIso,
        },
        sound: true,
        categoryIdentifier: 'TASK_REMINDER_ACTIONS',
      };

      if (Platform.OS === 'android') {
        (notifContent as any).channelId = channelId;
        (notifContent as any).priority = isAlarmRequested
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH;
      }

      const notifId = await Notifications.scheduleNotificationAsync({
        content: notifContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: resolved.triggerDate,
        },
      });

      await NotificationRegistry.register({
        taskId: task.id,
        notificationId: notifId,
        triggerAt: resolved.canonicalIso,
        triggerEpochMs: resolved.triggerEpochMs,
        taskTitle: task.title,
        alarmMode: indicationMode,
        createdAt: new Date().toISOString(),
      });

      return notifId;
    } catch (e) {
      console.warn('[ReminderScheduler] Schedule reminder warning:', e);
      return undefined;
    }
  }

  /**
   * Cancels a scheduled task reminder
   */
  static async cancelReminder(taskId: string, notificationId?: string): Promise<void> {
    try {
      const registeredId = await NotificationRegistry.unregister(taskId);
      const targetId = notificationId || registeredId;

      if (targetId) {
        // Check native alarm module
        if (Platform.OS === 'android' && NativeModules.TaskoraAlarmModule) {
          try {
            await NativeModules.TaskoraAlarmModule.cancelAlarm(taskId);
          } catch {}
        }

        if (Platform.OS !== 'web') {
          await Notifications.cancelScheduledNotificationAsync(targetId).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[ReminderScheduler] Cancel reminder warning:', e);
    }
  }

  /**
   * Reschedules an updated task reminder
   */
  static async rescheduleReminder(task: Task, projectName?: string): Promise<string | undefined> {
    await this.cancelReminder(task.id, task.notificationId);
    return await this.scheduleReminder(task, projectName);
  }

  /**
   * Snoozes a task reminder by N minutes (default 15 minutes)
   */
  static async snoozeReminder(taskId: string, snoozeMinutes: number = 15): Promise<string | undefined> {
    const tasks = await Repository.loadTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return undefined;

    const now = Date.now();
    const snoozeMs = snoozeMinutes * 60 * 1000;
    const triggerEpochMs = now + snoozeMs;
    const triggerDate = new Date(triggerEpochMs);

    const hours = String(triggerDate.getHours()).padStart(2, '0');
    const minutes = String(triggerDate.getMinutes()).padStart(2, '0');
    const newDueTime = `${hours}:${minutes}`;

    const timezone =
      task.reminderConfig?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC';

    const updatedConfig: TaskReminderConfig = {
      enabled: true,
      type: 'custom',
      triggerAt: triggerDate.toISOString(),
      triggerEpochMs,
      timezone,
      snoozeEnabled: true,
      snoozeDurationMinutes: snoozeMinutes,
      alarmMode: task.reminderConfig?.alarmMode || 'both',
    };

    const updatedTask: Task = {
      ...task,
      dueTime: newDueTime,
      reminder: 'at_time',
      reminderConfig: updatedConfig,
      updatedAt: new Date().toISOString(),
    };

    const nextTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t));
    await Repository.saveTasks(nextTasks);

    const notifId = await this.scheduleReminder(updatedTask);
    if (notifId) {
      updatedTask.notificationId = notifId;
      await Repository.saveTasks(nextTasks.map((t) => (t.id === taskId ? { ...t, notificationId: notifId } : t)));
    }

    return notifId;
  }

  /**
   * Helper to calculate canonical snooze epoch and ISO string
   */
  static calculateSnoozeTimestamp(snoozeMinutes: number = 15): { snoozeEpochMs: number; canonicalIso: string } {
    const snoozeEpochMs = Date.now() + snoozeMinutes * 60 * 1000;
    return {
      snoozeEpochMs,
      canonicalIso: new Date(snoozeEpochMs).toISOString(),
    };
  }

  /**
   * Cancels all task reminders across registry and notifications system
   */
  static async cancelAllTaskReminders(): Promise<void> {

    try {
      await NotificationRegistry.clear();
      if (Platform.OS !== 'web') {
        await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
      }
      if (Platform.OS === 'android' && NativeModules.TaskoraAlarmModule) {
        try {
          await NativeModules.TaskoraAlarmModule.cancelAllAlarms();
        } catch {}
      }
    } catch (e) {
      console.warn('[ReminderScheduler] Cancel all reminders warning:', e);
    }
  }

  /**
   * Startup reconciliation: audits all tasks, purges stale notification registrations,
   * and reschedules any missing future task reminders.
   */
  static async reconcileScheduledReminders(): Promise<{ reconciledCount: number; purgedCount: number }> {
    try {
      const [tasks, registryRecords] = await Promise.all([
        Repository.loadTasks(),
        NotificationRegistry.getAll(),
      ]);

      const now = Date.now();
      const taskMap = new Map<string, Task>();
      tasks.forEach((t) => taskMap.set(t.id, t));

      let purgedCount = 0;
      let reconciledCount = 0;

      // 1. Clean up stale/completed registry records
      for (const record of registryRecords) {
        const task = taskMap.get(record.taskId);
        if (!task || task.completed || record.triggerEpochMs <= now) {
          await NotificationRegistry.unregister(record.taskId);
          purgedCount++;
        }
      }

      // 2. Schedule any missing future task reminders
      const uncompletedWithReminders = tasks.filter((t) => !t.completed && (t.reminder || t.reminderConfig));
      for (const task of uncompletedWithReminders) {
        const resolved = this.resolveReminderTrigger(task);
        if (resolved && resolved.triggerEpochMs > now) {
          const reg = await NotificationRegistry.getByTaskId(task.id);
          if (!reg || reg.triggerEpochMs !== resolved.triggerEpochMs) {
            await this.scheduleReminder(task);
            reconciledCount++;
          }
        }
      }

      return { reconciledCount, purgedCount };
    } catch (e) {
      console.warn('[ReminderScheduler] Reminder reconciliation warning:', e);
      return { reconciledCount: 0, purgedCount: 0 };
    }
  }
}
