import { NearbyTransferChunk, NearbyTransferMessage } from './types';
import { NearbySecurity } from './NearbySecurity';

export const BLE_MAX_CHUNK_SIZE = 512; // Standard safe BLE MTU chunk size

export class BluetoothTransport {
  /**
   * Splits a serialized string payload into sequentially numbered chunks
   */
  public static splitIntoChunks(payloadString: string, batchId: string, chunkSize: number = BLE_MAX_CHUNK_SIZE): NearbyTransferChunk[] {
    const totalChunks = Math.ceil(payloadString.length / chunkSize) || 1;
    const chunks: NearbyTransferChunk[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, payloadString.length);
      const data = payloadString.slice(start, end);
      const chunkChecksum = NearbySecurity.computeChunkChecksum(data, i, batchId);

      chunks.push({
        batchId,
        chunkIndex: i,
        totalChunks,
        chunkSize: data.length,
        data,
        chunkChecksum,
      });
    }

    return chunks;
  }

  /**
   * Reassembles chunks into the full serialized payload string, verifying ordering and checksums
   */
  public static reassembleChunks(chunks: NearbyTransferChunk[], batchId: string): { success: boolean; data?: string; error?: string } {
    if (!chunks || chunks.length === 0) {
      return { success: false, error: 'No chunks provided for reassembly.' };
    }

    const expectedTotal = chunks[0].totalChunks;
    if (chunks.length !== expectedTotal) {
      return {
        success: false,
        error: `Missing chunks: Received ${chunks.length} of ${expectedTotal} chunks.`,
      };
    }

    // Sort by chunkIndex
    const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Verify continuous indexing from 0 to totalChunks - 1
    for (let i = 0; i < expectedTotal; i++) {
      if (sorted[i].chunkIndex !== i) {
        return {
          success: false,
          error: `Invalid chunk sequence: Expected chunk index ${i}, found ${sorted[i].chunkIndex}.`,
        };
      }

      // Verify batchId consistency
      if (sorted[i].batchId !== batchId) {
        return {
          success: false,
          error: `Chunk batchId mismatch: Expected ${batchId}, found ${sorted[i].batchId}.`,
        };
      }

      // Verify chunk-level checksum
      const isIntegrityValid = NearbySecurity.verifyChunkIntegrity(
        sorted[i].data,
        sorted[i].chunkIndex,
        batchId,
        sorted[i].chunkChecksum
      );

      if (!isIntegrityValid) {
        return {
          success: false,
          error: `Tampered chunk detected at index ${i}. Integrity check failed.`,
        };
      }
    }

    const reassembled = sorted.map((c) => c.data).join('');
    return {
      success: true,
      data: reassembled,
    };
  }
}
