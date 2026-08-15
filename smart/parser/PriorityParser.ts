import { ParsedPriorityResult } from '../types';
import { PriorityLevel } from '../../models/task';

export class PriorityParser {
  public static parse(input: string): ParsedPriorityResult {
    const text = input.trim();
    if (!text) {
      return { priority: 'none', matchedText: '', confidence: 0 };
    }

    const lower = text.toLowerCase();

    // 1. Urgent / Critical
    const urgentRegex = /\b(urgent|critical|immediately|asap|top priority|highest priority|p0|p1)\b/i;
    if (urgentRegex.test(lower)) {
      const match = lower.match(urgentRegex)!;
      return {
        priority: 'urgent',
        matchedText: match[0],
        confidence: 0.98,
      };
    }

    // 2. High priority
    const highRegex = /\b(high priority|important|deadline|must do|critical task)\b/i;
    if (highRegex.test(lower)) {
      const match = lower.match(highRegex)!;
      return {
        priority: 'high',
        matchedText: match[0],
        confidence: 0.92,
      };
    }

    // 3. Medium priority
    const mediumRegex = /\b(medium priority|soon|this week|p2|moderate priority)\b/i;
    if (mediumRegex.test(lower)) {
      const match = lower.match(mediumRegex)!;
      return {
        priority: 'medium',
        matchedText: match[0],
        confidence: 0.85,
      };
    }

    // 4. Low priority
    const lowRegex = /\b(low priority|whenever|optional|if possible|someday|no rush|p3|p4)\b/i;
    if (lowRegex.test(lower)) {
      const match = lower.match(lowRegex)!;
      return {
        priority: 'low',
        matchedText: match[0],
        confidence: 0.9,
      };
    }

    return { priority: 'none', matchedText: '', confidence: 0 };
  }
}
