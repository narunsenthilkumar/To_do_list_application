import { ParsedTimeResult } from '../types';

export class TimeParser {
  private static formatTime(hour: number, minute: number): string {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    return `${h}:${m}`;
  }

  public static parse(input: string): ParsedTimeResult {
    const text = input.trim();
    if (!text) {
      return { matchedText: '', confidence: 0 };
    }

    const lower = text.toLowerCase();

    // 1. Special words: noon, midnight
    if (/\bnoon\b/i.test(lower)) {
      const match = lower.match(/\bnoon\b/i)!;
      return { timeStr: '12:00', matchedText: match[0], confidence: 0.98 };
    }
    if (/\bmidnight\b/i.test(lower)) {
      const match = lower.match(/\bmidnight\b/i)!;
      return { timeStr: '00:00', matchedText: match[0], confidence: 0.98 };
    }

    // 2. Standard 12-hour AM/PM: "7:30 PM", "7 PM", "7pm", "11:45 am"
    const ampmRegex = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
    const ampmMatch = lower.match(ampmRegex);
    if (ampmMatch) {
      let hour = parseInt(ampmMatch[1], 10);
      const minute = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
      const meridiem = ampmMatch[3].toLowerCase();

      if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
        if (meridiem === 'pm' && hour < 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;

        return {
          timeStr: this.formatTime(hour, minute),
          matchedText: ampmMatch[0],
          confidence: 0.98,
        };
      }
    }

    // 3. Natural descriptive time: "7 in the morning", "8 in the evening", "6 tonight", "8 at night", "2 in the afternoon"
    const naturalTimeRegex = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s+(?:in\s+the\s+(morning|afternoon|evening)|tonight|at\s+night)\b/i;
    const naturalMatch = lower.match(naturalTimeRegex);
    if (naturalMatch) {
      let hour = parseInt(naturalMatch[1], 10);
      const minute = naturalMatch[2] ? parseInt(naturalMatch[2], 10) : 0;
      const period = naturalMatch[3] ? naturalMatch[3].toLowerCase() : 'evening';

      if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
        if (period === 'morning' && hour === 12) hour = 0;
        if (period === 'afternoon' && hour < 12) hour += 12;
        if ((period === 'evening' || naturalMatch[0].includes('night') || naturalMatch[0].includes('tonight')) && hour < 12) {
          hour += 12;
        }

        return {
          timeStr: this.formatTime(hour, minute),
          matchedText: naturalMatch[0],
          confidence: 0.96,
        };
      }
    }

    // 4. Standard 24-hour time: "19:00", "07:30", "14:45"
    const militaryRegex = /\b([01]?\d|2[0-3]):([0-5]\d)\b/;
    const militaryMatch = text.match(militaryRegex);
    if (militaryMatch) {
      const hour = parseInt(militaryMatch[1], 10);
      const minute = parseInt(militaryMatch[2], 10);
      return {
        timeStr: this.formatTime(hour, minute),
        matchedText: militaryMatch[0],
        confidence: 0.95,
      };
    }

    // 5. Casual "at 6", "at 7", "at 10" (without am/pm)
    const casualAtRegex = /\bat\s+(\d{1,2})(?::(\d{2}))?\b/i;
    const casualMatch = lower.match(casualAtRegex);
    if (casualMatch) {
      let hour = parseInt(casualMatch[1], 10);
      const minute = casualMatch[2] ? parseInt(casualMatch[2], 10) : 0;

      if (hour >= 1 && hour <= 23 && minute >= 0 && minute <= 59) {
        // If hour between 1 and 6, assume afternoon/evening (e.g. at 6 -> 18:00, at 5 -> 17:00)
        // If hour >= 7 and <= 11, assume morning unless stated
        if (hour >= 1 && hour <= 6) {
          hour += 12;
        }
        return {
          timeStr: this.formatTime(hour, minute),
          matchedText: casualMatch[0],
          confidence: 0.85,
        };
      }
    }

    // 6. Broad time of day: "tomorrow morning", "this afternoon", "in the evening"
    const broadMorning = /\b(?:in\s+the\s+)?morning\b/i;
    if (broadMorning.test(lower)) {
      const match = lower.match(broadMorning)!;
      return { timeStr: '09:00', matchedText: match[0], confidence: 0.75 };
    }
    const broadAfternoon = /\b(?:in\s+the\s+)?afternoon\b/i;
    if (broadAfternoon.test(lower)) {
      const match = lower.match(broadAfternoon)!;
      return { timeStr: '14:00', matchedText: match[0], confidence: 0.75 };
    }
    const broadEvening = /\b(?:in\s+the\s+)?evening\b/i;
    if (broadEvening.test(lower)) {
      const match = lower.match(broadEvening)!;
      return { timeStr: '19:00', matchedText: match[0], confidence: 0.75 };
    }

    return { matchedText: '', confidence: 0 };
  }
}
