import { PriorityLevel, ReminderOption } from '../../models/task';
import { ReminderRecommendation } from '../types';

export class ReminderRules {
  public static evaluate(
    title: string,
    priority: PriorityLevel,
    category?: string,
    estimatedDuration?: number,
    hasDueTime: boolean = false
  ): ReminderRecommendation {
    const lowerTitle = title.toLowerCase();

    // 1. High Priority or Urgent
    if (priority === 'urgent' || priority === 'high') {
      return {
        suggestedOption: '1h_before',
        label: '1 hour before',
        reason: 'High priority task — recommended 1h buffer.',
      };
    }

    // 2. Long duration / Big deliverables / Travel
    if (
      (estimatedDuration && estimatedDuration >= 60) ||
      category === 'Travel' ||
      /\b(flight|presentation|exam|interview|deadline|contract)\b/i.test(lowerTitle)
    ) {
      return {
        suggestedOption: '1d_before',
        label: '1 day before',
        reason: 'Major event/deliverable — advance preparation reminder.',
      };
    }

    // 3. Shopping / Chores / Daily errands
    if (
      category === 'Shopping' ||
      category === 'Personal' ||
      /\b(groceries|milk|buy|clean|dinner|lunch)\b/i.test(lowerTitle)
    ) {
      return {
        suggestedOption: '30m_before',
        label: '30 minutes before',
        reason: 'Errand/shopping task — 30m lead time recommended.',
      };
    }

    // 4. Meetings / Calls
    if (category === 'Meetings' || /\b(meeting|call|zoom|sync|interview)\b/i.test(lowerTitle)) {
      return {
        suggestedOption: '15m_before',
        label: '15 minutes before',
        reason: 'Meeting sync — 15m pre-call check.',
      };
    }

    // 5. Default
    if (hasDueTime) {
      return {
        suggestedOption: '30m_before',
        label: '30 minutes before',
        reason: 'Standard reminder at scheduled time.',
      };
    }

    return {
      suggestedOption: 'at_time',
      label: 'On due date at 9:00 AM',
      reason: 'Morning briefing reminder.',
    };
  }
}
