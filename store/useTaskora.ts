import { useState, useMemo, useEffect } from 'react';
import { useTaskStore } from './TaskContext';
import { useFocusStore } from './FocusContext';
import { useTheme } from './ThemeContext';
import { Task, PriorityLevel, RecurrenceRule, ReminderOption, Subtask } from '../models/task';
import { Project } from '../models/project';
import { Tag } from '../models/tag';
import { getTodayDateString } from '../services/storage/repository';
import {
  ProductivityEngine,
  SchedulingEngine,
  SmartSuggestion,
  ScheduleRecommendation,
} from '../smart';
import { calculateTasksProgress } from '../utils/progress';

export const useTasks = () => {
  const store = useTaskStore();
  return {
    tasks: store.tasks,
    todayTasks: store.todayTasks,
    todayAllTasks: store.todayAllTasks,
    inboxTasks: store.inboxTasks,
    upcomingTasks: store.upcomingTasks,
    overdueTasks: store.overdueTasks,
    highPriorityTasks: store.highPriorityTasks,
    pinnedTasks: store.pinnedTasks,
    favoriteTasks: store.favoriteTasks,
    completedTasks: store.completedTasks,
    isLoading: store.isLoading,
    addTask: store.addTask,
    updateTask: store.updateTask,
    toggleTaskCompletion: store.toggleTaskCompletion,
    toggleTaskPin: store.toggleTaskPin,
    toggleTaskFavorite: store.toggleTaskFavorite,
    deleteTask: store.deleteTask,
    addSubtask: store.addSubtask,
    toggleSubtask: store.toggleSubtask,
    deleteSubtask: store.deleteSubtask,
    bulkCompleteTasks: store.bulkCompleteTasks,
    bulkDeleteTasks: store.bulkDeleteTasks,
    bulkMoveTasks: store.bulkMoveTasks,
    bulkRescheduleTasks: store.bulkRescheduleTasks,
    bulkSetPriority: store.bulkSetPriority,
    activeUndoAction: store.activeUndoAction,
    dismissUndo: store.dismissUndo,
    undoLastAction: store.undoLastAction,
  };
};

export const useProjects = () => {
  const store = useTaskStore();
  return {
    projects: store.projects,
    addProject: store.addProject,
    updateProject: store.updateProject,
    deleteProject: store.deleteProject,
  };
};

export const useTags = () => {
  const store = useTaskStore();
  return {
    tags: store.tags,
    addTag: store.addTag,
    deleteTag: store.deleteTag,
  };
};

export const useFocusTimer = () => {
  const store = useFocusStore();
  return {
    mode: store.mode,
    isActive: store.isActive,
    secondsRemaining: store.secondsRemaining,
    selectedTaskId: store.selectedTaskId,
    completedSessionsToday: store.completedSessionsToday,
    settings: store.settings,
    streakStats: store.streakStats,
    setSelectedTaskId: store.setSelectedTaskId,
    startTimer: store.startTimer,
    pauseTimer: store.pauseTimer,
    resetTimer: store.resetTimer,
    skipSession: store.skipSession,
    updateSettings: store.updateSettings,
    recordCompletedTaskStreak: store.recordCompletedTaskStreak,
  };
};

export const useStatistics = () => {
  const store = useTaskStore();
  const focusStore = useFocusStore();

  const totalTasksCount = store.tasks.length;
  const completedTasksCount = store.completedTasks.length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const pinnedTasksCount = store.pinnedTasks.length;
  const favoriteTasksCount = store.favoriteTasks.length;

  const todayStats = calculateTasksProgress(store.todayAllTasks);

  return {
    streakStats: focusStore.streakStats,
    completedTodayCount: todayStats.completedCount,
    totalTodayCount: todayStats.totalCount,
    todayProgressPercent: todayStats.progressPercent,
    totalCompletedCount: completedTasksCount,
    pinnedTasksCount,
    favoriteTasksCount,
    completionRate,
    completedSessionsToday: focusStore.completedSessionsToday,
  };
};

export const useSearch = () => {
  const { tasks, projects, tags } = useTaskStore();
  const [query, setQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filterPinned, setFilterPinned] = useState<boolean | null>(null);
  const [filterFavorite, setFilterFavorite] = useState<boolean | null>(null);

  const filteredTasks = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tasks.filter((t) => {
      if (q) {
        const titleMatch = t.title.toLowerCase().includes(q);
        const notesMatch = t.notes ? t.notes.toLowerCase().includes(q) : false;
        const tagMatch = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
        if (!titleMatch && !notesMatch && !tagMatch) return false;
      }
      if (filterPinned && !t.isPinned) return false;
      if (filterFavorite && !t.isFavorite) return false;
      if (selectedPriority && t.priority !== selectedPriority) return false;
      if (selectedProjectId && t.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [tasks, query, filterPinned, filterFavorite, selectedPriority, selectedProjectId]);

  return {
    query,
    setQuery,
    selectedPriority,
    setSelectedPriority,
    selectedProjectId,
    setSelectedProjectId,
    filterPinned,
    setFilterPinned,
    filterFavorite,
    setFilterFavorite,
    results: filteredTasks,
    projects,
    tags,
  };
};

// Smart Suggestions Hook
export const useSmartSuggestions = () => {
  const { tasks, smartSettings } = useTaskStore();
  const { streakStats } = useFocusStore();
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const todayStr = getTodayDateString();

  useEffect(() => {
    if (!smartSettings.productivityTipsEnabled && !smartSettings.smartSchedulingEnabled) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    const computeSuggestions = async () => {
      setIsLoading(true);
      try {
        const generated = await ProductivityEngine.getActiveSuggestions(
          tasks,
          todayStr,
          streakStats.currentStreak
        );
        if (isMounted) {
          setSuggestions(generated);
        }
      } catch (e) {
        console.warn('[useSmartSuggestions] Error generating suggestions:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    computeSuggestions();

    return () => {
      isMounted = false;
    };
  }, [tasks, streakStats.currentStreak, smartSettings]);

  const dismissSuggestion = async (id: string) => {
    await ProductivityEngine.dismissSuggestion(id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  return {
    suggestions,
    isLoading,
    dismissSuggestion,
  };
};

// Smart Productivity Engine Hook
export const useSmartProductivity = () => {
  const { tasks } = useTaskStore();
  const todayStr = getTodayDateString();

  const recommendedFocusTask = useMemo(() => {
    return SchedulingEngine.getRecommendedFocusTask(tasks, todayStr);
  }, [tasks, todayStr]);

  const scheduleRecommendations = useMemo(() => {
    return SchedulingEngine.getSchedulingRecommendations(tasks, todayStr);
  }, [tasks, todayStr]);

  return {
    recommendedFocusTask,
    scheduleRecommendations,
  };
};

// Main Consolidator Hook
export const useTaskora = () => {
  const tasksHook = useTasks();
  const projectsHook = useProjects();
  const tagsHook = useTags();
  const focusHook = useFocusTimer();
  const statsHook = useStatistics();
  const searchHook = useSearch();
  const suggestionsHook = useSmartSuggestions();
  const productivityHook = useSmartProductivity();
  const { smartSettings, updateSmartSettings, resetSmartPreferences, clearAllData, applyTemplate } =
    useTaskStore();

  return {
    ...tasksHook,
    ...projectsHook,
    ...tagsHook,
    ...focusHook,
    ...statsHook,
    ...productivityHook,
    search: searchHook,
    smart: suggestionsHook,
    smartSettings,
    updateSmartSettings,
    resetSmartPreferences,
    clearAllData,
    applyTemplate,
  };
};

export { useTheme };
