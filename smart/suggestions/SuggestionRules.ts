import { Task } from '../../models/task';
import { SmartSuggestion } from '../types';
import { AvailabilityAnalyzer } from '../scheduling/AvailabilityAnalyzer';
import { SchedulingEngine } from '../scheduling/SchedulingEngine';

export class SuggestionRules {
  public static generateSuggestions(
    tasks: Task[],
    todayStr: string,
    currentStreak: number = 0
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const now = new Date();
    const currentHour = now.getHours();

    const activeTasks = tasks.filter((t) => !t.completed);
    const todayTasks = activeTasks.filter((t) => t.dueDate === todayStr);
    const overdueTasks = activeTasks.filter((t) => t.dueDate && t.dueDate < todayStr);
    const completedToday = tasks.filter((t) => t.completed && t.completedAt && t.completedAt.startsWith(todayStr));

    const todayWorkload = AvailabilityAnalyzer.analyzeDay(tasks, todayStr);
    const topFocusTask = SchedulingEngine.getRecommendedFocusTask(todayTasks.length > 0 ? todayTasks : activeTasks, todayStr);

    // 1. Overdue Task Alert (High Priority)
    if (overdueTasks.length > 0) {
      suggestions.push({
        id: `overdue_${todayStr}_${overdueTasks.length}`,
        type: 'overdue_review',
        title: `⚠️ ${overdueTasks.length} Overdue ${overdueTasks.length === 1 ? 'Task' : 'Tasks'}`,
        description:
          overdueTasks.length === 1
            ? `"${overdueTasks[0].title}" was scheduled earlier. Review or move to today.`
            : `You have ${overdueTasks.length} tasks from previous days. Let's get them organized.`,
        actionLabel: 'Move to Today',
        actionType: 'move_today',
        data: { overdueIds: overdueTasks.map((t) => t.id) },
        priorityScore: 90,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Morning Summary (5:00 - 12:00)
    if (currentHour >= 5 && currentHour < 12) {
      const highCount = todayTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;
      const mediumCount = todayTasks.filter((t) => t.priority === 'medium').length;
      const normalCount = todayTasks.length - highCount - mediumCount;

      let busiestPeriod = 'evenly spread';
      if (todayWorkload.morningCount > todayWorkload.afternoonCount && todayWorkload.morningCount > todayWorkload.eveningCount) {
        busiestPeriod = 'Morning (8 AM – 12 PM)';
      } else if (todayWorkload.afternoonCount > todayWorkload.morningCount && todayWorkload.afternoonCount > todayWorkload.eveningCount) {
        busiestPeriod = 'Afternoon (12 PM – 5 PM)';
      } else if (todayWorkload.eveningCount > 0) {
        busiestPeriod = 'Evening (5 PM – 9 PM)';
      }

      const focusText = topFocusTask ? `\n• Suggested start: "${topFocusTask.title}"` : '';

      suggestions.push({
        id: `morning_${todayStr}`,
        type: 'morning_summary',
        title: 'Good morning 👋',
        description: `You have ${todayTasks.length} tasks scheduled today (${highCount} high, ${mediumCount} medium, ${normalCount} normal). Busiest period: ${busiestPeriod}.${focusText}`,
        actionLabel: topFocusTask ? 'Start Focus' : 'View Plan',
        actionType: topFocusTask ? 'start_focus' : 'view_plan',
        data: { topTaskId: topFocusTask?.id },
        priorityScore: 75,
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Evening Summary (18:00 - 23:59)
    if (currentHour >= 18) {
      const remainingCount = todayTasks.length;
      const doneCount = completedToday.length;

      // Tomorrow workload
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const y = tomorrow.getFullYear();
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const d = String(tomorrow.getDate()).padStart(2, '0');
      const tomorrowStr = `${y}-${m}-${d}`;
      const tomorrowWorkload = AvailabilityAnalyzer.analyzeDay(tasks, tomorrowStr);

      suggestions.push({
        id: `evening_${todayStr}`,
        type: 'evening_summary',
        title: 'Good evening 🌙',
        description: `Today's progress: ✓ ${doneCount} completed, ○ ${remainingCount} remaining. Tomorrow has ${tomorrowWorkload.count} tasks planned.`,
        actionLabel: remainingCount > 0 ? 'Reschedule Remaining' : 'Great Work',
        actionType: remainingCount > 0 ? 'reschedule' : 'dismiss',
        data: { remainingIds: todayTasks.map((t) => t.id) },
        priorityScore: 70,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Workload Warning
    if (todayWorkload.status === 'overloaded') {
      suggestions.push({
        id: `workload_${todayStr}`,
        type: 'workload_warning',
        title: '💡 Busy Day Ahead',
        description: `You have ${todayWorkload.count} tasks scheduled today. Consider deferring lower-priority items.`,
        actionLabel: 'Balance Schedule',
        actionType: 'reschedule',
        priorityScore: 80,
        timestamp: new Date().toISOString(),
      });
    }

    // 5. Streak Celebration
    if (currentStreak >= 3 && [3, 7, 14, 30, 60, 100].includes(currentStreak)) {
      suggestions.push({
        id: `streak_${todayStr}_${currentStreak}`,
        type: 'streak_praise',
        title: `🔥 ${currentStreak} Day Streak!`,
        description: `You've maintained your productivity streak for ${currentStreak} consecutive days. Keep the momentum going!`,
        actionLabel: 'Celebrate',
        actionType: 'dismiss',
        priorityScore: 60,
        timestamp: new Date().toISOString(),
      });
    }

    return suggestions.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}
