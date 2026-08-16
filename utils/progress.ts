import { Task } from '../models/task';

/**
 * Derives completion progress (0 - 100%) for a single task based on:
 * - Direct task completion (100%)
 * - Completed subtasks ratio (e.g. 0/4 -> 0%, 1/4 -> 25%, 2/4 -> 50%, 3/4 -> 75%, 4/4 -> 100%)
 */
export function calculateTaskProgress(task: Task | null | undefined): number {
  if (!task) return 0;
  if (task.completed) return 100;
  
  const subtasks = task.subtasks || [];
  if (subtasks.length === 0) return 0;

  const completedCount = subtasks.filter((s) => s.completed).length;
  return Math.round((completedCount / subtasks.length) * 100);
}

export interface TasksProgressStats {
  totalCount: number;
  completedCount: number;
  activeCount: number;
  progressPercent: number;
}

/**
 * Derives aggregate completion progress for a collection of tasks (Today, Project, Calendar, etc.)
 * accurately accounting for completed tasks and in-progress subtasks.
 */
export function calculateTasksProgress(tasks: Task[] | null | undefined): TasksProgressStats {
  if (!tasks || tasks.length === 0) {
    return {
      totalCount: 0,
      completedCount: 0,
      activeCount: 0,
      progressPercent: 0,
    };
  }

  let totalScore = 0;
  let completedCount = 0;

  tasks.forEach((t) => {
    if (t.completed) {
      completedCount += 1;
      totalScore += 100;
    } else {
      totalScore += calculateTaskProgress(t);
    }
  });

  const totalCount = tasks.length;
  const activeCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round(totalScore / totalCount) : 0;

  return {
    totalCount,
    completedCount,
    activeCount,
    progressPercent,
  };
}
