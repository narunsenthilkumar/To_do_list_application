import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Encryption } from '../security/Encryption';

export class DeviceIdService {
  private static readonly DEVICE_ID_KEY = '@taskora_device_id_v4';
  private static cachedDeviceId: string | null = null;

  /**
   * Retrieves or generates a persistent deviceId that remains stable across app restarts
   */
  public static async getDeviceId(): Promise<string> {
    if (this.cachedDeviceId) return this.cachedDeviceId;

    try {
      let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
      if (!deviceId) {
        const osPrefix = Platform.OS === 'android' ? 'android' : Platform.OS === 'windows' ? 'win' : 'device';
        deviceId = `${osPrefix}-${Encryption.generateUUID()}`;
        await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
      }
      this.cachedDeviceId = deviceId;
      return deviceId;
    } catch (e) {
      console.error('[DeviceIdService] Error getting deviceId:', e);
      return `fallback-${Date.now()}`;
    }
  }

  /**
   * Gets a human-readable device name based on platform and screen characteristics
   */
  public static getDeviceName(): string {
    if (Platform.OS === 'android') {
      return 'Android Device';
    }
    if (Platform.OS === 'windows') {
      return 'Windows Device';
    }
    if (Platform.OS === 'web') {
      return 'Web Browser / Desktop';
    }
    if (Platform.OS === 'ios') {
      return 'iOS Device';
    }
    return 'KIVENTA Device';
  }

  /**
   * Gets the platform identifier
   */
  public static getPlatformType(): 'android' | 'windows' | 'web' | 'ios' {
    if (Platform.OS === 'android') return 'android';
    if (Platform.OS === 'windows') return 'windows';
    if (Platform.OS === 'ios') return 'ios';
    return 'web';
  }
}
