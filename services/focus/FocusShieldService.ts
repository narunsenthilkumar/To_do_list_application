import { Platform, NativeModules } from 'react-native';
import { FocusShieldSettings, DEFAULT_FOCUS_SHIELD_SETTINGS } from '../../models/focus';

export interface InstalledAppInfo {
  packageName: string;
  appName: string;
}

export class FocusShieldService {
  /**
   * Checks if Android Accessibility Service is enabled for Taskora Focus Shield
   */
  static async isAccessibilityServiceEnabled(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      if (NativeModules.TaskoraFocusShieldModule?.isAccessibilityServiceEnabled) {
        return await NativeModules.TaskoraFocusShieldModule.isAccessibilityServiceEnabled();
      }
    } catch (e) {
      console.warn('[FocusShieldService] Check accessibility error:', e);
    }
    return false;
  }

  /**
   * Opens Android Accessibility System Settings screen
   */
  static async openAccessibilitySettings(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      if (NativeModules.TaskoraFocusShieldModule?.openAccessibilitySettings) {
        return await NativeModules.TaskoraFocusShieldModule.openAccessibilitySettings();
      }
    } catch (e) {
      console.warn('[FocusShieldService] Open accessibility settings error:', e);
    }
    return false;
  }

  /**
   * Checks if Notification Policy Access (DND access) is granted
   */
  static async isDndAccessGranted(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (NativeModules.TaskoraFocusShieldModule?.isDndAccessGranted) {
        return await NativeModules.TaskoraFocusShieldModule.isDndAccessGranted();
      }
    } catch (e) {
      console.warn('[FocusShieldService] Check DND access error:', e);
    }
    return true;
  }

  /**
   * Opens Android DND Notification Policy Access Settings screen
   */
  static async openDndSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      if (NativeModules.TaskoraFocusShieldModule?.openDndSettings) {
        return await NativeModules.TaskoraFocusShieldModule.openDndSettings();
      }
    } catch (e) {
      console.warn('[FocusShieldService] Open DND settings error:', e);
    }
    return false;
  }

  /**
   * Queries list of installed launcher apps from Android package manager
   */
  static async fetchInstalledApps(): Promise<InstalledAppInfo[]> {
    if (Platform.OS !== 'android') {
      return [
        { packageName: 'com.instagram.android', appName: 'Instagram' },
        { packageName: 'com.google.android.youtube', appName: 'YouTube' },
        { packageName: 'com.facebook.katana', appName: 'Facebook' },
        { packageName: 'com.twitter.android', appName: 'X / Twitter' },
        { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok' },
        { packageName: 'com.android.chrome', appName: 'Google Chrome' },
        { packageName: 'com.reddit.frontpage', appName: 'Reddit' },
      ];
    }

    try {
      if (NativeModules.TaskoraFocusShieldModule?.getInstalledApps) {
        const apps = await NativeModules.TaskoraFocusShieldModule.getInstalledApps();
        return apps.sort((a: InstalledAppInfo, b: InstalledAppInfo) => a.appName.localeCompare(b.appName));
      }
    } catch (e) {
      console.warn('[FocusShieldService] Fetch installed apps error:', e);
    }

    return [];
  }

  /**
   * Synchronizes shield settings configuration to native Android SharedPreferences
   */
  static async syncShieldConfig(settings: FocusShieldSettings): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (NativeModules.TaskoraFocusShieldModule?.updateShieldConfig) {
        return await NativeModules.TaskoraFocusShieldModule.updateShieldConfig(settings);
      }
    } catch (e) {
      console.warn('[FocusShieldService] Sync config error:', e);
    }
    return false;
  }

  /**
   * Activates Focus Shield session for specified duration / end time
   */
  static async activateShield(endTimeEpochMs: number): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (NativeModules.TaskoraFocusShieldModule?.startFocusShield) {
        return await NativeModules.TaskoraFocusShieldModule.startFocusShield(endTimeEpochMs);
      }
    } catch (e) {
      console.warn('[FocusShieldService] Activate shield error:', e);
    }
    return false;
  }

  /**
   * Deactivates Focus Shield session and restores system DND state
   */
  static async deactivateShield(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (NativeModules.TaskoraFocusShieldModule?.stopFocusShield) {
        return await NativeModules.TaskoraFocusShieldModule.stopFocusShield();
      }
    } catch (e) {
      console.warn('[FocusShieldService] Deactivate shield error:', e);
    }
    return false;
  }

  /**
   * Temporarily unlocks blocked apps for specified duration in minutes
   */
  static async setEmergencyUnlock(durationMinutes: number = 5): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (NativeModules.TaskoraFocusShieldModule?.setEmergencyUnlock) {
        return await NativeModules.TaskoraFocusShieldModule.setEmergencyUnlock(durationMinutes);
      }
    } catch (e) {
      console.warn('[FocusShieldService] Emergency unlock error:', e);
    }
    return false;
  }
}
