import { ParsedDateResult } from '../types';

export class DateParser {
  private static formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  public static parse(input: string, baseDate: Date = new Date()): ParsedDateResult {
    const text = input.trim();
    if (!text) {
      return { matchedText: '', confidence: 0 };
    }

    const lower = text.toLowerCase();

    // 1. Relative keywords: today, tonight, this evening, this morning
    if (/\b(today|tonight|this evening|this morning)\b/i.test(lower)) {
      const match = lower.match(/\b(today|tonight|this evening|this morning)\b/i)!;
      return {
        dateStr: this.formatDate(baseDate),
        matchedText: match[0],
        confidence: 0.98,
      };
    }

    // 2. Tomorrow
    if (/\b(tomorrow|tmrw)\b/i.test(lower)) {
      const match = lower.match(/\b(tomorrow|tmrw)\b/i)!;
      const target = new Date(baseDate);
      target.setDate(target.getDate() + 1);
      return {
        dateStr: this.formatDate(target),
        matchedText: match[0],
        confidence: 0.98,
      };
    }

    // 3. Yesterday
    if (/\byesterday\b/i.test(lower)) {
      const match = lower.match(/\byesterday\b/i)!;
      const target = new Date(baseDate);
      target.setDate(target.getDate() - 1);
      return {
        dateStr: this.formatDate(target),
        matchedText: match[0],
        confidence: 0.95,
      };
    }

    // 4. Next week
    if (/\bnext week\b/i.test(lower)) {
      const match = lower.match(/\bnext week\b/i)!;
      const target = new Date(baseDate);
      target.setDate(target.getDate() + 7);
      return {
        dateStr: this.formatDate(target),
        matchedText: match[0],
        confidence: 0.92,
      };
    }

    // 5. Named weekdays: "next monday", "this friday", "friday", "on wednesday"
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

    const weekdayRegex = /\b(?:(next|this|on)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i;
    const weekdayMatch = lower.match(weekdayRegex);
    if (weekdayMatch) {
      const prefix = (weekdayMatch[1] || '').toLowerCase();
      const dayName = weekdayMatch[2].toLowerCase();
      const targetDay = weekdayMap[dayName];

      if (targetDay !== undefined) {
        const currentDay = baseDate.getDay();
        let daysToAdd = (targetDay - currentDay + 7) % 7;

        if (prefix === 'next') {
          daysToAdd = daysToAdd === 0 ? 7 : daysToAdd + 7;
        } else if (daysToAdd === 0) {
          // If it's today (e.g. today is Friday and user says "Friday"), schedule for today or next week
          daysToAdd = 0;
        }

        const target = new Date(baseDate);
        target.setDate(target.getDate() + daysToAdd);
        return {
          dateStr: this.formatDate(target),
          matchedText: weekdayMatch[0],
          confidence: 0.95,
        };
      }
    }

    // 6. "on the 15th", "15th", "1st", "2nd", "3rd", "28th"
    const ordinalRegex = /\b(?:on\s+the\s+|on\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i;
    const ordinalMatch = lower.match(ordinalRegex);
    if (ordinalMatch) {
      const dayNum = parseInt(ordinalMatch[1], 10);
      if (dayNum >= 1 && dayNum <= 31) {
        const target = new Date(baseDate);
        if (target.getDate() > dayNum) {
          // Move to next month
          target.setMonth(target.getMonth() + 1);
        }
        target.setDate(dayNum);
        return {
          dateStr: this.formatDate(target),
          matchedText: ordinalMatch[0],
          confidence: 0.9,
        };
      }
    }

    // 7. Month name + Day: "15 August", "August 15", "Aug 15", "15th Aug"
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    const monthMap: { [key: string]: number } = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
      august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11
    };

    const monthDayRegex = new RegExp(
      `\\b(?:on\\s+)?(?:(${months.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?|(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${months.join('|')}))\\b`,
      'i'
    );
    const monthDayMatch = lower.match(monthDayRegex);
    if (monthDayMatch) {
      const monthStr = (monthDayMatch[1] || monthDayMatch[4]).toLowerCase();
      const dayStr = monthDayMatch[2] || monthDayMatch[3];
      const monthIdx = monthMap[monthStr];
      const dayNum = parseInt(dayStr, 10);

      if (monthIdx !== undefined && dayNum >= 1 && dayNum <= 31) {
        let year = baseDate.getFullYear();
        const target = new Date(year, monthIdx, dayNum);
        if (target.getTime() < baseDate.getTime() - 86400000) {
          // If already past in the current year, schedule next year
          target.setFullYear(year + 1);
        }
        return {
          dateStr: this.formatDate(target),
          matchedText: monthDayMatch[0],
          confidence: 0.96,
        };
      }
    }

    // 8. Numeric formats: YYYY-MM-DD, DD/MM/YYYY, DD/MM, MM/DD
    const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
      return {
        dateStr: isoMatch[0],
        matchedText: isoMatch[0],
        confidence: 0.99,
      };
    }

    const slashMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (slashMatch) {
      const part1 = parseInt(slashMatch[1], 10);
      const part2 = parseInt(slashMatch[2], 10);
      const yearPart = slashMatch[3] ? parseInt(slashMatch[3], 10) : baseDate.getFullYear();
      const fullYear = yearPart < 100 ? 2000 + yearPart : yearPart;

      // Check if part1 is day and part2 is month (European/International) or vice versa
      let day = part1;
      let month = part2;
      if (part1 <= 12 && part2 > 12) {
        // Must be MM/DD
        month = part1;
        day = part2;
      }

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const target = new Date(fullYear, month - 1, day);
        return {
          dateStr: this.formatDate(target),
          matchedText: slashMatch[0],
          confidence: 0.92,
        };
      }
    }

    return { matchedText: '', confidence: 0 };
  }
}
