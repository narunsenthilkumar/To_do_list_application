import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTaskStore } from './TaskContext';
import { useFocusStore } from './FocusContext';
import { useTheme } from './ThemeContext';
import { Task } from '../models/task';
import { getTodayDateString } from '../services/storage/repository';
import {
  SmartSuggestion,
  ProductivityEngine,
  SchedulingEngine,
  NaturalLanguageParser,
  CategoryEngine,
  SmartReminderEngine,
} from '../smart';

export { useTheme };

export const useTasks = () => {
  const store = useTaskStore();
  return {
    tasks: store.tasks,
    isLoading: store.isLoading,
    todayTasks: store.todayTasks,
    inboxTasks: store.inboxTasks,
    upcomingTasks: store.upcomingTasks,
    overdueTasks: store.overdueTasks,
    highPriorityTasks: store.highPriorityTasks,
    pinnedTasks: store.pinnedTasks,
    favoriteTasks: store.favoriteTasks,
    completedTasks: store.completedTasks,
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
    undoLastAction: store.undoLastAction,
    dismissUndo: store.dismissUndo,
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
    setSelectedTaskId: store.setSelectedTaskId,
    startTimer: store.startTimer,
    pauseTimer: store.pauseTimer,
    resetTimer: store.resetTimer,
    skipSession: store.skipSession,
    updateSettings: store.updateSettings,
    streakStats: store.streakStats,
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

  return {
    streakStats: focusStore.streakStats,
    completedTodayCount: store.todayTasks.filter((t) => t.completed).length,
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
        const tagMatch = t.tags.some((tag) => tag.toLowerCase().includes(q));
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

  const refreshSuggestions = useCallback(async () => {
    if (!smartSettings.productivityTipsEnabled) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const active = await ProductivityEngine.getActiveSuggestions(
        tasks,
        todayStr,
        streakStats.currentStreak
      );
      setSuggestions(active);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [tasks, smartSettings.productivityTipsEnabled, todayStr, streakStats.currentStreak]);

  useEffect(() => {
    refreshSuggestions();
  }, [refreshSuggestions]);

  const dismissSuggestion = useCallback(async (id: string) => {
    await ProductivityEngine.dismissSuggestion(id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    suggestions,
    isLoading,
    refreshSuggestions,
    dismissSuggestion,
  };
};

// Smart Productivity Suite Hook
export const useSmartProductivity = () => {
  const { tasks, smartSettings, updateSmartSettings, resetSmartPreferences } = useTaskStore();
  const todayStr = getTodayDateString();

  const recommendedFocusTask = useMemo(() => {
    if (!smartSettings.smartSchedulingEnabled) return null;
    return SchedulingEngine.getRecommendedFocusTask(tasks, todayStr);
  }, [tasks, smartSettings.smartSchedulingEnabled, todayStr]);

  const schedulingRecommendations = useMemo(() => {
    if (!smartSettings.smartSchedulingEnabled) return [];
    return SchedulingEngine.getSchedulingRecommendations(tasks, todayStr);
  }, [tasks, smartSettings.smartSchedulingEnabled, todayStr]);

  return {
    smartSettings,
    updateSmartSettings,
    resetSmartPreferences,
    recommendedFocusTask,
    schedulingRecommendations,
    parseNaturalLanguage: NaturalLanguageParser.parse,
    categorizeTask: CategoryEngine.categorizeSync,
    recommendReminder: SmartReminderEngine.recommendForTask,
  };
};

// Consolidated Master Hook
export const useTaskora = () => {
  const tasksStore = useTaskStore();
  const focusStore = useFocusStore();

  return {
    ...tasksStore,
    ...focusStore,
  };
};
