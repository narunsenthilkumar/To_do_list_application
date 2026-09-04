import { Platform, NativeModules } from 'react-native';
import { SyncPayload } from '../types';
import { NearbyDevice, NearbyTransferChunk } from './types';
import { BluetoothTransport } from './BluetoothTransport';
import { NearbyCapability } from './NearbyCapability';

export interface TransportConnection {
  deviceId: string;
  connectedAt: number;
  disconnect: () => Promise<void>;
}

export type NearbyTransportStatus = 'disconnected' | 'connecting' | 'connected' | 'transferring' | 'error';

export class NearbyTransport {
  private id: string = 'taskora-nearby-ble';
  private name: string = 'Taskora Nearby BLE Transport';
  private status: NearbyTransportStatus = 'disconnected';
  private currentConnection: TransportConnection | null = null;

  public async isAvailable(): Promise<boolean> {
    const caps = await NearbyCapability.getCapabilities();
    return caps.nearbyTransport;
  }

  public getStatus(): NearbyTransportStatus {
    return this.status;
  }

  public async connect(device: NearbyDevice): Promise<TransportConnection> {
    this.status = 'connecting';
    if (Platform.OS === 'android' && NativeModules.TaskoraBleModule?.connectToDevice) {
      try {
        await NativeModules.TaskoraBleModule.connectToDevice(device.deviceId);
      } catch (e) {
        console.warn('[NearbyTransport] Native BLE connect warning:', e);
      }
    }

    this.currentConnection = {
      deviceId: device.deviceId,
      connectedAt: Date.now(),
      disconnect: async () => {
        await this.disconnect();
      },
    };
    this.status = 'connected';
    return this.currentConnection;
  }

  public async disconnect(): Promise<void> {
    if (Platform.OS === 'android' && NativeModules.TaskoraBleModule?.disconnectDevice) {
      try {
        await NativeModules.TaskoraBleModule.disconnectDevice();
      } catch {}
    }
    this.currentConnection = null;
    this.status = 'disconnected';
  }

  public async sendHandshake(targetDeviceId: string, messageStr: string): Promise<boolean> {
    if (Platform.OS === 'android' && NativeModules.TaskoraBleModule?.sendHandshake) {
      try {
        await NativeModules.TaskoraBleModule.sendHandshake(targetDeviceId, messageStr);
        return true;
      } catch (e) {
        console.warn('[NearbyTransport] sendHandshake failed:', e);
        return false;
      }
    }
    return true;
  }

  public async sendChunks(chunks: NearbyTransferChunk[], targetDeviceId?: string): Promise<boolean> {
    this.status = 'transferring';
    const devId = targetDeviceId || this.currentConnection?.deviceId || '';

    if (Platform.OS === 'android' && NativeModules.TaskoraBleModule?.sendChunk && devId) {
      try {
        for (const chunk of chunks) {
          const chunkJson = JSON.stringify(chunk);
          await NativeModules.TaskoraBleModule.sendChunk(devId, chunkJson);
        }
      } catch (e) {
        console.warn('[NearbyTransport] sendChunks error:', e);
        this.status = 'error';
        return false;
      }
    }

    this.status = 'connected';
    return true;
  }
}

