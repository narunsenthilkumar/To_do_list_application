import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalDatabase } from '../data/database/LocalDatabase';
import { Encryption } from '../security/Encryption';

export interface BackupSnapshot {
  id: string;
  name: string;
  createdAt: string;
  taskCount: number;
  projectCount: number;
  data: {
    tasks: any[];
    projects: any[];
    tags: any[];
  };
}

export class BackupService {
  private static readonly SNAPSHOTS_KEY = '@taskora_backup_snapshots_v4';
  private static readonly MAX_SNAPSHOTS = 5;

  /**
   * Loads all available local backup snapshots
   */
  public static async getSnapshots(): Promise<BackupSnapshot[]> {
    try {
      const raw = await AsyncStorage.getItem(this.SNAPSHOTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('[BackupService] Error loading snapshots:', e);
      return [];
    }
  }

  /**
   * Creates an automatic or manual local snapshot
   */
  public static async createSnapshot(name?: string): Promise<BackupSnapshot> {
    const snapshots = await this.getSnapshots();
    const tasks = await LocalDatabase.getAllTasks();
    const projects = await LocalDatabase.getAllProjects();
    const tags = await LocalDatabase.getAllTags();

    const snapshotName = name || `Auto Snapshot ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newSnapshot: BackupSnapshot = {
      id: `snap-${Encryption.generateUUID()}`,
      name: snapshotName,
      createdAt: new Date().toISOString(),
      taskCount: tasks.length,
      projectCount: projects.length,
      data: {
        tasks,
        projects,
        tags,
      },
    };

    // Maintain max snapshots limit (rolling FIFO)
    const updated = [newSnapshot, ...snapshots].slice(0, this.MAX_SNAPSHOTS);
    await AsyncStorage.setItem(this.SNAPSHOTS_KEY, JSON.stringify(updated));
    return newSnapshot;
  }

  /**
   * Deletes a specific local snapshot
   */
  public static async deleteSnapshot(id: string): Promise<void> {
    const snapshots = await this.getSnapshots();
    const updated = snapshots.filter((s) => s.id !== id);
    await AsyncStorage.setItem(this.SNAPSHOTS_KEY, JSON.stringify(updated));
  }
}
