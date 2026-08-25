import { StorageAdapter } from '../storage/storageAdapter';

export interface RegisteredReminderRecord {
  taskId: string;
  notificationId: string;
  triggerAt: string; // ISO-8601
  triggerEpochMs: number;
  taskTitle: string;
  alarmMode: string;
  createdAt: string;
}

export class NotificationRegistry {
  private static readonly STORAGE_KEY = '@taskora_notification_registry_v1';
  private static memoryCache: Map<string, RegisteredReminderRecord> | null = null;

  private static async loadRecords(): Promise<Map<string, RegisteredReminderRecord>> {
    if (this.memoryCache) return this.memoryCache;

    try {
      const data = await StorageAdapter.getItem<Record<string, RegisteredReminderRecord>>(this.STORAGE_KEY);
      const map = new Map<string, RegisteredReminderRecord>();
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, val]) => {
          if (val && val.taskId && val.notificationId) {
            map.set(key, val);
          }
        });
      }
      this.memoryCache = map;
      return map;
    } catch {
      this.memoryCache = new Map();
      return this.memoryCache;
    }
  }

  private static async persistRecords(map: Map<string, RegisteredReminderRecord>): Promise<void> {
    this.memoryCache = map;
    const obj: Record<string, RegisteredReminderRecord> = {};
    map.forEach((val, key) => {
      obj[key] = val;
    });
    await StorageAdapter.setItem(this.STORAGE_KEY, obj);
  }

  /**
   * Registers or updates a scheduled notification for a task
   */
  static async register(record: RegisteredReminderRecord): Promise<void> {
    const map = await this.loadRecords();
    map.set(record.taskId, record);
    await this.persistRecords(map);
  }

  /**
   * Retrieves registration record for a task
   */
  static async getByTaskId(taskId: string): Promise<RegisteredReminderRecord | undefined> {
    const map = await this.loadRecords();
    return map.get(taskId);
  }

  /**
   * Removes registration for a task
   */
  static async unregister(taskId: string): Promise<string | undefined> {
    const map = await this.loadRecords();
    const existing = map.get(taskId);
    if (existing) {
      map.delete(taskId);
      await this.persistRecords(map);
      return existing.notificationId;
    }
    return undefined;
  }

  /**
   * Returns all active registrations
   */
  static async getAll(): Promise<RegisteredReminderRecord[]> {
    const map = await this.loadRecords();
    return Array.from(map.values());
  }

  /**
   * Clears entire registry
   */
  static async clear(): Promise<void> {
    this.memoryCache = new Map();
    await StorageAdapter.removeItem(this.STORAGE_KEY);
  }
}
