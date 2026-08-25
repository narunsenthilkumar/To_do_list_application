import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Task, PriorityLevel, RecurrenceRule, ReminderOption, Subtask, ActivityLog } from '../models/task';
import { Project } from '../models/project';
import { Tag } from '../models/tag';
import { Repository, getTodayDateString } from '../services/storage/repository';
import { RecurrenceEngine } from '../services/recurrence/recurrenceEngine';
import { NotificationService } from '../services/notifications/notificationService';
import { SmartSettings, DEFAULT_SMART_SETTINGS, CategoryEngine, ProductivityEngine } from '../smart';
import { TemplateService } from '../services/storage/templateService';
import { WidgetDataService } from '../services/widgets/WidgetDataService';
import { haptics } from '../services/haptics';



export type TaskActionType =
  | 'CREATE'
  | 'COMPLETE'
  | 'UNCOMPLETE'
  | 'DELETE'
  | 'RESTORE'
  | 'PIN'
  | 'UNPIN'
  | 'FAVOURITE'
  | 'UNFAVOURITE'
  | 'MOVE'
  | 'ASSIGN_PROJECT'
  | 'REMOVE_PROJECT'
  | 'DUE_DATE_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'TASK_UPDATED'
  | 'SYNC'
  | 'complete'
  | 'delete'
  | 'bulk_complete'
  | 'bulk_delete'
  | 'bulk_update';

export interface UndoAction {
  id: string;
  message: string;
  type: TaskActionType;
  actionType?: TaskActionType;
  taskId?: string;
  taskTitle?: string;
  projectName?: string;
  count?: number;
  timestamp?: number;
  undoAvailable?: boolean;
  duration?: number;
  previousTasks: Task[];
}

interface TaskContextType {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  isLoading: boolean;
  activeUndoAction: UndoAction | null;
  dismissUndo: () => void;
  undoLastAction: () => void;
  clearAllData: () => Promise<void>;
  applyTemplate: (templateId: string) => Promise<boolean>;

  // Task Operations
  addTask: (taskData: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleTaskCompletion: (id: string) => Promise<void>;
  toggleTaskPin: (id: string) => Promise<void>;
  toggleTaskFavorite: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Subtask Operations
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;

  // Project Operations
  addProject: (projectData: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string, action?: 'move_to_inbox' | 'delete_tasks') => Promise<void>;

  // Tag Operations
  addTag: (name: string, color: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;

  // Bulk Operations
  bulkCompleteTasks: (taskIds: string[]) => Promise<void>;
  bulkDeleteTasks: (taskIds: string[]) => Promise<void>;
  bulkMoveTasks: (taskIds: string[], projectId: string | undefined) => Promise<void>;
  bulkRescheduleTasks: (taskIds: string[], dueDate: string | undefined, dueTime?: string | undefined) => Promise<void>;
  bulkSetPriority: (taskIds: string[], priority: PriorityLevel) => Promise<void>;

  // Smart Lists Selectors
  todayTasks: Task[];
  todayAllTasks: Task[];
  inboxTasks: Task[];
  upcomingTasks: Task[];
  overdueTasks: Task[];
  highPriorityTasks: Task[];
  pinnedTasks: Task[];
  favoriteTasks: Task[];
  completedTasks: Task[];

  // Smart Engine Settings
  smartSettings: SmartSettings;
  updateSmartSettings: (updates: Partial<SmartSettings>) => Promise<void>;
  resetSmartPreferences: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

// Normalizes a task to guarantee all optional array properties have safe defaults
export function normalizeTask(t: Partial<Task>): Task {
  const projectIds = Array.isArray(t.projectIds)
    ? [...t.projectIds]
    : (t.projectId ? [t.projectId] : []);

  const inbox = typeof t.inbox === 'boolean'
    ? t.inbox
    : (projectIds.length === 0);

  return {
    id: t.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    userId: t.userId,
    title: (t.title || '').trim() || 'New Task',
    notes: t.notes || '',
    completed: !!t.completed,
    isPinned: !!t.isPinned,
    isFavorite: !!t.isFavorite,
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: t.updatedAt || new Date().toISOString(),
    completedAt: t.completedAt,
    dueDate: t.dueDate,
    dueTime: t.dueTime,
    priority: t.priority || 'none',
    projectId: projectIds[0] || t.projectId,
    projectIds,
    inbox,
    tags: Array.isArray(t.tags) ? [...t.tags] : [],
    subtasks: Array.isArray(t.subtasks) ? [...t.subtasks] : [],
    reminder: t.reminder || 'none',
    reminderConfig: t.reminderConfig,
    notificationId: t.notificationId,
    recurrence: t.recurrence,
    category: t.category,
    estimatedDuration: t.estimatedDuration || 30,
    order: typeof t.order === 'number' ? t.order : 0,
    activityLogs: Array.isArray(t.activityLogs) ? [...t.activityLogs] : [],
    version: t.version,
    updatedByDeviceId: t.updatedByDeviceId,
    deletedAt: t.deletedAt,
  };
}

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeUndoAction, setActiveUndoAction] = useState<UndoAction | null>(null);
  const [smartSettings, setSmartSettings] = useState<SmartSettings>(DEFAULT_SMART_SETTINGS);
  const undoTimeoutRef = useRef<any>(null);

  // Initialize data from local storage repository
  useEffect(() => {
    async function initData() {
      try {
        const [loadedTasks, loadedProjects, loadedTags, loadedSettings] = await Promise.all([
          Repository.loadTasks(),
          Repository.loadProjects(),
          Repository.loadTags(),
          Repository.loadSmartSettings(),
        ]);
        setTasks((loadedTasks || []).map(normalizeTask));
        setProjects(loadedProjects || []);
        setTags(loadedTags || []);
        if (loadedSettings) {
          setSmartSettings({ ...DEFAULT_SMART_SETTINGS, ...loadedSettings });
        }

        // Reconcile and restore all scheduled reminders on startup
        NotificationService.reconcileScheduledReminders().catch(() => {});
      } catch (e) {
        console.error('[TaskProvider] Initial load error', e);
      } finally {
        setIsLoading(false);
      }
    }
    initData();

    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const updateSmartSettings = async (updates: Partial<SmartSettings>) => {
    const updated = { ...smartSettings, ...updates };
    setSmartSettings(updated);
    await Repository.saveSmartSettings(updated);
  };

  const resetSmartPreferences = async () => {
    await Promise.all([
      CategoryEngine.resetLearnedCorrections(),
      ProductivityEngine.resetSuggestionHistory(),
      Repository.saveSmartSettings(DEFAULT_SMART_SETTINGS),
    ]);
    setSmartSettings(DEFAULT_SMART_SETTINGS);
    haptics.success();
  };

  // Save tasks helper
  const persistTasks = useCallback(async (newTasks: Task[]) => {
    const normalized = newTasks.map(normalizeTask);
    setTasks(normalized);
    await Repository.saveTasks(normalized);
    WidgetDataService.refreshSnapshot().catch(() => {});
  }, []);


  // Save projects helper
  const persistProjects = useCallback(async (newProjects: Project[]) => {
    setProjects(newProjects);
    await Repository.saveProjects(newProjects);
  }, []);

  // Save tags helper
  const persistTags = useCallback(async (newTags: Tag[]) => {
    setTags(newTags);
    await Repository.saveTags(newTags);
  }, []);

  // Register Undo with auto-dismiss lifecycle
  const triggerUndoableAction = (action: UndoAction) => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    setActiveUndoAction(action);
    undoTimeoutRef.current = setTimeout(() => {
      setActiveUndoAction(null);
      undoTimeoutRef.current = null;
    }, 4000);
  };

  const dismissUndo = () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    setActiveUndoAction(null);
  };

  const undoLastAction = async () => {
    if (!activeUndoAction) return;
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    const previous = activeUndoAction.previousTasks;
    setActiveUndoAction(null);
    haptics.medium();
    await persistTasks(previous);
  };

  // --- Task CRUD ---
  const addTask = async (taskData: Partial<Task>): Promise<Task> => {
    const newTask = normalizeTask({
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: tasks.length,
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          action: 'created',
          timestamp: new Date().toISOString(),
          details: 'Created task',
        },
      ],
    });

    // Schedule notification if reminder set
    if (newTask.reminder && newTask.reminder !== 'none') {
      try {
        const notifId = await NotificationService.scheduleTaskReminder(newTask);
        if (notifId) newTask.notificationId = notifId;
      } catch (e) {
        console.warn('[TaskProvider] Reminder scheduling warning:', e);
      }
    }

    const updatedTasks = [newTask, ...tasks];
    await persistTasks(updatedTasks);
    haptics.medium();

    triggerUndoableAction({
      id: `undo-${Date.now()}`,
      message: `Created "${newTask.title}"`,
      type: 'CREATE',
      actionType: 'CREATE',
      taskId: newTask.id,
      taskTitle: newTask.title,
      undoAvailable: true,
      previousTasks: tasks,
    });

    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<void> => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const previousTasks = [...tasks];

    const updatedTasks = await Promise.all(
      tasks.map(async (t) => {
        if (t.id !== id) return t;

        const updated: Task = normalizeTask({
          ...t,
          ...updates,
          updatedAt: new Date().toISOString(),
          activityLogs: [
            ...(t.activityLogs || []),
            {
              id: `act-${Date.now()}`,
              action: 'updated',
              timestamp: new Date().toISOString(),
              details: 'Updated properties',
            },
          ],
        });

        // If date/time/reminder/reminderConfig changed, reschedule or cancel notification
        if (
          updates.reminderConfig !== undefined ||
          updates.reminder !== undefined ||
          updates.dueDate !== undefined ||
          updates.dueTime !== undefined ||
          updates.completed !== undefined
        ) {
          try {
            if ((updated.reminderConfig?.enabled || (updated.reminder && updated.reminder !== 'none')) && !updated.completed) {
              const notifId = await NotificationService.scheduleTaskReminder(updated);
              updated.notificationId = notifId;
            } else if (t.notificationId || t.id) {
              await NotificationService.cancelTaskReminder(t.notificationId, t.id);
              updated.notificationId = undefined;
            }
          } catch (e) {
            console.warn('[TaskProvider] Notification reschedule warning:', e);
          }
        }


        return updated;
      })
    );

    await persistTasks(updatedTasks);

    // Contextual notifications on specific updates
    if (updates.projectId !== undefined && updates.projectId !== target.projectId) {
      const proj = projects.find((p) => p.id === updates.projectId);
      const projName = proj ? proj.name : 'Project';
      triggerUndoableAction({
        id: `undo-${Date.now()}`,
        message: updates.projectId ? `Added "${target.title}" to ${projName}` : `Moved "${target.title}" to Inbox`,
        type: updates.projectId ? 'ASSIGN_PROJECT' : 'MOVE',
        actionType: updates.projectId ? 'ASSIGN_PROJECT' : 'MOVE',
        taskId: target.id,
        taskTitle: target.title,
        projectName: projName,
        undoAvailable: true,
        previousTasks,
      });
    } else if (updates.priority !== undefined && updates.priority !== target.priority) {
      triggerUndoableAction({
        id: `undo-${Date.now()}`,
        message: `Priority updated for "${target.title}"`,
        type: 'PRIORITY_CHANGED',
        actionType: 'PRIORITY_CHANGED',
        taskId: target.id,
        taskTitle: target.title,
        undoAvailable: true,
        previousTasks,
      });
    } else if (updates.dueDate !== undefined && updates.dueDate !== target.dueDate) {
      triggerUndoableAction({
        id: `undo-${Date.now()}`,
        message: `Due date changed for "${target.title}"`,
        type: 'DUE_DATE_CHANGED',
        actionType: 'DUE_DATE_CHANGED',
        taskId: target.id,
        taskTitle: target.title,
        undoAvailable: true,
        previousTasks,
      });
    }
  };

  const toggleTaskCompletion = async (id: string): Promise<void> => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const previousTasks = [...tasks];
    const isNowCompleted = !target.completed;
    haptics.success();

    let nextTasks = [...tasks];

    if (isNowCompleted && target.recurrence && target.recurrence.frequency !== 'never') {
      const nextOccurrence = RecurrenceEngine.generateNextTaskOccurrence(target);
      if (nextOccurrence) {
        const normNext = normalizeTask(nextOccurrence);
        if (normNext.reminder && normNext.reminder !== 'none') {
          try {
            const notifId = await NotificationService.scheduleTaskReminder(normNext);
            if (notifId) normNext.notificationId = notifId;
          } catch {}
        }
        nextTasks = [normNext, ...nextTasks];
      }
    }

    if (isNowCompleted && target.notificationId) {
      try {
        await NotificationService.cancelTaskReminder(target.notificationId);
      } catch {}
    }

    const actionType: 'completed' | 'reopened' = isNowCompleted ? 'completed' : 'reopened';

    const updatedTasks: Task[] = nextTasks.map((t) => {
      if (t.id !== id) return t;
      const newLog: ActivityLog = {
        id: `act-${Date.now()}`,
        action: actionType,
        timestamp: new Date().toISOString(),
      };
      return normalizeTask({
        ...t,
        completed: isNowCompleted,
        completedAt: isNowCompleted ? new Date().toISOString() : undefined,
        notificationId: isNowCompleted ? undefined : t.notificationId,
        updatedAt: new Date().toISOString(),
        activityLogs: [...(t.activityLogs || []), newLog],
      });
    });

    await persistTasks(updatedTasks);

    triggerUndoableAction({
      id: `undo-${Date.now()}`,
      message: isNowCompleted ? `Completed "${target.title}"` : `Reopened "${target.title}"`,
      type: isNowCompleted ? 'COMPLETE' : 'UNCOMPLETE',
      actionType: isNowCompleted ? 'COMPLETE' : 'UNCOMPLETE',
      taskId: target.id,
      taskTitle: target.title,
      undoAvailable: true,
      previousTasks,
    });
  };

  const toggleTaskPin = async (id: string): Promise<void> => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const previousTasks = [...tasks];
    const isNowPinned = !target.isPinned;
    haptics.medium();

    const updatedTasks: Task[] = tasks.map((t) => {
      if (t.id !== id) return t;
      return normalizeTask({
        ...t,
        isPinned: isNowPinned,
        updatedAt: new Date().toISOString(),
        activityLogs: [
          ...(t.activityLogs || []),
          {
            id: `act-${Date.now()}`,
            action: 'updated',
            timestamp: new Date().toISOString(),
            details: isNowPinned ? 'Pinned task' : 'Unpinned task',
          },
        ],
      });
    });

    await persistTasks(updatedTasks);

    triggerUndoableAction({
      id: `undo-${Date.now()}`,
      message: isNowPinned ? `Pinned "${target.title}"` : `Unpinned "${target.title}"`,
      type: isNowPinned ? 'PIN' : 'UNPIN',
      actionType: isNowPinned ? 'PIN' : 'UNPIN',
      taskId: target.id,
      taskTitle: target.title,
      undoAvailable: true,
      previousTasks,
    });
  };

  const toggleTaskFavorite = async (id: string): Promise<void> => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const previousTasks = [...tasks];
    const isNowFavorite = !target.isFavorite;
    haptics.light();

    const updatedTasks: Task[] = tasks.map((t) => {
      if (t.id !== id) return t;
      return normalizeTask({
        ...t,
        isFavorite: isNowFavorite,
        updatedAt: new Date().toISOString(),
        activityLogs: [
          ...(t.activityLogs || []),
          {
            id: `act-${Date.now()}`,
            action: 'updated',
            timestamp: new Date().toISOString(),
            details: isNowFavorite ? 'Favorited task' : 'Unfavorited task',
          },
        ],
      });
    });

    await persistTasks(updatedTasks);

    triggerUndoableAction({
      id: `undo-${Date.now()}`,
      message: isNowFavorite ? `Added "${target.title}" to Favorites` : `Removed "${target.title}" from Favorites`,
      type: isNowFavorite ? 'FAVOURITE' : 'UNFAVOURITE',
      actionType: isNowFavorite ? 'FAVOURITE' : 'UNFAVOURITE',
      taskId: target.id,
      taskTitle: target.title,
      undoAvailable: true,
      previousTasks,
    });
  };

  const deleteTask = async (id: string): Promise<void> => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    try {
      await NotificationService.cancelTaskReminder(target.notificationId, target.id);
    } catch {}

    const previousTasks = [...tasks];

    const updatedTasks = tasks.filter((t) => t.id !== id);
    haptics.heavy();

    await persistTasks(updatedTasks);

    triggerUndoableAction({
      id: `undo-${Date.now()}`,
      message: `Deleted "${target.title}"`,
      type: 'DELETE',
      actionType: 'DELETE',
      taskId: target.id,
      taskTitle: target.title,
      undoAvailable: true,
      previousTasks,
    });
  };

  // --- Subtask Operations ---
  const addSubtask = async (taskId: string, title: string): Promise<void> => {
    const newSub: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = tasks.map((t) => {
      if (t.id !== taskId) return t;
      return normalizeTask({
        ...t,
        subtasks: [...(t.subtasks || []), newSub],
        updatedAt: new Date().toISOString(),
      });
    });

    haptics.light();
    await persistTasks(updatedTasks);
  };

  const toggleSubtask = async (taskId: string, subtaskId: string): Promise<void> => {
    const updatedTasks = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const subtasks = (t.subtasks || []).map((s) =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      );
      return normalizeTask({
        ...t,
        subtasks,
        updatedAt: new Date().toISOString(),
      });
    });

    haptics.selection();
    await persistTasks(updatedTasks);
  };

  const deleteSubtask = async (taskId: string, subtaskId: string): Promise<void> => {
    const updatedTasks = tasks.map((t) => {
      if (t.id !== taskId) return t;
      return normalizeTask({
        ...t,
        subtasks: (t.subtasks || []).filter((s) => s.id !== subtaskId),
        updatedAt: new Date().toISOString(),
      });
    });

    haptics.light();
    await persistTasks(updatedTasks);
  };

  // --- Project CRUD ---
  const addProject = async (projectData: Partial<Project>): Promise<Project> => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: (projectData.name || 'New Project').trim(),
      description: projectData.description || '',
      icon: projectData.icon || 'Folder',
      color: projectData.color || '#007AFF',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      order: projects.length,
    };

    const updatedProjects = [...projects, newProject];
    await persistProjects(updatedProjects);
    haptics.medium();
    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>): Promise<void> => {
    const updatedProjects = projects.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    await persistProjects(updatedProjects);
  };

  const deleteProject = async (
    id: string,
    action: 'move_to_inbox' | 'delete_tasks' = 'move_to_inbox'
  ): Promise<void> => {
    const updatedProjects = projects.filter((p) => p.id !== id);

    let updatedTasks: Task[] = [];
    if (action === 'delete_tasks') {
      updatedTasks = tasks
        .filter((t) => {
          const currentProjects = t.projectIds || (t.projectId ? [t.projectId] : []);
          const otherProjects = currentProjects.filter((pId) => pId !== id);
          // If task only belonged to this project and wasn't in inbox, delete it
          if (otherProjects.length === 0 && !t.inbox) {
            return false;
          }
          return true;
        })
        .map((t) => {
          const currentProjects = t.projectIds || (t.projectId ? [t.projectId] : []);
          const otherProjects = currentProjects.filter((pId) => pId !== id);
          return normalizeTask({
            ...t,
            projectIds: otherProjects,
            projectId: otherProjects[0],
          });
        });
    } else {
      // move_to_inbox: remove project from projectIds, set inbox = true if no other projects
      updatedTasks = tasks.map((t) => {
        const currentProjects = t.projectIds || (t.projectId ? [t.projectId] : []);
        const otherProjects = currentProjects.filter((pId) => pId !== id);
        const shouldBeInbox = t.inbox || otherProjects.length === 0;
        return normalizeTask({
          ...t,
          projectIds: otherProjects,
          projectId: otherProjects[0],
          inbox: shouldBeInbox,
        });
      });
    }

    haptics.heavy();
    await Promise.all([persistProjects(updatedProjects), persistTasks(updatedTasks)]);
  };

  // --- Tag CRUD ---
  const addTag = async (name: string, color: string): Promise<Tag> => {
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: name.toLowerCase().replace('#', '').trim(),
      color,
      createdAt: new Date().toISOString(),
    };
    const updatedTags = [...tags, newTag];
    await persistTags(updatedTags);
    return newTag;
  };

  const deleteTag = async (id: string): Promise<void> => {
    const tagToDelete = tags.find((t) => t.id === id);
    const updatedTags = tags.filter((t) => t.id !== id);

    let updatedTasks = tasks;
    if (tagToDelete) {
      updatedTasks = tasks.map((t) => ({
        ...t,
        tags: (t.tags || []).filter((tagName) => tagName !== tagToDelete.name),
      }));
    }

    await Promise.all([persistTags(updatedTags), persistTasks(updatedTasks)]);
  };

  // --- Bulk Operations ---
  const bulkCompleteTasks = async (taskIds: string[]): Promise<void> => {
    const previousTasks = [...tasks];
    const updatedTasks = tasks.map((t) =>
      taskIds.includes(t.id) ? normalizeTask({ ...t, completed: true, completedAt: new Date().toISOString() }) : t
    );
    haptics.success();
    await persistTasks(updatedTasks);
    triggerUndoableAction({
      id: `undo-${Date.now()}`,
      message: `Completed ${taskIds.length} tasks`,
      type: 'COMPLETE',
      actionType: 'COMPLETE',
      count: taskIds.length,
      undoAvailable: true,
      previousTasks,
    });
  };

  const bulkDeleteTasks = async (taskIds: string[]): Promise<void> => {
    const previousTasks = [...tasks];
    const updatedTasks = tasks.filter((t) => !taskIds.includes(t.id));
    haptics.heavy();
    await persistTasks(updatedTasks);
    triggerUndoableAction({
      id: `undo-${Date.now()}`,
      message: `Deleted ${taskIds.length} tasks`,
      type: 'DELETE',
      actionType: 'DELETE',
      count: taskIds.length,
      undoAvailable: true,
      previousTasks,
    });
  };

  const bulkMoveTasks = async (taskIds: string[], projectId: string | undefined): Promise<void> => {
    const previousTasks = [...tasks];
    const updatedTasks = tasks.map((t) =>
      taskIds.includes(t.id)
        ? normalizeTask({
            ...t,
            projectId,
            projectIds: projectId ? [projectId] : [],
            inbox: !projectId,
          })
        : t
    );
    haptics.medium();
    await persistTasks(updatedTasks);
    triggerUndoableAction({
      id: `undo-${Date.now()}`,
      message: `Moved ${taskIds.length} tasks`,
      type: 'MOVE',
      actionType: 'MOVE',
      count: taskIds.length,
      undoAvailable: true,
      previousTasks,
    });
  };

  const bulkRescheduleTasks = async (
    taskIds: string[],
    dueDate: string | undefined,
    dueTime?: string | undefined
  ): Promise<void> => {
    const previousTasks = [...tasks];
    const updatedTasks = tasks.map((t) => {
      if (!taskIds.includes(t.id)) return t;
      return normalizeTask({
        ...t,
        dueDate,
        dueTime: dueTime !== undefined ? dueTime : t.dueTime,
      });
    });
    haptics.warning();
    await persistTasks(updatedTasks);
    triggerUndoableAction({
      id: `undo-${Date.now()}`,
      message: `Rescheduled ${taskIds.length} tasks`,
      type: 'bulk_update',
      previousTasks,
    });
  };

  const bulkSetPriority = async (taskIds: string[], priority: PriorityLevel): Promise<void> => {
    const previousTasks = [...tasks];
    const updatedTasks = tasks.map((t) => (taskIds.includes(t.id) ? normalizeTask({ ...t, priority }) : t));
    haptics.selection();
    await persistTasks(updatedTasks);
    triggerUndoableAction({
      id: `undo-${Date.now()}`,
      message: `Updated priority for ${taskIds.length} tasks`,
      type: 'bulk_update',
      previousTasks,
    });
  };

  // --- Derived Smart Lists ---
  const todayStr = getTodayDateString();

  // Incomplete today tasks
  const todayTasks = tasks.filter((t) => !t.completed && t.dueDate === todayStr);
  // All tasks assigned to today (both completed & incomplete) for accurate progress tracking
  const todayAllTasks = tasks.filter((t) => t.dueDate === todayStr);
  // Explicit Inbox Tasks: incomplete tasks marked with inbox === true
  const inboxTasks = tasks.filter((t) => !t.completed && t.inbox === true);
  const upcomingTasks = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate > todayStr);
  const overdueTasks = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr);
  const highPriorityTasks = tasks.filter(
    (t) => !t.completed && (t.priority === 'high' || t.priority === 'urgent')
  );
  const pinnedTasks = tasks.filter((t) => !t.completed && t.isPinned);
  const favoriteTasks = tasks.filter((t) => t.isFavorite);
  const completedTasks = tasks.filter((t) => t.completed);

  const clearAllData = async (): Promise<void> => {
    await Repository.clearAllData();
    setTasks([]);
    setProjects([]);
    setTags([]);
    haptics.heavy();
  };

  const applyTemplate = async (templateId: string): Promise<boolean> => {
    const success = await TemplateService.applyTemplate(templateId);
    if (success) {
      const [newTasks, newProjects, newTags] = await Promise.all([
        Repository.loadTasks(),
        Repository.loadProjects(),
        Repository.loadTags(),
      ]);
      setTasks((newTasks || []).map(normalizeTask));
      setProjects(newProjects || []);
      setTags(newTags || []);
      haptics.success();
    }
    return success;
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        projects,
        tags,
        isLoading,
        activeUndoAction,
        dismissUndo,
        undoLastAction,
        clearAllData,
        applyTemplate,
        addTask,
        updateTask,
        toggleTaskCompletion,
        toggleTaskPin,
        toggleTaskFavorite,
        deleteTask,
        addSubtask,
        toggleSubtask,
        deleteSubtask,
        addProject,
        updateProject,
        deleteProject,
        addTag,
        deleteTag,
        bulkCompleteTasks,
        bulkDeleteTasks,
        bulkMoveTasks,
        bulkRescheduleTasks,
        bulkSetPriority,
        todayTasks,
        todayAllTasks,
        inboxTasks,
        upcomingTasks,
        overdueTasks,
        highPriorityTasks,
        pinnedTasks,
        favoriteTasks,
        completedTasks,
        smartSettings,
        updateSmartSettings,
        resetSmartPreferences,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskStore = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskStore must be used within a TaskProvider');
  }
  return context;
};
