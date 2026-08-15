import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalDatabase } from '../database/LocalDatabase';
import { DeviceIdService } from '../../sync/DeviceIdService';
import { SessionService } from '../../auth/SessionService';
import { Task } from '../../models/task';
import { Project } from '../../models/project';
import { Tag } from '../../models/tag';

export class MigrationRunner {
  private static readonly MIGRATION_PHASE4_KEY = '@taskora_migration_phase4_done';

  public static async runMigrations(): Promise<void> {
    try {
      const isDone = await AsyncStorage.getItem(this.MIGRATION_PHASE4_KEY);
      if (isDone) {
        await LocalDatabase.init();
        return;
      }

      console.log('[MigrationRunner] Running Phase 4 database migration...');
      const deviceId = await DeviceIdService.getDeviceId();
      const session = await SessionService.getActiveSession();

      // Read existing legacy Phase 1-3 data
      const [legacyTasksRaw, legacyProjectsRaw, legacyTagsRaw] = await Promise.all([
        AsyncStorage.getItem('@taskora_tasks'),
        AsyncStorage.getItem('@taskora_projects'),
        AsyncStorage.getItem('@taskora_tags'),
      ]);

      if (legacyTasksRaw) {
        const legacyTasks: Task[] = JSON.parse(legacyTasksRaw);
        const migratedTasks: Task[] = legacyTasks.map((t) => ({
          ...t,
          userId: t.userId || session.userId,
          version: t.version || 1,
          updatedByDeviceId: t.updatedByDeviceId || deviceId,
        }));
        await LocalDatabase.setAllTasks(migratedTasks);
      }

      if (legacyProjectsRaw) {
        const legacyProjects: Project[] = JSON.parse(legacyProjectsRaw);
        const migratedProjects: Project[] = legacyProjects.map((p) => ({
          ...p,
          userId: p.userId || session.userId,
          version: p.version || 1,
          updatedByDeviceId: p.updatedByDeviceId || deviceId,
        }));
        await LocalDatabase.setAllProjects(migratedProjects);
      }

      if (legacyTagsRaw) {
        const legacyTags: Tag[] = JSON.parse(legacyTagsRaw);
        const migratedTags: Tag[] = legacyTags.map((tag) => ({
          ...tag,
          userId: tag.userId || session.userId,
          version: tag.version || 1,
          updatedByDeviceId: tag.updatedByDeviceId || deviceId,
        }));
        await LocalDatabase.setAllTags(migratedTags);
      }

      await AsyncStorage.setItem(this.MIGRATION_PHASE4_KEY, 'true');
      console.log('[MigrationRunner] Phase 4 migration completed successfully.');
    } catch (e) {
      console.error('[MigrationRunner] Error during migration:', e);
    }
  }
}
