import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LocalDatabase } from '../data/database/LocalDatabase';
import { Task } from '../models/task';
import { Project } from '../models/project';
import { Tag } from '../models/tag';
import { StorageAdapter } from '../services/storage/storageAdapter';
import { KEYS } from '../services/storage/repository';

export interface ExportResult {
  success: boolean;
  filename: string;
  fileUri?: string;
  itemCount: number;
  isCancelled?: boolean;
  error?: string;
}

export class ExportService {
  /**
   * Helper to format current date as YYYY-MM-DD for clean filenames
   */
  public static getDateStamp(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Proper RFC 4180 CSV field escaper
   */
  public static escapeCSVField(val: any): string {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    // Escape double quotes as two double quotes
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  /**
   * Generates complete sanitized Taskora Backup JSON string
   */
  public static async generateBackupJSONString(): Promise<{ jsonString: string; taskCount: number; projectCount: number }> {
    const tasks = await LocalDatabase.getAllTasks();
    const projects = await LocalDatabase.getAllProjects();
    const tags = await LocalDatabase.getAllTags();
    const focusSessions = (await StorageAdapter.getItem<any[]>(KEYS.FOCUS_SESSIONS)) || [];
    const pomodoroSettings = await StorageAdapter.getItem<any>(KEYS.POMODORO_SETTINGS);
    const streakStats = await StorageAdapter.getItem<any>(KEYS.STREAK_STATS);
    const smartSettings = await StorageAdapter.getItem<any>(KEYS.SMART_SETTINGS);

    // Sanitize tasks (ensure no circular refs or undefined)
    const sanitizedTasks = (tasks || []).map((t) => ({
      id: t.id,
      title: t.title || '',
      notes: t.notes || '',
      completed: !!t.completed,
      completedAt: t.completedAt || null,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
      dueDate: t.dueDate || null,
      dueTime: t.dueTime || null,
      priority: t.priority || 'none',
      projectId: t.projectId || (t.projectIds && t.projectIds[0]) || null,
      projectIds: Array.isArray(t.projectIds) ? t.projectIds : (t.projectId ? [t.projectId] : []),
      inbox: typeof t.inbox === 'boolean' ? t.inbox : (!t.projectId && (!t.projectIds || t.projectIds.length === 0)),
      category: t.category || 'General',
      tags: Array.isArray(t.tags) ? t.tags : [],
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
      reminder: t.reminder || 'none',
      recurrence: t.recurrence || null,
      isPinned: !!t.isPinned,
      isFavorite: !!t.isFavorite,
      estimatedDuration: t.estimatedDuration || 30,
      version: t.version || 1,
      order: typeof t.order === 'number' ? t.order : 0,
      activityLogs: Array.isArray(t.activityLogs) ? t.activityLogs : [],
    }));

    const backupPayload = {
      format: 'taskora-backup',
      app: 'Taskora',
      version: 1,
      schemaVersion: '4.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        tasks: sanitizedTasks,
        projects: projects || [],
        tags: tags || [],
        focusSessions,
        pomodoroSettings: pomodoroSettings || null,
        streakStats: streakStats || null,
        smartSettings: smartSettings || null,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);

    // Validate serialization
    const reParsed = JSON.parse(jsonString);
    if (!reParsed || !reParsed.data || !Array.isArray(reParsed.data.tasks)) {
      throw new Error('Backup serialization validation failed.');
    }

    return {
      jsonString,
      taskCount: sanitizedTasks.length,
      projectCount: (projects || []).length,
    };
  }

  /**
   * Generates standard RFC 4180 CSV string for tasks
   */
  public static async generateTasksCSVString(): Promise<{ csvString: string; taskCount: number }> {
    const tasks = await LocalDatabase.getAllTasks();
    const projects = await LocalDatabase.getAllProjects();
    const projectMap = new Map<string, string>();
    (projects || []).forEach((p) => projectMap.set(p.id, p.name));

    const headers = [
      'ID',
      'Title',
      'Notes',
      'Completed',
      'Priority',
      'Due Date',
      'Due Time',
      'Project',
      'Category',
      'Tags',
      'Subtasks Count',
      'Is Pinned',
      'Is Favorite',
      'Reminder',
      'Recurrence',
      'Created At',
      'Updated At',
    ];

    const headerRow = headers.map(this.escapeCSVField).join(',');

    const dataRows = (tasks || []).map((t) => {
      const projectName = t.projectId ? projectMap.get(t.projectId) || t.projectId : '';
      const tagsStr = Array.isArray(t.tags) ? t.tags.join('; ') : '';
      const subtaskCount = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
      const recurrenceStr = t.recurrence?.frequency ? t.recurrence.frequency : '';

      return [
        this.escapeCSVField(t.id),
        this.escapeCSVField(t.title),
        this.escapeCSVField(t.notes || ''),
        this.escapeCSVField(t.completed ? 'TRUE' : 'FALSE'),
        this.escapeCSVField(t.priority || 'none'),
        this.escapeCSVField(t.dueDate || ''),
        this.escapeCSVField(t.dueTime || ''),
        this.escapeCSVField(projectName),
        this.escapeCSVField(t.category || 'General'),
        this.escapeCSVField(tagsStr),
        this.escapeCSVField(subtaskCount),
        this.escapeCSVField(t.isPinned ? 'TRUE' : 'FALSE'),
        this.escapeCSVField(t.isFavorite ? 'TRUE' : 'FALSE'),
        this.escapeCSVField(t.reminder || 'none'),
        this.escapeCSVField(recurrenceStr),
        this.escapeCSVField(t.createdAt || ''),
        this.escapeCSVField(t.updatedAt || ''),
      ].join(',');
    });

    const csvString = [headerRow, ...dataRows].join('\r\n');

    return {
      csvString,
      taskCount: (tasks || []).length,
    };
  }

  /**
   * Cross-platform file dispatcher (Native Share Sheet on Android/iOS, Blob Download on Windows/Web)
   */
  public static async exportAndShareFile(
    content: string,
    filename: string,
    mimeType: string,
    uti: string
  ): Promise<{ success: boolean; fileUri?: string; isCancelled?: boolean }> {
    if (Platform.OS === 'web') {
      // 1. Electron Windows Native Save File Dialog (via Secure IPC)
      if (typeof window !== 'undefined' && (window as any).electronAPI?.saveFile) {
        try {
          const isCSV = filename.endsWith('.csv');
          const res = await (window as any).electronAPI.saveFile({
            defaultPath: filename,
            content,
            filters: isCSV
              ? [
                  { name: 'CSV File (*.csv)', extensions: ['csv'] },
                  { name: 'All Files (*.*)', extensions: ['*'] },
                ]
              : [
                  { name: 'Taskora Backup (*.json)', extensions: ['json'] },
                  { name: 'All Files (*.*)', extensions: ['*'] },
                ],
          });

          if (res.isCancelled) {
            return { success: true, isCancelled: true };
          }
          if (!res.success) {
            throw new Error(res.error || 'Failed to save file');
          }
          return { success: true, fileUri: res.filePath };
        } catch (e: any) {
          throw new Error(`Windows file export failed: ${e?.message || 'Unknown error'}`);
        }
      }

      // 2. Standard Web Browser Blob Download
      try {
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return { success: true };
      } catch (e: any) {
        throw new Error(`Web file download failed: ${e?.message || 'Unknown error'}`);
      }
    }

    // Native iOS & Android flow using Expo FileSystem + Sharing
    try {
      const file = new File(Paths.cache, filename);
      if (!file.exists) {
        file.create();
      }
      file.write(content);
      const fileUri = file.uri;

      const isShareAvailable = await Sharing.isAvailableAsync();
      if (!isShareAvailable) {
        return { success: true, fileUri };
      }

      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Export ${filename}`,
        UTI: uti,
      });

      return { success: true, fileUri };
    } catch (e: any) {
      if (e?.message && e.message.includes('User did not share')) {
        return { success: true, isCancelled: true };
      }
      throw new Error(`Native file export failed: ${e?.message || 'Unknown error'}`);
    }
  }

  /**
   * Full High-Level JSON Export Flow
   */
  public static async exportJSON(): Promise<ExportResult> {
    const filename = `Taskora_Backup_${this.getDateStamp()}.json`;
    const { jsonString, taskCount } = await this.generateBackupJSONString();

    const res = await this.exportAndShareFile(
      jsonString,
      filename,
      'application/json',
      'public.json'
    );

    return {
      success: res.success,
      filename,
      fileUri: res.fileUri,
      itemCount: taskCount,
      isCancelled: res.isCancelled,
    };
  }

  /**
   * Full High-Level CSV Export Flow
   */
  public static async exportCSV(): Promise<ExportResult> {
    const filename = `Taskora_Tasks_${this.getDateStamp()}.csv`;
    const { csvString, taskCount } = await this.generateTasksCSVString();

    const res = await this.exportAndShareFile(
      csvString,
      filename,
      'text/csv',
      'public.comma-separated-values-text'
    );

    return {
      success: res.success,
      filename,
      fileUri: res.fileUri,
      itemCount: taskCount,
      isCancelled: res.isCancelled,
    };
  }
}
