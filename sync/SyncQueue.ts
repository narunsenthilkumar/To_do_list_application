import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncOperation, SyncEntityType, SyncOperationType } from './types';
import { Encryption } from '../security/Encryption';
import { LamportClock } from './LamportClock';
import { DeviceIdService } from './DeviceIdService';
import { SessionService } from '../auth/SessionService';

export class SyncQueue {
  private static readonly QUEUE_STORAGE_KEY = '@taskora_sync_queue_v4';

  /**
   * Retrieves all pending operations in the sync queue
   */
  public static async getPendingOperations(): Promise<SyncOperation[]> {
    try {
      const raw = await AsyncStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('[SyncQueue] Error loading pending operations:', e);
      return [];
    }
  }

  /**
   * Saves pending operations to storage
   */
  private static async saveQueue(queue: SyncOperation[]): Promise<void> {
    await AsyncStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(queue));
  }

  /**
   * Enqueues a new sync mutation operation
   */
  public static async enqueue(
    entityId: string,
    entityType: SyncEntityType,
    operationType: SyncOperationType,
    payload: Record<string, any>
  ): Promise<SyncOperation> {
    const queue = await this.getPendingOperations();
    const version = await LamportClock.tick();
    const deviceId = await DeviceIdService.getDeviceId();
    const session = await SessionService.getActiveSession();

    const op: SyncOperation = {
      operationId: `op-${Encryption.generateUUID()}`,
      userId: session.userId,
      deviceId,
      entityId,
      entityType,
      operationType,
      timestamp: new Date().toISOString(),
      version,
      payload,
    };

    queue.push(op);
    await this.saveQueue(queue);
    return op;
  }

  /**
   * Acknowledges and removes processed operations from the queue
   */
  public static async acknowledgeOperations(operationIds: string[]): Promise<void> {
    if (!operationIds || operationIds.length === 0) return;
    const queue = await this.getPendingOperations();
    const idSet = new Set(operationIds);
    const updated = queue.filter((op) => !idSet.has(op.operationId));
    await this.saveQueue(updated);
  }

  /**
   * Clears the entire sync queue
   */
  public static async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(this.QUEUE_STORAGE_KEY);
  }

  /**
   * Gets current count of pending changes
   */
  public static async getPendingCount(): Promise<number> {
    const queue = await this.getPendingOperations();
    return queue.length;
  }
}
