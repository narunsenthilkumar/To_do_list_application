import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../../models/task';
import { Project } from '../../models/project';
import { Tag } from '../../models/tag';
import { FocusSession } from '../../models/focus';
import { LamportClock } from '../../sync/LamportClock';
import { DeviceIdService } from '../../sync/DeviceIdService';
import { TombstoneService } from '../../sync/TombstoneService';
import { SyncQueue } from '../../sync/SyncQueue';
import { SessionService } from '../../auth/SessionService';

export interface DatabaseQueryOptions {
  limit?: number;
  offset?: number;
  includeCompleted?: boolean;
  filterPinned?: boolean;
  filterFavorite?: boolean;
  projectId?: string;
  dueDate?: string;
  searchQuery?: string;
}

export class LocalDatabase {
  private static readonly TASKS_KEY = '@taskora_db_v4_tasks';
  private static readonly PROJECTS_KEY = '@taskora_db_v4_projects';
  private static readonly TAGS_KEY = '@taskora_db_v4_tags';
  private static readonly FOCUS_KEY = '@taskora_db_v4_focus';

  // In-memory indexing caches for 60 FPS performance
  private static cachedTasks: Map<string, Task> = new Map();
  private static cachedProjects: Map<string, Project> = new Map();
  private static cachedTags: Map<string, Tag> = new Map();
  private static cachedFocus: FocusSession[] = [];
  private static initialized: boolean = false;

  /**
   * Initializes and warms up in-memory indexed database caches
   */
  public static async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const [tasksRaw, projectsRaw, tagsRaw, focusRaw] = await Promise.all([
        AsyncStorage.getItem(this.TASKS_KEY),
        AsyncStorage.getItem(this.PROJECTS_KEY),
        AsyncStorage.getItem(this.TAGS_KEY),
        AsyncStorage.getItem(this.FOCUS_KEY),
      ]);

      this.cachedTasks.clear();
      this.cachedProjects.clear();
      this.cachedTags.clear();

      if (tasksRaw) {
        const tasks: Task[] = JSON.parse(tasksRaw);
        tasks.forEach((t) => this.cachedTasks.set(t.id, t));
      }

      if (projectsRaw) {
        const projects: Project[] = JSON.parse(projectsRaw);
        projects.forEach((p) => this.cachedProjects.set(p.id, p));
      }

      if (tagsRaw) {
        const tags: Tag[] = JSON.parse(tagsRaw);
        tags.forEach((t) => this.cachedTags.set(t.id, t));
      }

      if (focusRaw) {
        this.cachedFocus = JSON.parse(focusRaw);
      }

      this.initialized = true;
    } catch (e) {
      console.error('[LocalDatabase] Init error:', e);
      this.initialized = true;
    }
  }

  // ==========================================
  // TASK OPERATIONS
  // ==========================================

  public static async getAllTasks(): Promise<Task[]> {
    await this.init();
    return Array.from(this.cachedTasks.values()).filter((t) => !t.deletedAt);
  }

  public static async getTaskById(id: string): Promise<Task | null> {
    await this.init();
    const task = this.cachedTasks.get(id);
    return task && !task.deletedAt ? task : null;
  }

  public static async insertTask(task: Omit<Task, 'createdAt' | 'updatedAt' | 'version'>): Promise<Task> {
    await this.init();
    const version = await LamportClock.tick();
    const deviceId = await DeviceIdService.getDeviceId();
    const session = await SessionService.getActiveSession();
    const now = new Date().toISOString();

    const fullTask: Task = {
      ...task,
      userId: session.userId,
      version,
      updatedByDeviceId: deviceId,
      createdAt: now,
      updatedAt: now,
    };

    this.cachedTasks.set(fullTask.id, fullTask);
    await this.persistTasks();

    // Enqueue sync mutation
    await SyncQueue.enqueue(fullTask.id, 'task', 'CREATE', fullTask);
    return fullTask;
  }

  public static async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    await this.init();
    const existing = this.cachedTasks.get(id);
    if (!existing || existing.deletedAt) return null;

    const version = await LamportClock.tick();
    const deviceId = await DeviceIdService.getDeviceId();
    const now = new Date().toISOString();

    const updatedTask: Task = {
      ...existing,
      ...updates,
      version,
      updatedByDeviceId: deviceId,
      updatedAt: now,
    };

    this.cachedTasks.set(id, updatedTask);
    await this.persistTasks();

    // Enqueue sync mutation
    await SyncQueue.enqueue(id, 'task', 'UPDATE', updatedTask);
    return updatedTask;
  }

  public static async deleteTask(id: string): Promise<boolean> {
    await this.init();
    const existing = this.cachedTasks.get(id);
    if (!existing) return false;

    const tombstone = await TombstoneService.recordDeletion(id, 'task');
    const updatedTask: Task = {
      ...existing,
      deletedAt: tombstone.deletedAt,
      version: tombstone.deletionVersion,
      updatedByDeviceId: tombstone.deletedByDeviceId,
    };

    this.cachedTasks.set(id, updatedTask);
    await this.persistTasks();

    // Enqueue sync deletion
    await SyncQueue.enqueue(id, 'task', 'DELETE', { id, deletedAt: tombstone.deletedAt });
    return true;
  }

  /**
   * Applies a remote task delta during synchronization without re-enqueueing to local sync queue
   */
  public static async applyRemoteTask(task: Task): Promise<void> {
    await this.init();
    this.cachedTasks.set(task.id, task);
    await this.persistTasks();
  }

  private static async persistTasks(): Promise<void> {
    const list = Array.from(this.cachedTasks.values());
    await AsyncStorage.setItem(this.TASKS_KEY, JSON.stringify(list));
  }

  // ==========================================
  // PROJECT OPERATIONS
  // ==========================================

  public static async getAllProjects(): Promise<Project[]> {
    await this.init();
    return Array.from(this.cachedProjects.values()).filter((p) => !p.deletedAt);
  }

  public static async getProjectById(id: string): Promise<Project | null> {
    await this.init();
    const proj = this.cachedProjects.get(id);
    return proj && !proj.deletedAt ? proj : null;
  }

  public static async insertProject(project: Omit<Project, 'createdAt' | 'updatedAt' | 'version'>): Promise<Project> {
    await this.init();
    const version = await LamportClock.tick();
    const deviceId = await DeviceIdService.getDeviceId();
    const session = await SessionService.getActiveSession();
    const now = new Date().toISOString();

    const fullProject: Project = {
      ...project,
      userId: session.userId,
      version,
      updatedByDeviceId: deviceId,
      createdAt: now,
      updatedAt: now,
    };

    this.cachedProjects.set(fullProject.id, fullProject);
    await this.persistProjects();
    await SyncQueue.enqueue(fullProject.id, 'project', 'CREATE', fullProject);
    return fullProject;
  }

  public static async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    await this.init();
    const existing = this.cachedProjects.get(id);
    if (!existing || existing.deletedAt) return null;

    const version = await LamportClock.tick();
    const deviceId = await DeviceIdService.getDeviceId();
    const now = new Date().toISOString();

    const updated: Project = {
      ...existing,
      ...updates,
      version,
      updatedByDeviceId: deviceId,
      updatedAt: now,
    };

    this.cachedProjects.set(id, updated);
    await this.persistProjects();
    await SyncQueue.enqueue(id, 'project', 'UPDATE', updated);
    return updated;
  }

  public static async deleteProject(id: string): Promise<boolean> {
    await this.init();
    const existing = this.cachedProjects.get(id);
    if (!existing) return false;

    const tombstone = await TombstoneService.recordDeletion(id, 'project');
    const updated: Project = {
      ...existing,
      deletedAt: tombstone.deletedAt,
      version: tombstone.deletionVersion,
    };

    this.cachedProjects.set(id, updated);
    await this.persistProjects();
    await SyncQueue.enqueue(id, 'project', 'DELETE', { id, deletedAt: tombstone.deletedAt });
    return true;
  }

  public static async applyRemoteProject(project: Project): Promise<void> {
    await this.init();
    this.cachedProjects.set(project.id, project);
    await this.persistProjects();
  }

  private static async persistProjects(): Promise<void> {
    const list = Array.from(this.cachedProjects.values());
    await AsyncStorage.setItem(this.PROJECTS_KEY, JSON.stringify(list));
  }

  // ==========================================
  // TAG OPERATIONS
  // ==========================================

  public static async getAllTags(): Promise<Tag[]> {
    await this.init();
    return Array.from(this.cachedTags.values()).filter((t) => !t.deletedAt);
  }

  public static async insertTag(tag: Omit<Tag, 'createdAt' | 'version'>): Promise<Tag> {
    await this.init();
    const version = await LamportClock.tick();
    const deviceId = await DeviceIdService.getDeviceId();
    const session = await SessionService.getActiveSession();

    const fullTag: Tag = {
      ...tag,
      userId: session.userId,
      version,
      updatedByDeviceId: deviceId,
      createdAt: new Date().toISOString(),
    };

    this.cachedTags.set(fullTag.id, fullTag);
    await this.persistTags();
    await SyncQueue.enqueue(fullTag.id, 'tag', 'CREATE', fullTag);
    return fullTag;
  }

  public static async deleteTag(id: string): Promise<boolean> {
    await this.init();
    const existing = this.cachedTags.get(id);
    if (!existing) return false;

    const tombstone = await TombstoneService.recordDeletion(id, 'tag');
    this.cachedTags.delete(id);
    await this.persistTags();
    await SyncQueue.enqueue(id, 'tag', 'DELETE', { id, deletedAt: tombstone.deletedAt });
    return true;
  }

  public static async applyRemoteTag(tag: Tag): Promise<void> {
    await this.init();
    this.cachedTags.set(tag.id, tag);
    await this.persistTags();
  }

  private static async persistTags(): Promise<void> {
    const list = Array.from(this.cachedTags.values());
    await AsyncStorage.setItem(this.TAGS_KEY, JSON.stringify(list));
  }

  // ==========================================
  // DIRECT IN-MEMORY BULK REPLACE (RESTORE/TEST)
  // ==========================================

  public static async setAllTasks(tasks: Task[]): Promise<void> {
    await this.init();
    this.cachedTasks.clear();
    tasks.forEach((t) => this.cachedTasks.set(t.id, t));
    await this.persistTasks();
  }

  public static async setAllProjects(projects: Project[]): Promise<void> {
    await this.init();
    this.cachedProjects.clear();
    projects.forEach((p) => this.cachedProjects.set(p.id, p));
    await this.persistProjects();
  }

  public static async setAllTags(tags: Tag[]): Promise<void> {
    await this.init();
    this.cachedTags.clear();
    tags.forEach((t) => this.cachedTags.set(t.id, t));
    await this.persistTags();
  }
}
