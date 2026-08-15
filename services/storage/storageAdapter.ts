import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageAdapter {
  private static memoryCache: Record<string, string> = {};

  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) {
        return JSON.parse(val) as T;
      }
      if (this.memoryCache[key]) {
        return JSON.parse(this.memoryCache[key]) as T;
      }
      return null;
    } catch (e) {
      console.warn(`[StorageAdapter] Failed reading key "${key}", checking memory cache fallback`, e);
      if (this.memoryCache[key]) {
        return JSON.parse(this.memoryCache[key]) as T;
      }
      return null;
    }
  }

  static async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      this.memoryCache[key] = serialized;
      await AsyncStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.error(`[StorageAdapter] Failed saving key "${key}"`, e);
      return false;
    }
  }

  static async removeItem(key: string): Promise<boolean> {
    try {
      delete this.memoryCache[key];
      await AsyncStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`[StorageAdapter] Failed removing key "${key}"`, e);
      return false;
    }
  }

  static async clearAll(): Promise<boolean> {
    try {
      this.memoryCache = {};
      await AsyncStorage.clear();
      return true;
    } catch (e) {
      console.error('[StorageAdapter] Failed clearing storage', e);
      return false;
    }
  }
}
