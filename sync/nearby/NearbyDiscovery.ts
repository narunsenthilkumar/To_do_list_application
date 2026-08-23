import { DeviceIdService } from '../DeviceIdService';
import { NearbyDevice, CURRENT_NEARBY_PROTOCOL_VERSION } from './types';
import { ProximityEstimator } from './ProximityEstimator';
import { NearbyCapability } from './NearbyCapability';

export const TASKORA_BLE_SERVICE_UUID = '0000FA50-0000-1000-8000-00805F9B34FB';
export const DEFAULT_SCAN_TIMEOUT_MS = 25000;

type DeviceDiscoveredCallback = (device: NearbyDevice) => void;
type DeviceUpdatedCallback = (device: NearbyDevice) => void;
type ScanTimeoutCallback = () => void;

export class NearbyDiscovery {
  private isScanning: boolean = false;
  private discoveredDevices: Map<string, NearbyDevice> = new Map();
  private proximityEstimators: Map<string, ProximityEstimator> = new Map();
  private scanTimeoutTimer: any = null;

  private onDiscoveredCallbacks: Set<DeviceDiscoveredCallback> = new Set();
  private onUpdatedCallbacks: Set<DeviceUpdatedCallback> = new Set();
  private onTimeoutCallbacks: Set<ScanTimeoutCallback> = new Set();

  /**
   * Starts BLE discovery for nearby Taskora devices
   */
  public async startScanning(timeoutMs: number = DEFAULT_SCAN_TIMEOUT_MS): Promise<boolean> {
    if (this.isScanning) return true;

    this.discoveredDevices.clear();
    this.proximityEstimators.clear();
    this.isScanning = true;

    // Set scan timeout
    if (this.scanTimeoutTimer) clearTimeout(this.scanTimeoutTimer);
    this.scanTimeoutTimer = setTimeout(() => {
      this.stopScanning();
      this.onTimeoutCallbacks.forEach((cb) => cb());
    }, timeoutMs);

    return true;
  }

  /**
   * Stops BLE discovery and clears timers
   */
  public stopScanning(): void {
    if (this.scanTimeoutTimer) {
      clearTimeout(this.scanTimeoutTimer);
      this.scanTimeoutTimer = null;
    }
    this.isScanning = false;
  }

  /**
   * Ingests a raw discovery beacon from BLE advertisement
   */
  public ingestDiscoveredDevice(raw: {
    deviceId: string;
    deviceName: string;
    platform: 'android' | 'windows' | 'web' | 'ios';
    rssi: number;
    protocolVersion?: number;
    capabilityFlags?: number;
    isSimulated?: boolean;
  }): NearbyDevice | null {
    if (!this.isScanning && !raw.isSimulated) return null;
    if (!raw.deviceId || !raw.deviceName) return null;

    let estimator = this.proximityEstimators.get(raw.deviceId);
    if (!estimator) {
      estimator = new ProximityEstimator();
      this.proximityEstimators.set(raw.deviceId, estimator);
    }

    const { smoothedRssi, proximity } = estimator.addSample(raw.rssi);
    const isNew = !this.discoveredDevices.has(raw.deviceId);

    const device: NearbyDevice = {
      deviceId: raw.deviceId,
      deviceName: raw.deviceName,
      platform: raw.platform,
      rssi: raw.rssi,
      smoothedRssi,
      proximity,
      lastSeen: Date.now(),
      protocolVersion: raw.protocolVersion ?? CURRENT_NEARBY_PROTOCOL_VERSION,
      capabilityFlags: raw.capabilityFlags ?? 0,
      isSimulated: raw.isSimulated ?? false,
    };

    this.discoveredDevices.set(raw.deviceId, device);

    if (isNew) {
      this.onDiscoveredCallbacks.forEach((cb) => cb(device));
    } else {
      this.onUpdatedCallbacks.forEach((cb) => cb(device));
    }

    return device;
  }

  public getDiscoveredDevices(): NearbyDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  public onDeviceDiscovered(callback: DeviceDiscoveredCallback): () => void {
    this.onDiscoveredCallbacks.add(callback);
    return () => this.onDiscoveredCallbacks.delete(callback);
  }

  public onDeviceUpdated(callback: DeviceUpdatedCallback): () => void {
    this.onUpdatedCallbacks.add(callback);
    return () => this.onUpdatedCallbacks.delete(callback);
  }

  public onScanTimeout(callback: ScanTimeoutCallback): () => void {
    this.onTimeoutCallbacks.add(callback);
    return () => this.onTimeoutCallbacks.delete(callback);
  }

  public getIsScanning(): boolean {
    return this.isScanning;
  }
}
