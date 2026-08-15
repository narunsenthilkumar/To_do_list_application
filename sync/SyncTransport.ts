import { SyncPayload, SyncOperation } from './types';
import { Encryption } from '../security/Encryption';
import { DeviceIdService } from './DeviceIdService';
import { SessionService } from '../auth/SessionService';

export class SyncTransport {
  /**
   * Serializes pending sync operations into a checksummed payload bundle
   */
  public static async createPayload(operations: SyncOperation[]): Promise<SyncPayload> {
    const deviceId = await DeviceIdService.getDeviceId();
    const deviceName = DeviceIdService.getDeviceName();
    const session = await SessionService.getActiveSession();
    const timestamp = new Date().toISOString();
    const batchId = `batch-${Encryption.generateUUID()}`;

    const rawPacket = {
      batchId,
      senderDeviceId: deviceId,
      senderDeviceName: deviceName,
      userId: session.userId,
      timestamp,
      operations,
    };

    const checksum = Encryption.computePayloadChecksum(rawPacket);

    return {
      ...rawPacket,
      checksum,
    };
  }

  /**
   * Validates and verifies an incoming sync payload
   */
  public static verifyPayload(payload: SyncPayload): boolean {
    if (!payload || !payload.batchId || !payload.operations || !payload.checksum) {
      return false;
    }

    const { checksum, ...rawPacket } = payload;
    const computed = Encryption.computePayloadChecksum(rawPacket);
    return computed === checksum;
  }

  /**
   * Encodes a payload to a compact shareable string for manual/QR/LAN transfer
   */
  public static encodeToString(payload: SyncPayload): string {
    return JSON.stringify(payload);
  }

  /**
   * Decodes and validates a payload string
   */
  public static decodeFromString(rawString: string): SyncPayload {
    try {
      const parsed = JSON.parse(rawString);
      if (!this.verifyPayload(parsed)) {
        throw new Error('Invalid checksum: Sync payload integrity verification failed.');
      }
      return parsed;
    } catch (e: any) {
      throw new Error(`Failed to decode sync packet: ${e.message}`);
    }
  }
}
