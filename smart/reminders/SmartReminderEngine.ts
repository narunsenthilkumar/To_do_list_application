import { Task, PriorityLevel, ReminderOption } from '../../models/task';
import { ReminderRules } from './ReminderRules';
import { ReminderRecommendation, ParsedTask } from '../types';

export class SmartReminderEngine {
  public static recommendForTask(task: Task): ReminderRecommendation {
    return ReminderRules.evaluate(
      task.title,
      task.priority,
      task.category,
      task.estimatedDuration,
      !!task.dueTime
    );
  }

  public static recommendForParsed(parsed: ParsedTask): ReminderRecommendation {
    return ReminderRules.evaluate(
      parsed.title,
      parsed.priority,
      parsed.category,
      parsed.estimatedDuration,
      parsed.hasMatchedTime
    );
  }
}
