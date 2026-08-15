import AsyncStorage from '@react-native-async-storage/async-storage';
import { LamportClock } from './LamportClock';
import { DeviceIdService } from './DeviceIdService';

export interface Tombstone {
  entityId: string;
  entityType: string;
  deletedAt: string;
  deletedByDeviceId: string;
  deletionVersion: number;
}

export class TombstoneService {
  private static readonly TOMBSTONES_KEY = '@taskora_tombstones_v4';

  /**
   * Loads all local tombstones
   */
  public static async getTombstones(): Promise<Record<string, Tombstone>> {
    try {
      const raw = await AsyncStorage.getItem(this.TOMBSTONES_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      console.error('[TombstoneService] Error loading tombstones:', e);
      return {};
    }
  }

  /**
   * Marks an entity as deleted by creating a tombstone
   */
  public static async recordDeletion(entityId: string, entityType: string): Promise<Tombstone> {
    const tombstones = await this.getTombstones();
    const version = await LamportClock.tick();
    const deviceId = await DeviceIdService.getDeviceId();

    const tombstone: Tombstone = {
      entityId,
      entityType,
      deletedAt: new Date().toISOString(),
      deletedByDeviceId: deviceId,
      deletionVersion: version,
    };

    tombstones[entityId] = tombstone;
    await AsyncStorage.setItem(this.TOMBSTONES_KEY, JSON.stringify(tombstones));
    return tombstone;
  }

  /**
   * Checks if an entity has been deleted
   */
  public static async isDeleted(entityId: string): Promise<boolean> {
    const tombstones = await this.getTombstones();
    return !!tombstones[entityId];
  }

  /**
   * Clears tombstones on full replace restore
   */
  public static async clear(): Promise<void> {
    await AsyncStorage.removeItem(this.TOMBSTONES_KEY);
  }
}
