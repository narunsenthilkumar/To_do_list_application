import { Task, RecurrenceRule } from '../../models/task';

export class RecurrenceEngine {
  /**
   * Calculates the next occurrence date (YYYY-MM-DD) based on a recurrence rule and starting date.
   */
  static getNextDueDate(baseDateStr: string, rule: RecurrenceRule): string {
    const baseDate = new Date(baseDateStr);
    if (isNaN(baseDate.getTime())) {
      const today = new Date();
      return this.formatDate(today);
    }

    const nextDate = new Date(baseDate);

    switch (rule.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + (rule.interval || 1));
        break;

      case 'weekdays': {
        // Move to next weekday (Mon-Fri)
        do {
          nextDate.setDate(nextDate.getDate() + 1);
        } while (nextDate.getDay() === 0 || nextDate.getDay() === 6);
        break;
      }

      case 'weekly': {
        const step = (rule.interval || 1) * 7;
        nextDate.setDate(nextDate.getDate() + step);
        break;
      }

      case 'monthly': {
        const interval = rule.interval || 1;
        const currentMonth = nextDate.getMonth();
        nextDate.setMonth(currentMonth + interval);
        // Handle end of month rollover e.g. Jan 31 -> Feb 28
        if (rule.dayOfMonth && nextDate.getDate() !== rule.dayOfMonth) {
          nextDate.setDate(0); // Last day of previous month
        }
        break;
      }

      case 'yearly': {
        const interval = rule.interval || 1;
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      }

      default:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
    }

    return this.formatDate(nextDate);
  }

  /**
   * Given a completed recurring task, generates the next Task instance.
   */
  static generateNextTaskOccurrence(completedTask: Task): Task | null {
    if (!completedTask.recurrence || completedTask.recurrence.frequency === 'never') {
      return null;
    }

    const baseDueDate = completedTask.dueDate || this.formatDate(new Date());
    const nextDueDate = this.getNextDueDate(baseDueDate, completedTask.recurrence);

    // Check end date restriction if present
    if (completedTask.recurrence.endDate && nextDueDate > completedTask.recurrence.endDate) {
      return null;
    }

    const nextTask: Task = {
      ...completedTask,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      completed: false,
      completedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: nextDueDate,
      subtasks: completedTask.subtasks.map(s => ({
        ...s,
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        completed: false,
      })),
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          action: 'created',
          timestamp: new Date().toISOString(),
          details: `Generated recurring occurrence from previous task (${completedTask.id})`
        }
      ]
    };

    return nextTask;
  }

  private static formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
