import * as Crypto from 'expo-crypto';
import { Encryption } from '../../security/Encryption';

export class NearbySecurity {
  /**
   * Generates a cryptographically strong 6-digit verification code
   * Formatted e.g. "483 921"
   */
  public static generateVerificationCode(): { raw: string; formatted: string } {
    const bytes = new Uint8Array(4);
    Crypto.getRandomValues(bytes);
    // Convert 4 random bytes to integer in range 100000 - 999999
    const uint32 = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    const num = 100000 + (uint32 % 900000);
    const digits = num.toString().padStart(6, '0');

    const formatted = `${digits.slice(0, 3)} ${digits.slice(3, 6)}`;
    return { raw: digits, formatted };
  }

  /**
   * Generates a secure random nonce string
   */
  public static generateNonce(): string {
    return Encryption.generateUUID();
  }

  /**
   * Computes a SHA-256 hash of a verification code combined with a nonce
   */
  public static computeCodeHash(code: string, nonce: string, salt: string = 'taskora_nearby_v2'): string {
    const cleanCode = code.replace(/\s+/g, '');
    return Encryption.hashString(`${cleanCode}:${nonce}:${salt}`);
  }

  /**
   * Validates if a provided code matches the expected hash
   */
  public static verifyCode(
    inputCode: string,
    expectedHash: string,
    nonce: string,
    salt: string = 'taskora_nearby_v2'
  ): boolean {
    if (!inputCode || !expectedHash || !nonce) return false;
    const computed = this.computeCodeHash(inputCode, nonce, salt);
    return computed === expectedHash;
  }

  /**
   * Computes checksum for a chunk of transferred data
   */
  public static computeChunkChecksum(chunkData: string, chunkIndex: number, batchId: string): string {
    return Encryption.hashString(`${batchId}:${chunkIndex}:${chunkData}`);
  }

  /**
   * Validates chunk integrity
   */
  public static verifyChunkIntegrity(chunkData: string, chunkIndex: number, batchId: string, expectedChecksum: string): boolean {
    const computed = this.computeChunkChecksum(chunkData, chunkIndex, batchId);
    return computed === expectedChecksum;
  }
}
