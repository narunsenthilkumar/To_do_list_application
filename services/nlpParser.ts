import { PriorityLevel, RecurrenceFrequency } from '../models/task';

export interface ParsedTaskResult {
  title: string;
  dueDate?: string;     // YYYY-MM-DD
  dueTime?: string;     // HH:mm
  priority?: PriorityLevel;
  recurrence?: RecurrenceFrequency;
  hasMatchedDate: boolean;
  rawMatchedPhrase?: string;
}

export class NLPParser {
  static parseInput(rawInput: string): ParsedTaskResult {
    let text = rawInput.trim();
    if (!text) {
      return { title: '', hasMatchedDate: false };
    }

    let dueDate: string | undefined = undefined;
    let dueTime: string | undefined = undefined;
    let priority: PriorityLevel | undefined = undefined;
    let recurrence: RecurrenceFrequency | undefined = undefined;
    let rawMatchedPhrase: string | undefined = undefined;

    const now = new Date();

    // 1. Priority parsing (e.g., "!urgent", "!high", "p1", "p2")
    if (/\b(!urgent|p1|\burgent\b)/i.test(text)) {
      priority = 'urgent';
      text = text.replace(/\b(!urgent|p1|\burgent\b)/i, '').trim();
    } else if (/\b(!high|p2)\b/i.test(text)) {
      priority = 'high';
      text = text.replace(/\b(!high|p2)\b/i, '').trim();
    } else if (/\b(!medium|p3)\b/i.test(text)) {
      priority = 'medium';
      text = text.replace(/\b(!medium|p3)\b/i, '').trim();
    } else if (/\b(!low|p4)\b/i.test(text)) {
      priority = 'low';
      text = text.replace(/\b(!low|p4)\b/i, '').trim();
    }

    // 2. Recurrence parsing
    if (/\b(every weekday|every work day)\b/i.test(text)) {
      recurrence = 'weekdays';
      text = text.replace(/\b(every weekday|every work day)\b/i, '').trim();
    } else if (/\b(every day|daily)\b/i.test(text)) {
      recurrence = 'daily';
      text = text.replace(/\b(every day|daily)\b/i, '').trim();
    } else if (/\b(every week|weekly)\b/i.test(text)) {
      recurrence = 'weekly';
      text = text.replace(/\b(every week|weekly)\b/i, '').trim();
    } else if (/\b(every month|monthly)\b/i.test(text)) {
      recurrence = 'monthly';
      text = text.replace(/\b(every month|monthly)\b/i, '').trim();
    }

    // 3. Time parsing (e.g., "at 6 PM", "at 18:00", "7:30 am", "10pm")
    const timeRegex = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3].toLowerCase();

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      dueTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      text = text.replace(timeMatch[0], '').trim();
    }

    // 4. Date parsing (today, tomorrow, next week, day of week)
    if (/\b(today|tonight)\b/i.test(text)) {
      dueDate = this.formatDate(now);
      rawMatchedPhrase = 'Today';
      text = text.replace(/\b(today|tonight)\b/i, '').trim();
    } else if (/\b(tomorrow|tmr)\b/i.test(text)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = this.formatDate(tomorrow);
      rawMatchedPhrase = 'Tomorrow';
      text = text.replace(/\b(tomorrow|tmr)\b/i, '').trim();
    } else if (/\b(this weekend|weekend)\b/i.test(text)) {
      const weekend = new Date(now);
      const day = weekend.getDay();
      const diff = day === 0 ? 0 : 6 - day; // Saturday
      weekend.setDate(weekend.getDate() + diff);
      dueDate = this.formatDate(weekend);
      rawMatchedPhrase = 'This Weekend';
      text = text.replace(/\b(this weekend|weekend)\b/i, '').trim();
    } else if (/\bnext week\b/i.test(text)) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      dueDate = this.formatDate(nextWeek);
      rawMatchedPhrase = 'Next Week';
      text = text.replace(/\bnext week\b/i, '').trim();
    } else {
      // Check day names (e.g., "next monday", "this friday", "on tuesday")
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (let i = 0; i < dayNames.length; i++) {
        const regex = new RegExp(`\\b(?:next|this|on\\s+)?(${dayNames[i]})\b`, 'i');
        const match = text.match(regex);
        if (match) {
          const targetDay = i;
          const currentDay = now.getDay();
          let distance = targetDay - currentDay;
          if (distance <= 0) distance += 7;

          const targetDate = new Date(now);
          targetDate.setDate(targetDate.getDate() + distance);
          dueDate = this.formatDate(targetDate);
          rawMatchedPhrase = match[0];
          text = text.replace(match[0], '').trim();
          break;
        }
      }
    }

    // Clean double spaces in title
    const cleanTitle = text.replace(/\s+/g, ' ').trim();

    return {
      title: cleanTitle || rawInput,
      dueDate,
      dueTime,
      priority,
      recurrence,
      hasMatchedDate: !!dueDate,
      rawMatchedPhrase,
    };
  }

  private static formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
