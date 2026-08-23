import { StorageAdapter } from '../storage/storageAdapter';
import { Repository, getTodayDateString } from '../storage/repository';
import { FocusTimerEngine } from '../focus/FocusTimerEngine';
import { WidgetSnapshotData, WidgetTaskItem, DEFAULT_WIDGET_SNAPSHOT } from './WidgetState';
import { Task } from '../../models/task';
import { Project } from '../../models/project';

export const WIDGET_SNAPSHOT_STORAGE_KEY = '@taskora_widget_snapshot';

export type WidgetDataListener = (data: WidgetSnapshotData) => void;

export class WidgetDataService {
  private static cachedSnapshot: WidgetSnapshotData = DEFAULT_WIDGET_SNAPSHOT;
  private static listeners: Set<WidgetDataListener> = new Set();
  private static isInitialized = false;

  /**
   * Initializes WidgetDataService and subscribes to FocusTimerEngine updates
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load persisted snapshot
    const saved = await StorageAdapter.getItem<WidgetSnapshotData>(WIDGET_SNAPSHOT_STORAGE_KEY);
    if (saved) {
      this.cachedSnapshot = saved;
    }

    // Refresh immediately
    await this.refreshSnapshot();

    // Subscribe to FocusTimerEngine ticks and state changes
    FocusTimerEngine.getInstance().subscribe(() => {
      this.refreshSnapshot();
    });
  }

  /**
   * Builds and saves a fresh widget snapshot
   */
  static async refreshSnapshot(): Promise<WidgetSnapshotData> {
    try {
      const [tasks, projects] = await Promise.all([
        Repository.loadTasks(),
        Repository.loadProjects(),
      ]);

      const engine = FocusTimerEngine.getInstance();
      const todayStr = getTodayDateString();

      // Filter tasks for today or overdue
      const todayTasks = tasks.filter((t) => {
        if (!t.dueDate) return false;
        return t.dueDate === todayStr || t.dueDate < todayStr;
      });

      const completedToday = todayTasks.filter((t) => t.completed);
      const uncompletedToday = todayTasks.filter((t) => !t.completed);

      const totalCount = todayTasks.length;
      const completedCount = completedToday.length;
      const remainingCount = uncompletedToday.length;
      const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      // Project map helper
      const projectMap = new Map<string, Project>();
      projects.forEach((p) => projectMap.set(p.id, p));

      const formatTaskItem = (t: Task): WidgetTaskItem => {
        const proj = t.projectId ? projectMap.get(t.projectId) : undefined;
        return {
          id: t.id,
          title: t.title,
          dueTime: t.dueTime,
          priority: t.priority,
          projectName: proj?.name,
          projectColor: proj?.color,
          completed: t.completed,
        };
      };

      const widgetTasks: WidgetTaskItem[] = uncompletedToday.slice(0, 8).map(formatTaskItem);
      const nextTask: WidgetTaskItem | null = widgetTasks.length > 0 ? widgetTasks[0] : null;

      // Focus state
      const remainingSecs = engine.getRemainingSeconds();
      const mins = Math.floor(remainingSecs / 60);
      const secs = remainingSecs % 60;
      const remainingFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const selectedTaskId = engine.getSelectedTaskId();
      const focusTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : undefined;

      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      const todayFormatted = new Date().toLocaleDateString('en-US', options);

      const snapshot: WidgetSnapshotData = {
        updatedAt: new Date().toISOString(),
        greeting,
        todayDateString: todayStr,
        todayFormatted,
        totalTodayTasks: totalCount,
        completedTodayTasks: completedCount,
        remainingTodayTasks: remainingCount,
        progressPercent,
        nextTask,
        todayTasks: widgetTasks,
        focus: {
          status: engine.getSession()?.status || 'idle',
          mode: engine.getMode(),
          remainingSeconds: remainingSecs,
          remainingFormatted,
          taskTitle: focusTask?.title,
        },
      };

      this.cachedSnapshot = snapshot;
      await StorageAdapter.setItem(WIDGET_SNAPSHOT_STORAGE_KEY, snapshot);

      this.notifyListeners(snapshot);
      return snapshot;
    } catch (e) {
      console.warn('[WidgetDataService] Failed refreshing snapshot:', e);
      return this.cachedSnapshot;
    }
  }

  static getSnapshot(): WidgetSnapshotData {
    return this.cachedSnapshot;
  }

  static subscribe(listener: WidgetDataListener): () => void {
    this.listeners.add(listener);
    listener(this.cachedSnapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(snapshot: WidgetSnapshotData): void {
    this.listeners.forEach((l) => {
      try {
        l(snapshot);
      } catch (e) {
        console.warn('[WidgetDataService] Listener error:', e);
      }
    });
  }
}
