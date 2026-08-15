import { Task } from '../../models/task';
import { TaskScoreEngine } from './TaskScoreEngine';
import { AvailabilityAnalyzer } from './AvailabilityAnalyzer';
import { ScheduleRecommendation } from '../types';

export class SchedulingEngine {
  public static getRecommendedFocusTask(tasks: Task[], todayStr: string): Task | null {
    const activeTasks = tasks.filter((t) => !t.completed);
    if (activeTasks.length === 0) return null;

    let bestTask: Task | null = null;
    let highestScore = -1;

    for (const task of activeTasks) {
      const score = TaskScoreEngine.calculateScore(task, todayStr);
      if (score > highestScore) {
        highestScore = score;
        bestTask = task;
      }
    }

    return bestTask;
  }

  public static getSchedulingRecommendations(
    tasks: Task[],
    todayStr: string
  ): ScheduleRecommendation[] {
    const recommendations: ScheduleRecommendation[] = [];
    const todayWorkload = AvailabilityAnalyzer.analyzeDay(tasks, todayStr);

    // If today is busy or overloaded, find candidate tasks to reschedule
    if (todayWorkload.status === 'busy' || todayWorkload.status === 'overloaded') {
      const activeTodayTasks = tasks.filter(
        (t) => !t.completed && t.dueDate === todayStr && !t.isPinned && t.priority !== 'urgent'
      );

      // Sort by score ascending (lowest priority first)
      activeTodayTasks.sort(
        (a, b) => TaskScoreEngine.calculateScore(a, todayStr) - TaskScoreEngine.calculateScore(b, todayStr)
      );

      const candidate = activeTodayTasks[0];
      if (candidate) {
        const nextDate = AvailabilityAnalyzer.findNextAvailableDate(tasks, todayStr);
        const nextWorkload = AvailabilityAnalyzer.analyzeDay(tasks, nextDate);

        const nextDateObj = new Date(nextDate);
        const weekdayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'long' });

        recommendations.push({
          taskId: candidate.id,
          taskTitle: candidate.title,
          suggestedDate: nextDate,
          reason: `Today has ${todayWorkload.count} tasks. Moving "${candidate.title}" to ${weekdayName} would balance your workload.`,
          score: TaskScoreEngine.calculateScore(candidate, todayStr),
          workloadStatus: nextWorkload.status,
        });
      }
    }

    return recommendations;
  }
}
