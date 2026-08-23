import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Repository } from '../storage/repository';
import { FocusTimerEngine } from '../focus/FocusTimerEngine';
import { TaskReminderNotification } from './TaskReminderNotification';
import { haptics } from '../haptics';

export type AppRouter = typeof router;

export class NotificationActions {
  private static responseSubscription: any = null;
  private static isInitialized = false;
  private static routerInstance: AppRouter | null = null;


  /**
   * Registers notification action categories (Complete, Snooze, Pause, Resume, Stop)
   */
  static async registerCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('TASK_REMINDER_ACTIONS', [
        {
          identifier: 'COMPLETE_ACTION',
          buttonTitle: 'Complete',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SNOOZE_15M',
          buttonTitle: 'Snooze 15m',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'OPEN_TASK',
          buttonTitle: 'View Task',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('FOCUS_CONTROLS', [
        {
          identifier: 'PAUSE_FOCUS',
          buttonTitle: 'Pause',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'RESUME_FOCUS',
          buttonTitle: 'Resume',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'STOP_FOCUS',
          buttonTitle: 'Stop',
          options: {
            opensAppToForeground: false,
            isDestructive: true,
          },
        },
      ]);
    } catch (e) {
      console.warn('[NotificationActions] Failed registering notification categories:', e);
    }
  }

  /**
   * Initializes the notification response and deep-link handler
   */
  static init(router?: AppRouter): void {
    if (router) {
      this.routerInstance = router;
    }

    if (this.isInitialized) return;
    this.isInitialized = true;

    this.registerCategories();

    this.responseSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        const { actionIdentifier, notification } = response;
        const data = notification.request.content.data || {};

        if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          // User clicked notification body
          if (data.type === 'task_reminder' && data.taskId && this.routerInstance) {
            this.routerInstance.push(`/task/${data.taskId}` as any);
          } else if (data.type === 'focus_timer' && this.routerInstance) {
            this.routerInstance.push('/(tabs)/focus' as any);
          }
          return;
        }

        // Action Buttons
        if (actionIdentifier === 'COMPLETE_ACTION' && data.taskId) {
          haptics.success();
          const tasks = await Repository.loadTasks();
          const targetTask = tasks.find((t) => t.id === data.taskId);
          const updated = tasks.map((t) =>
            t.id === data.taskId
              ? { ...t, completed: true, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : t
          );
          await Repository.saveTasks(updated);
          if (targetTask?.notificationId) {
            await TaskReminderNotification.cancelTaskReminder(targetTask.notificationId);
          }
          return;
        }

        if (actionIdentifier === 'SNOOZE_15M' && data.taskId) {
          haptics.light();
          const tasks = await Repository.loadTasks();
          const task = tasks.find((t) => t.id === data.taskId);
          if (task) {
            const snoozedDate = new Date(Date.now() + 15 * 60 * 1000);
            const hours = String(snoozedDate.getHours()).padStart(2, '0');
            const minutes = String(snoozedDate.getMinutes()).padStart(2, '0');
            const updated = tasks.map((t) =>
              t.id === task.id
                ? { ...t, dueTime: `${hours}:${minutes}`, reminder: 'at_time' as const }
                : t
            );
            await Repository.saveTasks(updated);
            const snoozedTask = updated.find((t) => t.id === task.id);
            if (snoozedTask) {
              await TaskReminderNotification.scheduleTaskReminder(snoozedTask);
            }
          }
          return;
        }


        if (actionIdentifier === 'OPEN_TASK' && data.taskId) {
          if (this.routerInstance) {
            this.routerInstance.push(`/task/${data.taskId}` as any);
          }
          return;
        }

        if (actionIdentifier === 'PAUSE_FOCUS') {
          haptics.light();
          await FocusTimerEngine.getInstance().pauseTimer();
          return;
        }

        if (actionIdentifier === 'RESUME_FOCUS') {
          haptics.medium();
          await FocusTimerEngine.getInstance().startTimer();
          return;
        }

        if (actionIdentifier === 'STOP_FOCUS') {
          haptics.medium();
          await FocusTimerEngine.getInstance().resetTimer();
          return;
        }

        if (actionIdentifier === 'OPEN_FOCUS') {
          if (this.routerInstance) {
            this.routerInstance.push('/(tabs)/focus' as any);
          }
          return;
        }
      } catch (e) {
        console.error('[NotificationActions] Error handling response:', e);
      }
    });
  }

  static setRouter(router: AppRouter): void {
    this.routerInstance = router;
  }


  static cleanup(): void {
    if (this.responseSubscription) {
      this.responseSubscription.remove();
      this.responseSubscription = null;
    }
    this.isInitialized = false;
  }
}
