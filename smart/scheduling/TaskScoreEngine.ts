import { Task, PriorityLevel } from '../../models/task';

export class TaskScoreEngine {
  private static PRIORITY_WEIGHTS: Record<PriorityLevel, number> = {
    urgent: 50,
    high: 35,
    medium: 20,
    low: 10,
    none: 5,
  };

  public static calculateScore(task: Task, todayDateStr: string): number {
    let score = 0;

    // 1. Priority Weight
    score += this.PRIORITY_WEIGHTS[task.priority] || 5;

    // 2. Pinned & Favorite Boost
    if (task.isPinned) score += 25;
    if (task.isFavorite) score += 15;

    // 3. Due Date & Overdue Urgency
    if (task.dueDate) {
      if (task.dueDate < todayDateStr) {
        // Overdue task has maximum urgency
        score += 45;
      } else if (task.dueDate === todayDateStr) {
        score += 30;

        // If specific time is approaching or passed
        if (task.dueTime) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          const [taskHour, taskMin] = task.dueTime.split(':').map(Number);
          const minutesDiff = (taskHour * 60 + taskMin) - (currentHour * 60 + currentMin);

          if (minutesDiff < 0) {
            score += 20; // past due time today
          } else if (minutesDiff <= 120) {
            score += 15; // due within 2 hours
          }
        }
      } else {
        // Upcoming within 3 days
        const targetDate = new Date(task.dueDate);
        const today = new Date(todayDateStr);
        const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) score += 18;
        else if (diffDays <= 3) score += 10;
      }
    }

    // 4. Subtasks completion factor
    if (task.subtasks && task.subtasks.length > 0) {
      const pendingSubtasks = task.subtasks.filter((s) => !s.completed).length;
      if (pendingSubtasks > 0) score += 5;
    }

    return score;
  }
}
