import { Linking } from 'react-native';
import {
  PermissionType,
  PermissionState,
  PermissionDetails,
  PermissionStatusMap,
  PermissionChangeListener,
} from './types';
import { NotificationPermission } from './NotificationPermission';
import { BluetoothPermission } from './BluetoothPermission';
import { AlarmPermission } from './AlarmPermission';
import { MicrophonePermission } from './MicrophonePermission';

const DEFAULT_DETAILS = (type: PermissionType): PermissionDetails => ({
  type,
  state: 'UNKNOWN',
  canRequest: true,
  lastChecked: 0,
});

export class PermissionManager {
  private static statusMap: PermissionStatusMap = {
    notifications: DEFAULT_DETAILS('notifications'),
    bluetooth: DEFAULT_DETAILS('bluetooth'),
    microphone: DEFAULT_DETAILS('microphone'),
    alarms: DEFAULT_DETAILS('alarms'),
    nearby: DEFAULT_DETAILS('nearby'),
  };

  private static listeners: Set<PermissionChangeListener> = new Set();
  private static isInitialized = false;

  /**
   * Initializes the permission manager and performs initial permission checks
   */
  static async init(): Promise<PermissionStatusMap> {
    if (this.isInitialized) return this.statusMap;
    this.isInitialized = true;
    return await this.checkAll();
  }

  /**
   * Checks status of all permissions in parallel
   */
  static async checkAll(): Promise<PermissionStatusMap> {
    const [notif, ble, mic, alarms] = await Promise.all([
      NotificationPermission.check(),
      BluetoothPermission.check(),
      MicrophonePermission.check(),
      AlarmPermission.check(),
    ]);

    const nearbyState: PermissionState = ble.state === 'GRANTED' ? 'GRANTED' : ble.state;

    this.statusMap = {
      notifications: notif,
      bluetooth: ble,
      microphone: mic,
      alarms,
      nearby: {
        type: 'nearby',
        state: nearbyState,
        canRequest: ble.canRequest,
        message: nearbyState === 'GRANTED' ? 'Nearby Sync ready' : 'Bluetooth permission needed',
        lastChecked: Date.now(),
      },
    };

    this.notifyListeners();
    return this.statusMap;
  }

  /**
   * Checks a specific permission type
   */
  static async check(type: PermissionType): Promise<PermissionDetails> {
    let details: PermissionDetails;

    switch (type) {
      case 'notifications':
        details = await NotificationPermission.check();
        break;
      case 'bluetooth':
      case 'nearby':
        details = await BluetoothPermission.check();
        break;
      case 'microphone':
        details = await MicrophonePermission.check();
        break;
      case 'alarms':
        details = await AlarmPermission.check();
        break;
      default:
        details = DEFAULT_DETAILS(type);
    }

    this.statusMap[type] = details;
    this.notifyListeners();
    return details;
  }

  /**
   * Requests a specific permission
   */
  static async request(type: PermissionType): Promise<PermissionDetails> {
    let details: PermissionDetails;

    switch (type) {
      case 'notifications':
        details = await NotificationPermission.request();
        break;
      case 'bluetooth':
      case 'nearby':
        details = await BluetoothPermission.request();
        break;
      case 'microphone':
        details = await MicrophonePermission.request();
        break;
      case 'alarms':
        details = await AlarmPermission.request();
        break;
      default:
        details = DEFAULT_DETAILS(type);
    }

    this.statusMap[type] = details;
    this.notifyListeners();
    return details;
  }

  /**
   * Opens OS System Settings for the application
   */
  static async openSystemSettings(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.voice?.openSettings) {
        await (window as any).electronAPI.voice.openSettings();
        return;
      }
      await Linking.openSettings();
    } catch (e) {
      console.warn('[PermissionManager] Could not open system settings:', e);
    }
  }

  /**
   * Returns currently cached permission status map
   */
  static getStatus(): PermissionStatusMap {
    return this.statusMap;
  }

  /**
   * Subscribes to live permission status changes
   */
  static subscribe(listener: PermissionChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.statusMap);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach((l) => {
      try {
        l(this.statusMap);
      } catch (e) {
        console.warn('[PermissionManager] Listener warning:', e);
      }
    });
  }
}

export * from './types';
export { NotificationPermission, BluetoothPermission, AlarmPermission, MicrophonePermission };
