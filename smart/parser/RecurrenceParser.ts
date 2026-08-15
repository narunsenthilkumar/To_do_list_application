import { ParsedRecurrenceResult } from '../types';
import { RecurrenceFrequency, RecurrenceRule } from '../../models/task';

export class RecurrenceParser {
  public static parse(input: string): ParsedRecurrenceResult {
    const text = input.trim();
    if (!text) {
      return { matchedText: '', confidence: 0 };
    }

    const lower = text.toLowerCase();

    // 1. Daily
    if (/\b(every day|daily|every single day)\b/i.test(lower)) {
      const match = lower.match(/\b(every day|daily|every single day)\b/i)!;
      return {
        rule: { frequency: 'daily' },
        matchedText: match[0],
        confidence: 0.98,
      };
    }

    // 2. Weekdays
    if (/\b(every weekday|on weekdays|weekdays only|weekdays)\b/i.test(lower)) {
      const match = lower.match(/\b(every weekday|on weekdays|weekdays only|weekdays)\b/i)!;
      return {
        rule: { frequency: 'weekdays', daysOfWeek: [1, 2, 3, 4, 5] },
        matchedText: match[0],
        confidence: 0.98,
      };
    }

    // 3. Every [Weekday]
    const weekdayMap: { [key: string]: number } = {
      sunday: 0,
      sun: 0,
      monday: 1,
      mon: 1,
      tuesday: 2,
      tue: 2,
      wednesday: 3,
      wed: 3,
      thursday: 4,
      thu: 4,
      friday: 5,
      fri: 5,
      saturday: 6,
      sat: 6,
    };

    const everyWeekdayMatch = lower.match(/\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i);
    if (everyWeekdayMatch) {
      const dayName = everyWeekdayMatch[1].toLowerCase();
      const dayNum = weekdayMap[dayName];
      if (dayNum !== undefined) {
        return {
          rule: { frequency: 'weekly', daysOfWeek: [dayNum] },
          matchedText: everyWeekdayMatch[0],
          confidence: 0.96,
        };
      }
    }

    // 4. Weekly
    if (/\b(every week|weekly|once a week)\b/i.test(lower)) {
      const match = lower.match(/\b(every week|weekly|once a week)\b/i)!;
      return {
        rule: { frequency: 'weekly' },
        matchedText: match[0],
        confidence: 0.95,
      };
    }

    // 5. Monthly
    if (/\b(every month|monthly|once a month)\b/i.test(lower)) {
      const match = lower.match(/\b(every month|monthly|once a month)\b/i)!;
      return {
        rule: { frequency: 'monthly' },
        matchedText: match[0],
        confidence: 0.95,
      };
    }

    // 6. Yearly
    if (/\b(every year|yearly|annually)\b/i.test(lower)) {
      const match = lower.match(/\b(every year|yearly|annually)\b/i)!;
      return {
        rule: { frequency: 'yearly' },
        matchedText: match[0],
        confidence: 0.95,
      };
    }

    return { matchedText: '', confidence: 0 };
  }
}
