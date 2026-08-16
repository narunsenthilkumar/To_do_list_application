import { StorageAdapter } from './storageAdapter';
import { Task } from '../../models/task';
import { Project } from '../../models/project';
import { Tag } from '../../models/tag';
import { FocusSession, PomodoroSettings, StreakStats } from '../../models/focus';

export const KEYS = {
  TASKS: '@taskora_tasks',
  PROJECTS: '@taskora_projects',
  TAGS: '@taskora_tags',
  FOCUS_SESSIONS: '@taskora_focus_sessions',
  POMODORO_SETTINGS: '@taskora_pomodoro_settings',
  STREAK_STATS: '@taskora_streak_stats',
  THEME_MODE: '@taskora_theme_mode',
  ONBOARDING_DONE: '@taskora_onboarding_done',
  SMART_SETTINGS: '@taskora_smart_settings',
  TIME_FORMAT: '@taskora_time_format',
  BACKGROUND_SETTINGS: '@taskora_background_settings',
};

export const STORAGE_KEYS = KEYS;

export const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTomorrowDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export class Repository {
  /**
   * Loads tasks.
   * On a fresh installation, returns an empty array [] without seeding fake tasks.
   * If existing user tasks exist, preserves and returns them.
   */
  static async loadTasks(): Promise<Task[]> {
    const tasks = await StorageAdapter.getItem<Task[]>(KEYS.TASKS);
    if (!tasks) {
      // Fresh clean install starts with 0 tasks
      await StorageAdapter.setItem(KEYS.TASKS, []);
      return [];
    }

    return tasks.map((t) => ({
      ...t,
      isPinned: t.isPinned ?? false,
      isFavorite: t.isFavorite ?? false,
    }));
  }

  static async saveTasks(tasks: Task[]): Promise<boolean> {
    const success = await StorageAdapter.setItem(KEYS.TASKS, tasks);
    try {
      const { LocalDatabase } = require('../../data/database/LocalDatabase');
      await LocalDatabase.setAllTasks(tasks);
    } catch {}
    return success;
  }

  /**
   * Loads projects.
   * On a fresh installation, returns an empty array [] without seeding demo projects.
   * Preserves existing user projects.
   */
  static async loadProjects(): Promise<Project[]> {
    const projects = await StorageAdapter.getItem<Project[]>(KEYS.PROJECTS);
    if (!projects) {
      await StorageAdapter.setItem(KEYS.PROJECTS, []);
      return [];
    }
    return projects;
  }

  static async saveProjects(projects: Project[]): Promise<boolean> {
    const success = await StorageAdapter.setItem(KEYS.PROJECTS, projects);
    try {
      const { LocalDatabase } = require('../../data/database/LocalDatabase');
      await LocalDatabase.setAllProjects(projects);
    } catch {}
    return success;
  }

  /**
   * Loads tags.
   * On a fresh installation, returns an empty array [].
   * Preserves existing user tags.
   */
  static async loadTags(): Promise<Tag[]> {
    const tags = await StorageAdapter.getItem<Tag[]>(KEYS.TAGS);
    if (!tags) {
      await StorageAdapter.setItem(KEYS.TAGS, []);
      return [];
    }
    return tags;
  }

  static async saveTags(tags: Tag[]): Promise<boolean> {
    return await StorageAdapter.setItem(KEYS.TAGS, tags);
  }

  static async loadFocusSessions(): Promise<FocusSession[]> {
    const sessions = await StorageAdapter.getItem<FocusSession[]>(KEYS.FOCUS_SESSIONS);
    return sessions || [];
  }

  static async saveFocusSessions(sessions: FocusSession[]): Promise<boolean> {
    return await StorageAdapter.setItem(KEYS.FOCUS_SESSIONS, sessions);
  }

  static async loadPomodoroSettings(): Promise<PomodoroSettings> {
    const settings = await StorageAdapter.getItem<PomodoroSettings>(KEYS.POMODORO_SETTINGS);
    return settings || {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
    };
  }

  static async savePomodoroSettings(settings: PomodoroSettings): Promise<boolean> {
    return await StorageAdapter.setItem(KEYS.POMODORO_SETTINGS, settings);
  }

  static async loadStreakStats(): Promise<StreakStats> {
    const stats = await StorageAdapter.getItem<StreakStats>(KEYS.STREAK_STATS);
    return stats || {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: '',
      history: {}
    };
  }

  static async saveStreakStats(stats: StreakStats): Promise<boolean> {
    return await StorageAdapter.setItem(KEYS.STREAK_STATS, stats);
  }

  static async loadThemeMode(): Promise<'system' | 'light' | 'dark'> {
    const mode = await StorageAdapter.getItem<'system' | 'light' | 'dark'>(KEYS.THEME_MODE);
    return mode || 'system';
  }

  static async saveThemeMode(mode: 'system' | 'light' | 'dark'): Promise<boolean> {
    return await StorageAdapter.setItem(KEYS.THEME_MODE, mode);
  }

  static async loadOnboardingDone(): Promise<boolean> {
    const done = await StorageAdapter.getItem<boolean>(KEYS.ONBOARDING_DONE);
    return done || false;
  }

  static async saveOnboardingDone(done: boolean): Promise<boolean> {
    return await StorageAdapter.setItem(KEYS.ONBOARDING_DONE, done);
  }

  static async loadSmartSettings(): Promise<any> {
    return await StorageAdapter.getItem(KEYS.SMART_SETTINGS);
  }

  static async saveSmartSettings(settings: any): Promise<boolean> {
    return await StorageAdapter.setItem(KEYS.SMART_SETTINGS, settings);
  }

  static async loadTimeFormat(): Promise<'12h' | '24h'> {
    const format = await StorageAdapter.getItem<'12h' | '24h'>(KEYS.TIME_FORMAT);
    return format || '12h';
  }

  static async saveTimeFormat(format: '12h' | '24h'): Promise<boolean> {
    return await StorageAdapter.setItem(KEYS.TIME_FORMAT, format);
  }

  static async loadBackgroundSettings(): Promise<any> {
    return await StorageAdapter.getItem(KEYS.BACKGROUND_SETTINGS);
  }

  static async saveBackgroundSettings(settings: any): Promise<boolean> {
    return await StorageAdapter.setItem(KEYS.BACKGROUND_SETTINGS, settings);
  }

  // Backup & Import
  static async exportBackupJSON(): Promise<string> {
    const tasks = await this.loadTasks();
    const projects = await this.loadProjects();
    const tags = await this.loadTags();
    const focusSessions = await this.loadFocusSessions();
    const pomodoroSettings = await this.loadPomodoroSettings();
    const streakStats = await this.loadStreakStats();

    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
      projects,
      tags,
      focusSessions,
      pomodoroSettings,
      streakStats,
    };
    return JSON.stringify(data, null, 2);
  }

  static async importBackupJSON(jsonStr: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') return false;
      if (Array.isArray(data.tasks)) await this.saveTasks(data.tasks);
      if (Array.isArray(data.projects)) await this.saveProjects(data.projects);
      if (Array.isArray(data.tags)) await this.saveTags(data.tags);
      if (Array.isArray(data.focusSessions)) await this.saveFocusSessions(data.focusSessions);
      if (data.pomodoroSettings) await this.savePomodoroSettings(data.pomodoroSettings);
      if (data.streakStats) await this.saveStreakStats(data.streakStats);
      return true;
    } catch (e) {
      console.error('[Repository] Failed importing backup JSON', e);
      return false;
    }
  }

  /**
   * Resets all user data after explicit user confirmation
   */
  static async clearAllData(): Promise<void> {
    await StorageAdapter.setItem(KEYS.TASKS, []);
    await StorageAdapter.setItem(KEYS.PROJECTS, []);
    await StorageAdapter.setItem(KEYS.TAGS, []);
    await StorageAdapter.setItem(KEYS.FOCUS_SESSIONS, []);
    await StorageAdapter.setItem(KEYS.STREAK_STATS, {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: '',
      history: {},
    });
    try {
      const { LocalDatabase } = require('../../data/database/LocalDatabase');
      await LocalDatabase.setAllTasks([]);
      await LocalDatabase.setAllProjects([]);
      await LocalDatabase.setAllTags([]);
    } catch {}
  }
}
