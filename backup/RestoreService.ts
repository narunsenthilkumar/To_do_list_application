import { LocalDatabase } from '../data/database/LocalDatabase';
import { BackupService } from './BackupService';
import { Task } from '../models/task';
import { Project } from '../models/project';
import { Tag } from '../models/tag';
import { StorageAdapter } from '../services/storage/storageAdapter';
import { KEYS } from '../services/storage/repository';

export interface BackupPreviewSummary {
  isValid: boolean;
  format: string;
  version: string | number;
  exportedAt?: string;
  taskCount: number;
  projectCount: number;
  tagCount: number;
  pinnedCount: number;
  favoriteCount: number;
  reminderCount: number;
  subtaskCount: number;
  hasFocusSessions: boolean;
  hasStreakStats: boolean;
  hasSmartSettings: boolean;
  rawParsedData: any;
}

export class RestoreService {
  /**
   * Validates and inspects a candidate backup JSON string before user confirmation
   */
  public static validateAndPreviewBackup(jsonString: string): BackupPreviewSummary {
    if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
      throw new Error('Backup content is empty.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString.trim());
    } catch {
      throw new Error('Invalid JSON format: Unable to parse file content.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup structure: Root must be an object.');
    }

    // Support both new wrapper format { format: 'taskora-backup', data: { tasks, ... } } and legacy { tasks, ... }
    const rawData = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    const tasks: Task[] = Array.isArray(rawData.tasks) ? rawData.tasks : [];
    const projects: Project[] = Array.isArray(rawData.projects) ? rawData.projects : [];
    const tags: Tag[] = Array.isArray(rawData.tags) ? rawData.tags : [];

    if (!Array.isArray(rawData.tasks) && !Array.isArray(rawData.projects)) {
      throw new Error('Invalid Taskora backup: No valid task or project lists found.');
    }

    let pinnedCount = 0;
    let favoriteCount = 0;
    let reminderCount = 0;
    let subtaskCount = 0;

    tasks.forEach((t) => {
      if (t.isPinned) pinnedCount++;
      if (t.isFavorite) favoriteCount++;
      if (t.reminder && t.reminder !== 'none') reminderCount++;
      if (Array.isArray(t.subtasks)) subtaskCount += t.subtasks.length;
    });

    return {
      isValid: true,
      format: parsed.format || 'taskora-json',
      version: parsed.version || parsed.schemaVersion || '1.0.0',
      exportedAt: parsed.exportedAt || rawData.exportedAt || undefined,
      taskCount: tasks.length,
      projectCount: projects.length,
      tagCount: tags.length,
      pinnedCount,
      favoriteCount,
      reminderCount,
      subtaskCount,
      hasFocusSessions: Array.isArray(rawData.focusSessions) && rawData.focusSessions.length > 0,
      hasStreakStats: !!rawData.streakStats,
      hasSmartSettings: !!rawData.smartSettings,
      rawParsedData: rawData,
    };
  }

  /**
   * Restores data from a validated preview object with 'merge' or 'replace' strategy
   */
  public static async restoreFromPreview(
    preview: BackupPreviewSummary,
    strategy: 'merge' | 'replace'
  ): Promise<{ taskCount: number; projectCount: number; tagCount: number }> {
    const rawData = preview.rawParsedData;
    const incomingTasks: Task[] = Array.isArray(rawData.tasks) ? rawData.tasks : [];
    const incomingProjects: Project[] = Array.isArray(rawData.projects) ? rawData.projects : [];
    const incomingTags: Tag[] = Array.isArray(rawData.tags) ? rawData.tags : [];

    // 1. Mandatory Pre-Restore Safety Snapshot
    await BackupService.createSnapshot('Pre-Restore Safety Snapshot');

    if (strategy === 'replace') {
      // Direct replace
      await LocalDatabase.setAllTasks(incomingTasks);
      await LocalDatabase.setAllProjects(incomingProjects);
      await LocalDatabase.setAllTags(incomingTags);

      if (Array.isArray(rawData.focusSessions)) {
        await StorageAdapter.setItem(KEYS.FOCUS_SESSIONS, rawData.focusSessions);
      }
      if (rawData.pomodoroSettings) {
        await StorageAdapter.setItem(KEYS.POMODORO_SETTINGS, rawData.pomodoroSettings);
      }
      if (rawData.streakStats) {
        await StorageAdapter.setItem(KEYS.STREAK_STATS, rawData.streakStats);
      }
      if (rawData.smartSettings) {
        await StorageAdapter.setItem(KEYS.SMART_SETTINGS, rawData.smartSettings);
      }
    } else {
      // Merge Strategy: union merge without dropping local-only items
      const existingTasks = await LocalDatabase.getAllTasks();
      const taskMap = new Map<string, Task>();
      existingTasks.forEach((t) => taskMap.set(t.id, t));
      incomingTasks.forEach((t) => taskMap.set(t.id, t));
      await LocalDatabase.setAllTasks(Array.from(taskMap.values()));

      const existingProjects = await LocalDatabase.getAllProjects();
      const projMap = new Map<string, Project>();
      existingProjects.forEach((p) => projMap.set(p.id, p));
      incomingProjects.forEach((p) => projMap.set(p.id, p));
      await LocalDatabase.setAllProjects(Array.from(projMap.values()));

      const existingTags = await LocalDatabase.getAllTags();
      const tagMap = new Map<string, Tag>();
      existingTags.forEach((tg) => tagMap.set(tg.id, tg));
      incomingTags.forEach((tg) => tagMap.set(tg.id, tg));
      await LocalDatabase.setAllTags(Array.from(tagMap.values()));

      if (Array.isArray(rawData.focusSessions)) {
        const existingSessions = (await StorageAdapter.getItem<any[]>(KEYS.FOCUS_SESSIONS)) || [];
        const sessionMap = new Map<string, any>();
        existingSessions.forEach((s: any) => sessionMap.set(s.id, s));
        rawData.focusSessions.forEach((s: any) => sessionMap.set(s.id, s));
        await StorageAdapter.setItem(KEYS.FOCUS_SESSIONS, Array.from(sessionMap.values()));
      }
    }

    return {
      taskCount: incomingTasks.length,
      projectCount: incomingProjects.length,
      tagCount: incomingTags.length,
    };
  }

  /**
   * Helper to restore from raw JSON string directly
   */
  public static async restoreFromJSON(
    jsonString: string,
    strategy: 'merge' | 'replace'
  ): Promise<{ taskCount: number; projectCount: number }> {
    const preview = this.validateAndPreviewBackup(jsonString);
    const result = await this.restoreFromPreview(preview, strategy);
    return {
      taskCount: result.taskCount,
      projectCount: result.projectCount,
    };
  }

  /**
   * Restores data directly from a local snapshot
   */
  public static async restoreFromSnapshot(snapshotId: string): Promise<void> {
    const snapshots = await BackupService.getSnapshots();
    const snapshot = snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found.');
    }

    await BackupService.createSnapshot('Pre-Snapshot Rollback Safety');
    await LocalDatabase.setAllTasks(snapshot.data.tasks || []);
    await LocalDatabase.setAllProjects(snapshot.data.projects || []);
    await LocalDatabase.setAllTags(snapshot.data.tags || []);
  }
}
