import { Task } from '../../models/task';

export interface DayWorkload {
  dateStr: string;
  count: number;
  status: 'light' | 'optimal' | 'busy' | 'overloaded';
  morningCount: number;
  afternoonCount: number;
  eveningCount: number;
}

export class AvailabilityAnalyzer {
  public static analyzeDay(tasks: Task[], dateStr: string): DayWorkload {
    const dayTasks = tasks.filter((t) => !t.completed && t.dueDate === dateStr);
    let morningCount = 0;
    let afternoonCount = 0;
    let eveningCount = 0;

    dayTasks.forEach((t) => {
      if (t.dueTime) {
        const hour = parseInt(t.dueTime.split(':')[0], 10);
        if (hour < 12) morningCount++;
        else if (hour < 17) afternoonCount++;
        else eveningCount++;
      }
    });

    const count = dayTasks.length;
    let status: 'light' | 'optimal' | 'busy' | 'overloaded' = 'optimal';
    if (count <= 2) status = 'light';
    else if (count <= 5) status = 'optimal';
    else if (count <= 8) status = 'busy';
    else status = 'overloaded';

    return {
      dateStr,
      count,
      status,
      morningCount,
      afternoonCount,
      eveningCount,
    };
  }

  public static findNextAvailableDate(tasks: Task[], startDateStr: string): string {
    const start = new Date(startDateStr);

    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(start);
      candidate.setDate(candidate.getDate() + i);
      const y = candidate.getFullYear();
      const m = String(candidate.getMonth() + 1).padStart(2, '0');
      const d = String(candidate.getDate()).padStart(2, '0');
      const candidateStr = `${y}-${m}-${d}`;

      const workload = this.analyzeDay(tasks, candidateStr);
      if (workload.status === 'light' || workload.status === 'optimal') {
        return candidateStr;
      }
    }

    // Default to tomorrow
    const fallback = new Date(start);
    fallback.setDate(fallback.getDate() + 1);
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const d = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
