import AsyncStorage from '@react-native-async-storage/async-storage';
import { DevicePairingInfo, PairingCodePayload } from './types';
import { DeviceIdService } from './DeviceIdService';
import { SessionService } from '../auth/SessionService';

export class DevicePairing {
  private static readonly PAIRED_DEVICES_KEY = '@taskora_paired_devices_v4';
  private static readonly ACTIVE_PAIRING_CODE_KEY = '@taskora_active_pairing_code_v4';

  /**
   * Loads all authorized paired devices
   */
  public static async getPairedDevices(): Promise<DevicePairingInfo[]> {
    try {
      const raw = await AsyncStorage.getItem(this.PAIRED_DEVICES_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('[DevicePairing] Error loading paired devices:', e);
      return [];
    }
  }

  /**
   * Saves paired devices list
   */
  private static async savePairedDevices(devices: DevicePairingInfo[]): Promise<void> {
    await AsyncStorage.setItem(this.PAIRED_DEVICES_KEY, JSON.stringify(devices));
  }

  /**
   * Generates a temporary 6-digit pairing code valid for 10 minutes
   */
  public static async generatePairingCode(): Promise<PairingCodePayload> {
    const rawNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedCode = `${rawNumber.substring(0, 3)}-${rawNumber.substring(3, 6)}`;
    const deviceId = await DeviceIdService.getDeviceId();
    const deviceName = DeviceIdService.getDeviceName();
    const session = await SessionService.getActiveSession();

    const payload: PairingCodePayload = {
      code: formattedCode,
      deviceId,
      deviceName,
      userId: session.userId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    await AsyncStorage.setItem(this.ACTIVE_PAIRING_CODE_KEY, JSON.stringify(payload));
    return payload;
  }

  /**
   * Authorizes a newly paired device
   */
  public static async authorizeDevice(device: Omit<DevicePairingInfo, 'pairedAt' | 'authorized'>): Promise<DevicePairingInfo> {
    const devices = await this.getPairedDevices();
    const existingIndex = devices.findIndex((d) => d.deviceId === device.deviceId);

    const pairedInfo: DevicePairingInfo = {
      ...device,
      pairedAt: new Date().toISOString(),
      authorized: true,
      lastSyncedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      devices[existingIndex] = pairedInfo;
    } else {
      devices.push(pairedInfo);
    }

    await this.savePairedDevices(devices);
    return pairedInfo;
  }

  /**
   * Updates last synced timestamp for a device
   */
  public static async recordSyncTime(deviceId: string): Promise<void> {
    const devices = await this.getPairedDevices();
    const device = devices.find((d) => d.deviceId === deviceId);
    if (device) {
      device.lastSyncedAt = new Date().toISOString();
      await this.savePairedDevices(devices);
    }
  }

  /**
   * Revokes and removes a paired device
   */
  public static async removeDevice(deviceId: string): Promise<void> {
    const devices = await this.getPairedDevices();
    const filtered = devices.filter((d) => d.deviceId !== deviceId);
    await this.savePairedDevices(filtered);
  }

  /**
   * Checks if a device is currently authorized
   */
  public static async isDeviceAuthorized(deviceId: string): Promise<boolean> {
    const devices = await this.getPairedDevices();
    const match = devices.find((d) => d.deviceId === deviceId);
    return !!match && match.authorized;
  }
}
