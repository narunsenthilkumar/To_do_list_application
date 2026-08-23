import { SyncPayload, SyncOperation } from '../types';
import { SyncEngine } from '../SyncEngine';
import { SyncTransport } from '../SyncTransport';
import { BluetoothTransport } from './BluetoothTransport';
import { NearbyTransferChunk, NearbySessionSummary } from './types';
import { DiagnosticsService } from '../../diagnostics/DiagnosticsService';

export class NearbyTransfer {
  /**
   * Generates outgoing payload and chunks for transfer
   */
  public static async prepareOutgoingPayload(): Promise<{
    payload: SyncPayload;
    chunks: NearbyTransferChunk[];
  }> {
    const payload = await SyncEngine.generateOutgoingPayload();
    const serialized = SyncTransport.encodeToString(payload);
    const chunks = BluetoothTransport.splitIntoChunks(serialized, payload.batchId);

    return { payload, chunks };
  }

  /**
   * Transactional receipt and merge of incoming SyncPayload:
   * Receive -> Validate -> Stage -> Merge -> Commit
   */
  public static async processIncomingPayload(
    payload: SyncPayload,
    peerDeviceName: string,
    startTime: number
  ): Promise<NearbySessionSummary> {
    DiagnosticsService.log('info', 'sync', 'nearby_sync_validate_started', { batchId: payload?.batchId });

    // Step 1: Structural & Checksum Validation
    if (!payload || typeof payload !== 'object') {
      throw new Error('MALFORMED_PAYLOAD: Payload is empty or not an object.');
    }

    if (!payload.batchId || !payload.senderDeviceId || !payload.operations || !payload.checksum) {
      throw new Error('MALFORMED_PAYLOAD: Required sync payload headers are missing.');
    }

    if (!Array.isArray(payload.operations)) {
      throw new Error('MALFORMED_PAYLOAD: Operations list is not an array.');
    }

    const isVerified = SyncTransport.verifyPayload(payload);
    if (!isVerified) {
      DiagnosticsService.log('error', 'sync', 'nearby_sync_checksum_failed', { batchId: payload.batchId });
      throw new Error('CHECKSUM_MISMATCH: Payload checksum verification failed. Packet may have been corrupted or tampered.');
    }

    // Step 2: Staging & Operation Integrity Checks
    for (const op of payload.operations) {
      if (!op.entityId || !op.entityType || !op.operationType) {
        throw new Error(`MALFORMED_OPERATION: Operation "${op.operationId || 'unknown'}" is missing required properties.`);
      }
    }

    // Step 3: Transactional Merge via authoritative SyncEngine
    DiagnosticsService.log('info', 'sync', 'nearby_sync_merge_started', { opCount: payload.operations.length });
    const mergeResult = await SyncEngine.applyIncomingPayload(payload);

    const durationMs = Date.now() - startTime;
    // Calculate concrete task and project counts from merged operations
    const tasksMerged = payload.operations.filter((op) => op.entityType === 'task').length || mergeResult.appliedCount;
    const projectsUpdated = payload.operations.filter((op) => op.entityType === 'project').length;

    const summary: NearbySessionSummary = {
      appliedCount: mergeResult.appliedCount,
      conflictsResolved: mergeResult.conflictsResolved,
      peerDeviceName: payload.senderDeviceName || peerDeviceName,
      peerDeviceId: payload.senderDeviceId,
      durationMs,
      timestamp: new Date().toISOString(),
      tasksMerged,
      projectsUpdated,
    };

    DiagnosticsService.log('info', 'sync', 'nearby_sync_completed', summary);
    return summary;
  }
}
