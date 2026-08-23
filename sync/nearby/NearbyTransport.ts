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
    // Simulate or establish BLE connection
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
    this.currentConnection = null;
    this.status = 'disconnected';
  }

  public async sendChunks(chunks: NearbyTransferChunk[]): Promise<boolean> {
    this.status = 'transferring';
    // Send chunk stream
    this.status = 'connected';
    return true;
  }
}
