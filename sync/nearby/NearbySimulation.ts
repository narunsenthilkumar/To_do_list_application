import { NearbyDevice, NearbySimulationScenario, CURRENT_NEARBY_PROTOCOL_VERSION } from './types';
import { SyncPayload, SyncOperation } from '../types';
import { Encryption } from '../../security/Encryption';

export class NearbySimulation {
  private static isSimulationActive: boolean = false;
  private static currentScenario: NearbySimulationScenario = 'SUCCESS_WITH_VERIFY';

  public static setSimulationActive(active: boolean): void {
    this.isSimulationActive = active;
  }

  public static isSimulation(): boolean {
    return this.isSimulationActive;
  }

  public static setScenario(scenario: NearbySimulationScenario): void {
    this.currentScenario = scenario;
  }

  public static getScenario(): NearbySimulationScenario {
    return this.currentScenario;
  }

  /**
   * Generates a simulated nearby Taskora device
   */
  public static createSimulatedDevice(): NearbyDevice {
    const isMismatch = this.currentScenario === 'PROTOCOL_MISMATCH';
    return {
      deviceId: 'taskora-sim-device-galaxy-s24',
      deviceName: 'Galaxy S24 Ultra (Simulated)',
      platform: 'android',
      rssi: -52,
      smoothedRssi: -52,
      proximity: 'VERY_NEAR',
      lastSeen: Date.now(),
      protocolVersion: isMismatch ? 999 : CURRENT_NEARBY_PROTOCOL_VERSION,
      capabilityFlags: 7,
      isSimulated: true,
    };
  }

  /**
   * Generates a simulated incoming SyncPayload for testing
   */
  public static createSimulatedPayload(peerDeviceId: string, peerDeviceName: string): SyncPayload {
    const timestamp = new Date().toISOString();
    const batchId = `sim-batch-${Encryption.generateUUID()}`;

    if (this.currentScenario === 'MALFORMED_PAYLOAD') {
      return {
        batchId: 'malformed',
        senderDeviceId: peerDeviceId,
        senderDeviceName: peerDeviceName,
        userId: 'sim-user',
        timestamp,
        operations: null as any,
        checksum: 'corrupted-checksum',
      };
    }

    const operations: SyncOperation[] = [
      {
        operationId: `op-${Encryption.generateUUID()}`,
        userId: 'sim-user',
        deviceId: peerDeviceId,
        entityId: `task-sim-${Date.now()}-1`,
        entityType: 'task',
        operationType: 'CREATE',
        timestamp,
        version: 1,
        lamportClock: 12,
        payload: {
          id: `task-sim-${Date.now()}-1`,
          title: 'Review Nearby Sync specifications',
          description: 'Synced locally via Taskora Nearby Bump-to-Share protocol',
          status: 'pending',
          priority: 'high',
          category: 'Work',
          createdAt: timestamp,
          updatedAt: timestamp,
          completed: false,
          subtasks: [],
          tags: ['nearby', 'sync'],
        },
      },
      {
        operationId: `op-${Encryption.generateUUID()}`,
        userId: 'sim-user',
        deviceId: peerDeviceId,
        entityId: `task-sim-${Date.now()}-2`,
        entityType: 'task',
        operationType: 'CREATE',
        timestamp,
        version: 1,
        lamportClock: 13,
        payload: {
          id: `task-sim-${Date.now()}-2`,
          title: 'Prepare Taskora cross-device demo',
          description: 'Verify local-first CRDT merge without network dependency',
          status: 'pending',
          priority: 'medium',
          category: 'Personal',
          createdAt: timestamp,
          updatedAt: timestamp,
          completed: false,
          subtasks: [],
          tags: ['demo'],
        },
      },
    ];

    const rawPacket = {
      batchId,
      senderDeviceId: peerDeviceId,
      senderDeviceName: peerDeviceName,
      userId: 'sim-user',
      timestamp,
      operations,
    };

    const checksum = Encryption.computePayloadChecksum(rawPacket);

    return {
      ...rawPacket,
      checksum,
    };
  }
}
