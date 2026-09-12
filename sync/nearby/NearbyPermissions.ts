import { Platform, PermissionsAndroid } from 'react-native';
import { NearbyPermissionStatus } from './types';
import { NearbyCapability } from './NearbyCapability';

export class NearbyPermissions {
  /**
   * Checks current permission status for Nearby Bluetooth Sync
   */
  public static async checkPermissions(): Promise<NearbyPermissionStatus> {
    if (!NearbyCapability.isMobilePlatform()) {
      return 'unavailable';
    }

    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version as number;

        if (apiLevel >= 31) {
          // Android 12+ requires BLUETOOTH_SCAN, BLUETOOTH_CONNECT, BLUETOOTH_ADVERTISE
          const scanGranted = await PermissionsAndroid.check(
            'android.permission.BLUETOOTH_SCAN' as any
          );
          const connectGranted = await PermissionsAndroid.check(
            'android.permission.BLUETOOTH_CONNECT' as any
          );

          if (scanGranted && connectGranted) {
            return 'granted';
          }
          return 'denied';
        } else {
          // Android < 12 requires Location for BLE scanning
          const locationGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          return locationGranted ? 'granted' : 'denied';
        }
      } catch (err) {
        console.warn('[NearbyPermissions] Error checking Android permissions:', err);
        return 'denied';
      }
    }

    // iOS handles permission prompts automatically on first CoreBluetooth invocation
    return 'granted';
  }

  /**
   * Requests necessary Bluetooth and Location permissions for Android
   */
  public static async requestPermissions(): Promise<NearbyPermissionStatus> {
    if (!NearbyCapability.isMobilePlatform()) {
      return 'unavailable';
    }

    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version as number;

        if (apiLevel >= 31) {
          const rawResults = await PermissionsAndroid.requestMultiple([
            'android.permission.BLUETOOTH_SCAN' as any,
            'android.permission.BLUETOOTH_CONNECT' as any,
            'android.permission.BLUETOOTH_ADVERTISE' as any,
          ]);
          const results = rawResults as Record<string, string>;

          const scanGranted =
            results['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED;
          const connectGranted =
            results['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED;

          if (scanGranted && connectGranted) {
            return 'granted';
          }

          const neverAsk =
            results['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
            results['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

          return neverAsk ? 'permanently_denied' : 'denied';
        } else {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Bluetooth Proximity Access',
              message: 'KIVENTA needs proximity access to find and sync with nearby KIVENTA devices.',
              buttonPositive: 'Allow',
              buttonNegative: 'Cancel',
            }
          );

          if (result === PermissionsAndroid.RESULTS.GRANTED) {
            return 'granted';
          } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            return 'permanently_denied';
          }
          return 'denied';
        }
      } catch (err) {
        console.warn('[NearbyPermissions] Error requesting Android permissions:', err);
        return 'denied';
      }
    }

    return 'granted';
  }
}
