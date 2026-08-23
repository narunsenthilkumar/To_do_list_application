import { Platform } from 'react-native';
import { DeviceIdService } from '../DeviceIdService';
import { NearbyCapabilityResult } from './types';
import { PlatformType } from '../types';

export class NearbyCapability {
  /**
   * Detects the runtime platform and capabilities for Nearby Sync
   */
  public static async getCapabilities(): Promise<NearbyCapabilityResult> {
    try {
      const platform: PlatformType = DeviceIdService.getPlatformType();

      if (platform === 'web') {
        return {
          supported: false,
          bluetooth: false,
          motionSensors: false,
          nearbyTransport: false,
          platform: 'web',
          reason: 'Nearby Sync is not available in web browsers. Please use QR Code or JSON Sync.',
        };
      }

      if (platform === 'windows') {
        return {
          supported: false,
          bluetooth: false,
          motionSensors: false,
          nearbyTransport: false,
          platform: 'windows',
          reason: 'Nearby Sync is currently supported on mobile devices. Please use QR Code or JSON Sync on Windows.',
        };
      }

      // Android or iOS
      const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
      return {
        supported: isMobile,
        bluetooth: isMobile,
        motionSensors: isMobile,
        nearbyTransport: isMobile,
        platform,
      };
    } catch (e: any) {
      console.warn('[NearbyCapability] Error detecting capabilities:', e);
      return {
        supported: false,
        bluetooth: false,
        motionSensors: false,
        nearbyTransport: false,
        platform: 'web',
        reason: 'Failed to inspect platform capabilities.',
      };
    }
  }

  /**
   * Quick synchronous check for mobile platform
   */
  public static isMobilePlatform(): boolean {
    return Platform.OS === 'android' || Platform.OS === 'ios';
  }
}
