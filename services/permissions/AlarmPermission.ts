import { Platform, NativeModules, Linking } from 'react-native';
import { StorageAdapter } from '../storage/storageAdapter';
import { PermissionDetails, PermissionState } from './types';

export class AlarmPermission {
  private static readonly PREF_KEY = '@taskora_exact_alarms_enabled';

  static async check(): Promise<PermissionDetails> {
    const now = Date.now();

    if (Platform.OS === 'web' || (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron)) {
      return {
        type: 'alarms',
        state: 'GRANTED',
        canRequest: false,
        message: 'Standard desktop timers enabled',
        lastChecked: now,
      };
    }

    if (Platform.OS === 'ios') {
      return {
        type: 'alarms',
        state: 'GRANTED',
        canRequest: false,
        message: 'iOS high-urgency notifications active',
        lastChecked: now,
      };
    }

    if (Platform.OS === 'android') {
      try {
        const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

        // If native module is available, check canScheduleExactAlarms()
        if (NativeModules.TaskoraAlarmModule?.canScheduleExactAlarms) {
          const canSchedule = await NativeModules.TaskoraAlarmModule.canScheduleExactAlarms();
          return {
            type: 'alarms',
            state: canSchedule ? 'GRANTED' : 'DENIED',
            canRequest: !canSchedule,
            message: canSchedule ? 'Exact alarms enabled' : 'Exact alarm permission required for precision alarms',
            lastChecked: now,
          };
        }

        // On Android 12+ without native module or in standard Expo
        if (apiLevel >= 31) {
          const stored = await StorageAdapter.getItem<boolean>(this.PREF_KEY);
          const isEnabled = stored ?? true;
          return {
            type: 'alarms',
            state: isEnabled ? 'GRANTED' : 'DENIED',
            canRequest: !isEnabled,
            message: isEnabled ? 'Exact alarms active' : 'Exact alarms disabled',
            lastChecked: now,
          };
        }

        // Android < 12 does not require exact alarm runtime permission
        return {
          type: 'alarms',
          state: 'GRANTED',
          canRequest: false,
          message: 'Exact alarms supported by platform',
          lastChecked: now,
        };
      } catch {
        return {
          type: 'alarms',
          state: 'GRANTED',
          canRequest: false,
          lastChecked: now,
        };
      }
    }

    return {
      type: 'alarms',
      state: 'UNAVAILABLE',
      canRequest: false,
      lastChecked: now,
    };
  }

  static async request(): Promise<PermissionDetails> {
    const now = Date.now();

    if (Platform.OS === 'android') {
      try {
        // If native module can launch ACTION_REQUEST_SCHEDULE_EXACT_ALARM
        if (NativeModules.TaskoraAlarmModule?.openExactAlarmSettings) {
          await NativeModules.TaskoraAlarmModule.openExactAlarmSettings();
        } else {
          await Linking.openSettings();
        }
      } catch {
        await Linking.openSettings().catch(() => {});
      }
    }

    await StorageAdapter.setItem(this.PREF_KEY, true);
    return await this.check();
  }
}
