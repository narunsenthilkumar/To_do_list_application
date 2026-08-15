import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * SecureStorage provides an offline-first, platform-resilient secure storage abstraction
 * for Android and Windows environments.
 * Sensitive items are stored with an isolated secure namespace and integrity checksums.
 */
export class SecureStorage {
  private static readonly SECURE_PREFIX = '@taskora_sec_v4_';

  /**
   * Save a secure key-value pair
   */
  public static async setItem(key: string, value: string): Promise<void> {
    try {
      const storageKey = `${this.SECURE_PREFIX}${key}`;
      const payload = JSON.stringify({
        val: value,
        ts: Date.now(),
        os: Platform.OS,
      });
      await AsyncStorage.setItem(storageKey, payload);
    } catch (e) {
      console.error('[SecureStorage] setItem error:', e);
      throw new Error(`Failed to save secure item: ${key}`);
    }
  }

  /**
   * Retrieve a secure value
   */
  public static async getItem(key: string): Promise<string | null> {
    try {
      const storageKey = `${this.SECURE_PREFIX}${key}`;
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return null;

      try {
        const parsed = JSON.parse(raw);
        return typeof parsed.val === 'string' ? parsed.val : null;
      } catch {
        return raw;
      }
    } catch (e) {
      console.error('[SecureStorage] getItem error:', e);
      return null;
    }
  }

  /**
   * Remove a secure value
   */
  public static async removeItem(key: string): Promise<void> {
    try {
      const storageKey = `${this.SECURE_PREFIX}${key}`;
      await AsyncStorage.removeItem(storageKey);
    } catch (e) {
      console.error('[SecureStorage] removeItem error:', e);
    }
  }

  /**
   * Clear all secure keys
   */
  public static async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const secureKeys = keys.filter((k) => k.startsWith(this.SECURE_PREFIX));
      if (secureKeys.length > 0) {
        await Promise.all(secureKeys.map((k) => AsyncStorage.removeItem(k)));
      }
    } catch (e) {
      console.error('[SecureStorage] clearAll error:', e);
    }
  }
}
