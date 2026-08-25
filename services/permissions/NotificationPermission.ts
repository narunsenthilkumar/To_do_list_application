import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PermissionDetails, PermissionState } from './types';

export class NotificationPermission {
  static async check(): Promise<PermissionDetails> {
    const now = Date.now();

    // 1. Electron Desktop
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      return {
        type: 'notifications',
        state: 'GRANTED',
        canRequest: false,
        message: 'Desktop notifications enabled',
        lastChecked: now,
      };
    }

    // 2. Web Browser
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return {
          type: 'notifications',
          state: 'UNAVAILABLE',
          canRequest: false,
          message: 'Notifications not supported in this browser environment',
          lastChecked: now,
        };
      }
      if (Notification.permission === 'granted') {
        return {
          type: 'notifications',
          state: 'GRANTED',
          canRequest: false,
          message: 'Browser notifications allowed',
          lastChecked: now,
        };
      }
      if (Notification.permission === 'denied') {
        return {
          type: 'notifications',
          state: 'BLOCKED',
          canRequest: false,
          message: 'Notifications blocked by browser settings',
          lastChecked: now,
        };
      }
      return {
        type: 'notifications',
        state: 'UNKNOWN',
        canRequest: true,
        message: 'Notification permission not yet requested',
        lastChecked: now,
      };
    }

    // 3. Android & iOS Native
    try {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      let state: PermissionState = 'UNKNOWN';
      if (status === 'granted') state = 'GRANTED';
      else if (!canAskAgain && status === 'denied') state = 'BLOCKED';
      else if (status === 'denied') state = 'DENIED';

      return {
        type: 'notifications',
        state,
        canRequest: canAskAgain,
        message: state === 'GRANTED' ? 'Notifications allowed' : 'Notifications disabled',
        lastChecked: now,
      };
    } catch {
      return {
        type: 'notifications',
        state: 'UNKNOWN',
        canRequest: true,
        lastChecked: now,
      };
    }
  }

  static async request(): Promise<PermissionDetails> {
    const now = Date.now();

    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      return {
        type: 'notifications',
        state: 'GRANTED',
        canRequest: false,
        lastChecked: now,
      };
    }

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const res = await Notification.requestPermission();
          return {
            type: 'notifications',
            state: res === 'granted' ? 'GRANTED' : res === 'denied' ? 'BLOCKED' : 'DENIED',
            canRequest: res === 'default',
            lastChecked: now,
          };
        } catch {
          return {
            type: 'notifications',
            state: 'DENIED',
            canRequest: false,
            lastChecked: now,
          };
        }
      }
    }

    try {
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      const state: PermissionState = status === 'granted' ? 'GRANTED' : canAskAgain ? 'DENIED' : 'BLOCKED';
      return {
        type: 'notifications',
        state,
        canRequest: canAskAgain,
        lastChecked: now,
      };
    } catch {
      return {
        type: 'notifications',
        state: 'DENIED',
        canRequest: false,
        lastChecked: now,
      };
    }
  }
}
