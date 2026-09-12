import { Platform, PermissionsAndroid } from 'react-native';
import { PermissionDetails, PermissionState } from './types';

export class BluetoothPermission {
  static async check(): Promise<PermissionDetails> {
    const now = Date.now();

    if (Platform.OS === 'web' || (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron)) {
      return {
        type: 'bluetooth',
        state: 'UNAVAILABLE',
        canRequest: false,
        message: 'Bluetooth Nearby Sync is only supported on mobile devices',
        lastChecked: now,
      };
    }

    if (Platform.OS === 'android') {
      try {
        const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

        if (apiLevel >= 31) {
          const scanGranted = await PermissionsAndroid.check('android.permission.BLUETOOTH_SCAN' as any);
          const connectGranted = await PermissionsAndroid.check('android.permission.BLUETOOTH_CONNECT' as any);
          const advertiseGranted = await PermissionsAndroid.check('android.permission.BLUETOOTH_ADVERTISE' as any);

          if (scanGranted && connectGranted && advertiseGranted) {
            return {
              type: 'bluetooth',
              state: 'GRANTED',
              canRequest: false,
              message: 'Bluetooth nearby scanning allowed',
              lastChecked: now,
            };
          }

          return {
            type: 'bluetooth',
            state: 'DENIED',
            canRequest: true,
            message: 'Bluetooth permissions required for Nearby Sync',
            lastChecked: now,
          };
        } else {
          const locGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          return {
            type: 'bluetooth',
            state: locGranted ? 'GRANTED' : 'DENIED',
            canRequest: !locGranted,
            message: locGranted ? 'Location and BLE access allowed' : 'Location permission required for BLE scan on Android < 12',
            lastChecked: now,
          };
        }
      } catch {
        return {
          type: 'bluetooth',
          state: 'UNKNOWN',
          canRequest: true,
          lastChecked: now,
        };
      }
    }

    // iOS handles Bluetooth contextually via CoreBluetooth
    return {
      type: 'bluetooth',
      state: 'GRANTED',
      canRequest: false,
      message: 'Bluetooth ready for iOS',
      lastChecked: now,
    };
  }

  static async request(): Promise<PermissionDetails> {
    const now = Date.now();

    if (Platform.OS !== 'android') {
      return this.check();
    }

    try {
      const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

      if (apiLevel >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          'android.permission.BLUETOOTH_SCAN' as any,
          'android.permission.BLUETOOTH_CONNECT' as any,
          'android.permission.BLUETOOTH_ADVERTISE' as any,
        ]);

        const scan = results['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED;
        const conn = results['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED;
        const adv = results['android.permission.BLUETOOTH_ADVERTISE'] === PermissionsAndroid.RESULTS.GRANTED;

        if (scan && conn && adv) {
          return {
            type: 'bluetooth',
            state: 'GRANTED',
            canRequest: false,
            message: 'Bluetooth permissions granted',
            lastChecked: now,
          };
        }

        const neverAsk =
          results['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
          results['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

        return {
          type: 'bluetooth',
          state: neverAsk ? 'BLOCKED' : 'DENIED',
          canRequest: !neverAsk,
          message: 'Bluetooth permission denied by user',
          lastChecked: now,
        };
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Nearby Bluetooth Proximity',
            message: 'KIVENTA needs location access to discover nearby KIVENTA devices via Bluetooth.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          return {
            type: 'bluetooth',
            state: 'GRANTED',
            canRequest: false,
            lastChecked: now,
          };
        }

        return {
          type: 'bluetooth',
          state: result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'BLOCKED' : 'DENIED',
          canRequest: result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
          lastChecked: now,
        };
      }
    } catch {
      return {
        type: 'bluetooth',
        state: 'DENIED',
        canRequest: false,
        lastChecked: now,
      };
    }
  }
}
