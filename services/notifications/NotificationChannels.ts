import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const TASK_REMINDERS_CHANNEL_ID = 'taskora_reminders';
export const TASK_ALARMS_CHANNEL_ID = 'taskora_alarms';
export const FOCUS_TIMER_CHANNEL_ID = 'taskora_focus';
export const FOCUS_COMPLETION_CHANNEL_ID = 'taskora_focus_completion';
export const SYNC_STATUS_CHANNEL_ID = 'taskora_sync';

export class NotificationChannels {
  private static isInitialized = false;

  /**
   * Initializes all required Android notification channels with appropriate importance and behaviors
   */
  static async ensureChannels(): Promise<void> {
    if (Platform.OS !== 'android' || this.isInitialized) return;

    try {
      // 1. Task Reminders (Standard lead time notifications)
      await Notifications.setNotificationChannelAsync(TASK_REMINDERS_CHANNEL_ID, {
        name: 'Task Reminders',
        description: 'Standard due date and reminder notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });

      // 2. Task Alarms (High urgency exact alarm alerts)
      await Notifications.setNotificationChannelAsync(TASK_ALARMS_CHANNEL_ID, {
        name: 'Task Alarms',
        description: 'High-urgency exact time alarms and alerts',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#FF3B30',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false, // Respect system DND controls
      });

      // 3. Ongoing Focus Timer (Low priority to stay quiet while counting down)
      await Notifications.setNotificationChannelAsync(FOCUS_TIMER_CHANNEL_ID, {
        name: 'Focus Timer',
        description: 'Ongoing background focus session timer',
        importance: Notifications.AndroidImportance.LOW,
        sound: undefined,
        enableVibrate: false,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // 4. Focus Session Completion (High urgency chime on session end)
      await Notifications.setNotificationChannelAsync(FOCUS_COMPLETION_CHANNEL_ID, {
        name: 'Focus Session Completed',
        description: 'Alerts when a Pomodoro focus or break session finishes',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#34C759',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // 5. Taskora Sync & Transfer status
      await Notifications.setNotificationChannelAsync(SYNC_STATUS_CHANNEL_ID, {
        name: 'Nearby Sync',
        description: 'Status updates during nearby device pairing and sync',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: undefined,
        enableVibrate: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      });

      this.isInitialized = true;
    } catch (e) {
      console.warn('[NotificationChannels] Channel initialization warning:', e);
    }
  }
}
