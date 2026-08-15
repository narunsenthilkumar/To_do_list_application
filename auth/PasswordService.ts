import { Encryption } from '../security/Encryption';

export class PasswordService {
  private static readonly ITERATIONS = 1000;

  /**
   * Hashes a plaintext password with a fresh random cryptographic salt
   */
  public static hashPassword(password: string): { hash: string; salt: string } {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    const salt = Encryption.generateSalt(16);
    const hash = Encryption.derivePasswordHash(password, salt, this.ITERATIONS);
    return { hash, salt };
  }

  /**
   * Verifies a candidate password against the stored salt and hash
   */
  public static verifyPassword(candidate: string, storedHash: string, salt: string): boolean {
    if (!candidate || !storedHash || !salt) return false;
    const computedHash = Encryption.derivePasswordHash(candidate, salt, this.ITERATIONS);
    return computedHash === storedHash;
  }
}
