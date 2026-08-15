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

type SyncStatusListener = (status: SyncStatus) => void;

export class SyncEngine {
  private static status: SyncStatus = 'synced';
  private static listeners: Set<SyncStatusListener> = new Set();
  private static lastSyncTime: string | null = null;

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

  private static setStatus(newStatus: SyncStatus): void {
    this.status = newStatus;
    this.listeners.forEach((l) => l(newStatus));
  }

  /**
   * Generates outgoing sync payload containing all pending local mutations
   */
  public static async generateOutgoingPayload(): Promise<SyncPayload> {
    const pendingOps = await SyncQueue.getPendingOperations();
    return await SyncTransport.createPayload(pendingOps);
  }

  /**
   * Applies an incoming SyncPayload from a paired device with deterministic conflict resolution
   */
  public static async applyIncomingPayload(payload: SyncPayload): Promise<{ appliedCount: number; conflictsResolved: number }> {
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

      let appliedCount = 0;
      let conflictsResolved = 0;

      // Authorize sender in pairing registry
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
        // Advance local Lamport logical clock with incoming version
        await LamportClock.witness(op.version);

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
                  op.deviceId
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
              const allProjects = await LocalDatabase.getAllProjects();
              const localProj = allProjects.find((p) => p.id === op.entityId);
              if (!localProj) {
                await LocalDatabase.applyRemoteProject(op.payload as Project);
                appliedCount++;
              } else {
                const resolution = ConflictResolver.resolveProjectConflict(
                  localProj,
                  op.payload as Project,
                  op.deviceId
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
            const isTombstoned = await TombstoneService.isDeleted(op.entityId);
            if (!isTombstoned) {
              const allTags = await LocalDatabase.getAllTags();
              const localTag = allTags.find((t) => t.id === op.entityId);
              if (!localTag) {
                await LocalDatabase.applyRemoteTag(op.payload as Tag);
                appliedCount++;
              } else {
                const resolved = ConflictResolver.resolveTagConflict(
                  localTag,
                  op.payload as Tag,
                  op.deviceId
                );
                await LocalDatabase.applyRemoteTag(resolved);
                appliedCount++;
              }
            }
          }
        }
      }

      await DevicePairing.recordSyncTime(payload.senderDeviceId);
      this.lastSyncTime = new Date().toISOString();
      this.setStatus(conflictsResolved > 0 ? 'conflict' : 'synced');

      return { appliedCount, conflictsResolved };
    } catch (e) {
      console.error('[SyncEngine] Error applying payload:', e);
      this.setStatus('error');
      throw e;
    }
  }

  /**
   * Executes local sync now routine
   */
  public static async syncNow(): Promise<{ pendingCount: number; lastSync: string }> {
    this.setStatus('syncing');
    try {
      const pendingOps = await SyncQueue.getPendingOperations();
      const now = new Date().toISOString();
      this.lastSyncTime = now;
      this.setStatus('synced');
      return { pendingCount: pendingOps.length, lastSync: now };
    } catch (e) {
      this.setStatus('error');
      throw e;
    }
  }
}
