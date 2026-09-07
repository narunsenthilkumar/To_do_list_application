import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationCapability, DeviceNotificationProfile } from './NotificationCapability';
import { NotificationChannels } from './NotificationChannels';

export type NotificationDisplayMode =
  | 'HEADS_UP_BANNER'       // High-priority top banner with audio/vibration
  | 'ONGOING_ISLAND_PILL'   // Sticky ongoing status bar / shade pill
  | 'LOCKSCREEN_CARD'       // High-visibility lock screen card
  | 'STANDARD_SHADE';       // Normal notification tray entry

export interface AdaptiveNotificationOptions {
  title: string;
  body: string;
  categoryIdentifier?: string;
  data?: Record<string, any>;
  isUrgent?: boolean;
  isOngoing?: boolean;
  channelId?: string;
}

export class NotificationExperienceManager {
  /**
   * Evaluates device notification capabilities and returns optimal display mode
   */
  static async resolveDisplayMode(isUrgent: boolean = false, isOngoing: boolean = false): Promise<NotificationDisplayMode> {
    const profile = await NotificationCapability.getCapabilityProfile();

    if (Platform.OS === 'android') {
      if (isOngoing && profile.supportsOngoingNotification) {
        return 'ONGOING_ISLAND_PILL';
      }
      if (isUrgent || profile.hasExactAlarmPermission) {
        return 'HEADS_UP_BANNER';
      }
      return 'STANDARD_SHADE';
    }

    if (Platform.OS === 'ios') {
      return isUrgent ? 'HEADS_UP_BANNER' : 'STANDARD_SHADE';
    }

    return 'STANDARD_SHADE';
  }

  /**
   * Presents an adaptive Android notification utilizing the highest supported surface
   */
  static async presentAdaptiveNotification(options: AdaptiveNotificationOptions): Promise<string | undefined> {
    try {
      const mode = await this.resolveDisplayMode(options.isUrgent, options.isOngoing);
      await NotificationChannels.ensureChannels();

      const notifContent: Notifications.NotificationContentInput = {
        title: options.title,
        body: options.body,
        data: options.data || {},
        sound: true,
        categoryIdentifier: options.categoryIdentifier || 'TASK_REMINDER_ACTIONS',
        sticky: options.isOngoing || mode === 'ONGOING_ISLAND_PILL',
        autoDismiss: !options.isOngoing,
      };

      if (Platform.OS === 'android') {
        const targetChannel = options.channelId || (options.isUrgent ? 'taskora_alarms' : 'taskora_reminders');
        (notifContent as any).channelId = targetChannel;
        (notifContent as any).priority = options.isUrgent
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH;
      }

      const notifId = await Notifications.scheduleNotificationAsync({
        content: notifContent,
        trigger: null, // immediate display
      });

      return notifId;
    } catch (e) {
      console.warn('[NotificationExperienceManager] Failed presenting adaptive notification:', e);
      return undefined;
    }
  }

  /**
   * Helper to format and display ongoing Focus Timer notification
   */
  static async presentFocusIsland(
    taskTitle: string | undefined,
    timeFormatted: string,
    isRunning: boolean
  ): Promise<string | undefined> {
    const title = `Taskora Focus • ${timeFormatted}`;
    const body = taskTitle ? `Task: ${taskTitle} (${isRunning ? 'Active' : 'Paused'})` : `Status: ${isRunning ? 'In Progress' : 'Paused'}`;

    return await this.presentAdaptiveNotification({
      title,
      body,
      categoryIdentifier: 'FOCUS_CONTROLS',
      isOngoing: true,
      channelId: 'taskora-focus',
      data: {
        type: 'focus_session',
        status: isRunning ? 'running' : 'paused',
      },
    });
  }
}
