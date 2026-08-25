import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Repository } from '../storage/repository';
import { FocusTimerEngine } from '../focus/FocusTimerEngine';
import { ReminderScheduler } from './ReminderScheduler';
import { WidgetDataService } from '../widgets/WidgetDataService';
import { haptics } from '../haptics';

export type AppRouter = typeof router;

export class NotificationActions {
  private static responseSubscription: any = null;
  private static isInitialized = false;
  private static routerInstance: AppRouter | null = null;

  /**
   * Registers notification action categories (Complete, Snooze 5m/10m/15m/30m, View, Focus Controls)
   */
  static async registerCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('TASK_REMINDER_ACTIONS', [
        {
          identifier: 'COMPLETE_ACTION',
          buttonTitle: '✓ Complete',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SNOOZE_10M',
          buttonTitle: 'Snooze 10m',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SNOOZE_30M',
          buttonTitle: 'Snooze 30m',
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
        const data = (notification.request.content.data || {}) as Record<string, any>;

        if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          // User clicked notification body
          if (data.type === 'task_reminder' && data.taskId && this.routerInstance) {
            this.routerInstance.push(`/task/${data.taskId}` as any);
          } else if (data.type === 'focus_timer' || data.type === 'focus_session') {
            if (this.routerInstance) {
              this.routerInstance.push('/(tabs)/focus' as any);
            }
          }
          return;
        }

        // Action: Complete Task
        if (actionIdentifier === 'COMPLETE_ACTION' && data.taskId) {
          haptics.success();
          const tasks = await Repository.loadTasks();
          const targetTask = tasks.find((t) => t.id === data.taskId);
          if (targetTask) {
            const updated = tasks.map((t) =>
              t.id === data.taskId
                ? {
                    ...t,
                    completed: true,
                    completedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    notificationId: undefined,
                  }
                : t
            );
            await Repository.saveTasks(updated);
            await ReminderScheduler.cancelReminder(targetTask.id, targetTask.notificationId);
            await WidgetDataService.refreshSnapshot().catch(() => {});
          }
          return;
        }

        // Action: Snooze (supports 5m, 10m, 15m, 30m)
        if (actionIdentifier.startsWith('SNOOZE_') && data.taskId) {
          haptics.light();
          let snoozeMins = 15;
          if (actionIdentifier === 'SNOOZE_5M') snoozeMins = 5;
          if (actionIdentifier === 'SNOOZE_10M') snoozeMins = 10;
          if (actionIdentifier === 'SNOOZE_15M') snoozeMins = 15;
          if (actionIdentifier === 'SNOOZE_30M') snoozeMins = 30;

          await ReminderScheduler.snoozeReminder(data.taskId, snoozeMins);
          await WidgetDataService.refreshSnapshot().catch(() => {});
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

