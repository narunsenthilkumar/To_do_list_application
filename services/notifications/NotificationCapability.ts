import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { StorageAdapter } from '../storage/storageAdapter';

export type NotificationCapabilityLevel =
  | 'SUPPORTED'            // Full live/ongoing notifications, channels, exact alarms
  | 'PARTIAL'              // Standard notifications with basic actions
  | 'STANDARD_NOTIFICATION'// Basic notifications without custom interactive actions
  | 'UNSUPPORTED';         // No notification runtime available

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'blocked';

export interface DeviceNotificationProfile {
  capabilityLevel: NotificationCapabilityLevel;
  hasExactAlarmPermission: boolean;
  hasNotificationPermission: boolean;
  supportsOngoingNotification: boolean;
  supportsAlarmChannel: boolean;
  platform: string;
}

export class NotificationCapability {
  private static readonly EXACT_ALARM_KEY = '@taskora_exact_alarm_permission';

  /**
   * Evaluates device notification capability
   */
  static async getCapabilityProfile(): Promise<DeviceNotificationProfile> {
    const platform = Platform.OS;

    // 1. Electron Desktop
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      return {
        capabilityLevel: 'SUPPORTED',
        hasExactAlarmPermission: true,
        hasNotificationPermission: true,
        supportsOngoingNotification: false,
        supportsAlarmChannel: true,
        platform: 'electron',
      };
    }

    // 2. Web Browser
    if (platform === 'web') {
      const hasWebNotif = typeof window !== 'undefined' && 'Notification' in window;
      const isGranted = hasWebNotif && Notification.permission === 'granted';
      return {
        capabilityLevel: hasWebNotif ? (isGranted ? 'SUPPORTED' : 'PARTIAL') : 'UNSUPPORTED',
        hasExactAlarmPermission: true,
        hasNotificationPermission: isGranted,
        supportsOngoingNotification: false,
        supportsAlarmChannel: false,
        platform: 'web',
      };
    }

    // 3. Android Mobile
    if (platform === 'android') {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        const hasPerm = status === 'granted';
        const exactAlarmStored = await StorageAdapter.getItem<boolean>(this.EXACT_ALARM_KEY);

        return {
          capabilityLevel: 'SUPPORTED',
          hasExactAlarmPermission: exactAlarmStored ?? true,
          hasNotificationPermission: hasPerm,
          supportsOngoingNotification: true,
          supportsAlarmChannel: true,
          platform: 'android',
        };
      } catch (e) {
        console.warn('[NotificationCapability] Error querying Android capabilities:', e);
        return {
          capabilityLevel: 'STANDARD_NOTIFICATION',
          hasExactAlarmPermission: false,
          hasNotificationPermission: false,
          supportsOngoingNotification: true,
          supportsAlarmChannel: true,
          platform: 'android',
        };
      }
    }

    // 4. iOS Mobile
    if (platform === 'ios') {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        return {
          capabilityLevel: 'PARTIAL',
          hasExactAlarmPermission: true,
          hasNotificationPermission: status === 'granted',
          supportsOngoingNotification: false,
          supportsAlarmChannel: false,
          platform: 'ios',
        };
      } catch {
        return {
          capabilityLevel: 'STANDARD_NOTIFICATION',
          hasExactAlarmPermission: true,
          hasNotificationPermission: false,
          supportsOngoingNotification: false,
          supportsAlarmChannel: false,
          platform: 'ios',
        };
      }
    }

    return {
      capabilityLevel: 'UNSUPPORTED',
      hasExactAlarmPermission: false,
      hasNotificationPermission: false,
      supportsOngoingNotification: false,
      supportsAlarmChannel: false,
      platform,
    };
  }

  /**
   * Checks current notification permission
   */
  static async checkPermission(): Promise<PermissionState> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      return 'granted';
    }

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'blocked';
      return 'undetermined';
    }

    try {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      if (status === 'granted') return 'granted';
      if (!canAskAgain && status === 'denied') return 'blocked';
      if (status === 'denied') return 'denied';
      return 'undetermined';
    } catch {
      return 'undetermined';
    }
  }

  /**
   * Contextually requests notification permission
   */
  static async requestPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      return true;
    }

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const res = await Notification.requestPermission();
          return res === 'granted';
        } catch {
          return false;
        }
      }
      return false;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('[NotificationCapability] Request permission error:', e);
      return false;
    }
  }

  /**
   * Sets exact alarm preference flag
   */
  static async setExactAlarmPermissionGranted(granted: boolean): Promise<void> {
    await StorageAdapter.setItem(this.EXACT_ALARM_KEY, granted);
  }

  /**
   * Opens OS settings if permission is blocked
   */
  static async openSystemSettings(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.voice?.openSettings) {
      try {
        await (window as any).electronAPI.voice.openSettings();
        return;
      } catch {}
    }

    // Mobile Expo settings
    try {
      const { Linking } = require('react-native');
      await Linking.openSettings();
    } catch (e) {
      console.warn('[NotificationCapability] Could not open system settings:', e);
    }
  }
}
