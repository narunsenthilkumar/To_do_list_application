import { SyncStatus, SyncPayload, SyncOperation } from './types';
import { SyncQueue } from './SyncQueue';
import { SyncTransport } from './SyncTransport';
import { LocalDatabase } from '../data/database/LocalDatabase';
import { ConflictResolver } from './ConflictResolver';
import { TombstoneService } from './TombstoneService';
import { LamportClock } from './LamportClock';
import { DevicePairing } from './DevicePairing';
import { DeviceIdService } from './DeviceIdService';
import { Task } from '../models/task';
import { Project } from '../models/project';
import { Tag } from '../models/tag';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SyncStatusListener = (status: SyncStatus) => void;

export class SyncEngine {
  private static status: SyncStatus = 'synced';
  private static listeners: Set<SyncStatusListener> = new Set();
  private static lastSyncTime: string | null = null;
  private static readonly APPLIED_OPS_KEY = '@taskora_applied_operations_v4';

  public static getStatus(): SyncStatus {
    return this.status;
  }

  public static getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }

  public static addStatusListener(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public static setStatus(newStatus: SyncStatus): void {
    this.status = newStatus;
    this.listeners.forEach((l) => l(newStatus));
  }

  /**
   * Loads the set of already applied operation IDs for idempotency
   */
  private static async getAppliedOperationIds(): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(this.APPLIED_OPS_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  /**
   * Saves applied operation IDs
   */
  private static async markOperationsApplied(opIds: string[]): Promise<void> {
    try {
      const set = await this.getAppliedOperationIds();
      opIds.forEach((id) => set.add(id));
      // Keep last 1000 operation IDs to prevent unbounded storage growth
      const trimmed = Array.from(set).slice(-1000);
      await AsyncStorage.setItem(this.APPLIED_OPS_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('[SyncEngine] Error saving applied op IDs:', e);
    }
  }

  /**
   * Generates outgoing sync payload containing all pending local mutations
   */
  public static async generateOutgoingPayload(): Promise<SyncPayload> {
    const pendingOps = await SyncQueue.getPendingOperations();
    return await SyncTransport.createPayload(pendingOps);
  }

  /**
   * Applies an incoming SyncPayload from a paired device with deterministic conflict resolution & revocation checking
   */
  public static async applyIncomingPayload(
    payload: SyncPayload
  ): Promise<{ appliedCount: number; conflictsResolved: number; rejectedRevoked?: boolean }> {
    this.setStatus('syncing');

    try {
      if (!SyncTransport.verifyPayload(payload)) {
        this.setStatus('error');
        throw new Error('Sync packet verification failed: Checksum mismatch or corrupted data.');
      }

      const myDeviceId = await DeviceIdService.getDeviceId();
      if (payload.senderDeviceId === myDeviceId) {
        // Ignore echo of own packet
        this.setStatus('synced');
        return { appliedCount: 0, conflictsResolved: 0 };
      }

      // Check if the sender device has been revoked
      const isRevoked = await DevicePairing.isDeviceRevoked(payload.senderDeviceId);
      if (isRevoked) {
        this.setStatus('error');
        throw new Error(
          `DEVICE_REVOKED: Device "${payload.senderDeviceName}" (${payload.senderDeviceId}) is revoked and cannot sync.`
        );
      }

      let appliedCount = 0;
      let conflictsResolved = 0;
      const appliedOpIds: string[] = [];
      const existingAppliedOps = await this.getAppliedOperationIds();

      // Ensure sender device is in authorized list
      await DevicePairing.authorizeDevice({
        deviceId: payload.senderDeviceId,
        deviceName: payload.senderDeviceName,
        platform: payload.senderDeviceId.startsWith('win')
          ? 'windows'
          : payload.senderDeviceId.startsWith('android')
          ? 'android'
          : 'web',
      });

      for (const op of payload.operations) {
        // Idempotency: skip if already applied
        if (op.operationId && existingAppliedOps.has(op.operationId)) {
          continue;
        }

        // Advance local Lamport logical clock with incoming version
        if (op.lamportClock || op.version) {
          await LamportClock.witness(op.lamportClock || op.version);
        }

        if (op.entityType === 'task') {
          if (op.operationType === 'DELETE') {
            await LocalDatabase.deleteTask(op.entityId);
            appliedCount++;
          } else {
            const isTombstoned = await TombstoneService.isDeleted(op.entityId);
            if (!isTombstoned) {
              const localTask = await LocalDatabase.getTaskById(op.entityId);
              if (!localTask) {
                await LocalDatabase.applyRemoteTask(op.payload as Task);
                appliedCount++;
              } else {
                const resolution = ConflictResolver.resolveTaskConflict(
                  localTask,
                  op.payload as Task,
                  payload.senderDeviceId
                );
                await LocalDatabase.applyRemoteTask(resolution.resolved);
                appliedCount++;
                if (resolution.hasConflict) conflictsResolved++;
              }
            }
          }
        } else if (op.entityType === 'project') {
          if (op.operationType === 'DELETE') {
            await LocalDatabase.deleteProject(op.entityId);
            appliedCount++;
          } else {
            const isTombstoned = await TombstoneService.isDeleted(op.entityId);
            if (!isTombstoned) {
              const localProj = await LocalDatabase.getProjectById(op.entityId);
              if (!localProj) {
                await LocalDatabase.applyRemoteProject(op.payload as Project);
                appliedCount++;
              } else {
                const resolution = ConflictResolver.resolveProjectConflict(
                  localProj,
                  op.payload as Project,
                  payload.senderDeviceId
                );
                await LocalDatabase.applyRemoteProject(resolution.resolved);
                appliedCount++;
                if (resolution.hasConflict) conflictsResolved++;
              }
            }
          }
        } else if (op.entityType === 'tag') {
          if (op.operationType === 'DELETE') {
            await LocalDatabase.deleteTag(op.entityId);
            appliedCount++;
          } else {
            await LocalDatabase.applyRemoteTag(op.payload as Tag);
            appliedCount++;
          }
        }

        if (op.operationId) {
          appliedOpIds.push(op.operationId);
        }
      }

      await this.markOperationsApplied(appliedOpIds);
      await DevicePairing.recordSyncTime(payload.senderDeviceId);

      this.lastSyncTime = new Date().toISOString();
      this.setStatus('synced');

      return { appliedCount, conflictsResolved };
    } catch (e) {
      console.error('[SyncEngine] Error applying payload:', e);
      throw e;
    }
  }

  /**
   * Triggers a manual sync pass
   */
  public static async syncNow(): Promise<{ pendingCount: number; lastSync: string }> {
    this.setStatus('syncing');

    try {
      const myDeviceId = await DeviceIdService.getDeviceId();
      const isRevoked = await DevicePairing.isDeviceRevoked(myDeviceId);

      if (isRevoked) {
        this.setStatus('device_revoked');
        throw new Error('DEVICE_REVOKED: This installation has been disconnected/revoked.');
      }

      const pending = await SyncQueue.getPendingOperations();
      this.lastSyncTime = new Date().toISOString();
      this.setStatus('synced');

      return {
        pendingCount: pending.length,
        lastSync: this.lastSyncTime,
      };
    } catch (e: any) {
      if (e.message?.includes('DEVICE_REVOKED')) {
        this.setStatus('device_revoked');
      } else {
        this.setStatus('error');
      }
      throw e;
    }
  }
}
