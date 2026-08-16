/**
 * Centralized Time Formatter for Taskora
 * Handles uniform 12-hour and 24-hour time conversions, display formatting,
 * and parsing across all platforms (Android, Windows Electron, Web).
 */

export type TimeFormat = '12h' | '24h';

export interface ClockTimeParts {
  hours: string;
  minutes: string;
  seconds?: string;
  period?: 'AM' | 'PM';
  formatted: string;
}

/**
 * Detects the user's system locale time format preference (12h vs 24h).
 */
export function detectSystemTimeFormat(): TimeFormat {
  try {
    const format = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
    if (format === 'h23' || format === 'h24') {
      return '24h';
    }
  } catch {}
  return '12h';
}

/**
 * Parses any time string ("17:30", "5:30 PM", "9:05 AM", "09:05", "12:00")
 * into normalized hours (0-23) and minutes (0-59).
 */
export function parseTimeString(timeStr?: string): { hours: number; minutes: number } | null {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  // Check 12-hour format with AM/PM (e.g. "5:30 PM", "05:30am", "12:15 PM")
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*([ap]m)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3] ? match12[3].toUpperCase() : null;

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes };
  }

  // Check simple HH:MM 24-hour format (e.g. "17:30", "09:05")
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { hours, minutes };
  }

  return null;
}

/**
 * Formats a task's due time (e.g. "17:30" or "5:30 PM") according to the global TimeFormat.
 * 12h: "5:30 PM", "9:05 AM", "12:00 PM"
 * 24h: "17:30", "09:05", "12:00"
 */
export function formatTaskTime(timeStr?: string, format: TimeFormat = '12h'): string {
  if (!timeStr) return '';
  const parsed = parseTimeString(timeStr);
  if (!parsed) return timeStr;

  const { hours, minutes } = parsed;
  const mm = String(minutes).padStart(2, '0');

  if (format === '24h') {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}`;
  } else {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHour}:${mm} ${period}`;
  }
}

/**
 * Formats a short time chip/preset (e.g. "09:00" -> "9:00 AM" or "09:00")
 */
export function formatShortTime(timeStr: string, format: TimeFormat = '12h'): string {
  return formatTaskTime(timeStr, format);
}

/**
 * Formats a Date object for clock displays with structured parts and smooth UI bindings.
 */
export function formatClockTime(
  date: Date = new Date(),
  format: TimeFormat = '12h',
  includeSeconds: boolean = false
): ClockTimeParts {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (format === '24h') {
    const hh = String(hours).padStart(2, '0');
    const formatted = includeSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
    return {
      hours: hh,
      minutes: mm,
      seconds: includeSeconds ? ss : undefined,
      formatted,
    };
  } else {
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const hh = String(displayHour);
    const formatted = includeSeconds
      ? `${hh}:${mm}:${ss} ${period}`
      : `${hh}:${mm} ${period}`;
    return {
      hours: hh,
      minutes: mm,
      seconds: includeSeconds ? ss : undefined,
      period,
      formatted,
    };
  }
}

/**
 * Formats a world city / timezone time according to global format.
 */
export function formatWorldCityTime(timeZone: string, format: TimeFormat = '12h'): string {
  try {
    const date = new Date();
    if (format === '24h') {
      return date.toLocaleTimeString('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } else {
      return date.toLocaleTimeString('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  } catch {
    return formatClockTime(new Date(), format).formatted;
  }
}

/**
 * Formats reminder description time (e.g. "Today at 5:30 PM" or "Today at 17:30")
 */
export function formatReminderTime(timeStr: string, format: TimeFormat = '12h'): string {
  return formatTaskTime(timeStr, format);
}
