import { format, parseISO, isValid, formatISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

/**
 * Converts any date representation to an ISO string in UTC
 */
export const toISO = (date: Date | number | string): string => {
  let parsedDate: Date;

  if (typeof date === 'string') {
    // Handle HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(date)) {
      const [hours, minutes] = date.split(':').map(Number);
      const now = new Date();
      parsedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    } else {
      parsedDate = new Date(date);
    }
  } else if (typeof date === 'number') {
    parsedDate = new Date(date);
  } else {
    parsedDate = date;
  }

  if (!isValid(parsedDate)) {
    console.warn('Invalid date:', date);
    return formatISO(new Date());
  }

  return formatISO(parsedDate, { representation: 'complete' });
};

/**
 * Convert a Date object to ISO string while preserving local timezone
 * (Legacy compatibility function - same as toISO)
 */
export const toLocalISOString = (date: Date): string => {
  return date.toISOString();
};

/**
 * Parse an ISO string to a Date object
 * (Legacy compatibility function - similar to toLocal but returns raw Date)
 */
export const fromLocalISOString = (iso: string): Date => {
  if (!iso) return new Date(); // Return current time if no date provided
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', iso);
      return new Date();
    }
    return date;
  } catch (error) {
    console.warn('Error parsing date:', error);
    return new Date();
  }
};

/**
 * Converts an ISO string to a Date object in local time
 */
export const toLocal = (iso: string): Date => {
  if (!iso) return new Date();
  
  try {
    const date = parseISO(iso);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return utcToZonedTime(date, timeZone);
  } catch (error) {
    console.warn('Error parsing date:', error);
    return new Date();
  }
};

/**
 * Get today's date in YYYY-MM-DD format in local timezone
 */
export const getTodayDate = (): string => {
  const now = new Date();
  return getDateString(now);
};

/**
 * Get date string in YYYY-MM-DD format for any date
 */
export const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats an ISO string as HH:MM in local time
 */
export const formatClock = (iso: string): string => {
  try {
    const localDate = toLocal(iso);
    return format(localDate, 'HH:mm');
  } catch (error) {
    console.warn('Error formatting clock time:', error);
    return 'Invalid Time';
  }
};

/**
 * Format a date string for display in the UI (HH:MM format)
 */
export const formatDateTime = (dateString: string): string => {
  try {
    const date = fromLocalISOString(dateString);
    return format(date, 'HH:mm');
  } catch (error) {
    console.warn('Error formatting date time:', error);
    return 'Invalid Time';
  }
};

/**
 * Formats a time range as "HH:MM – HH:MM" in local time
 */
export const formatRange = (startIso: string, endIso: string): string => {
  if (!startIso || !endIso) {
    return 'Invalid Time Range';
  }

  try {
    return `${formatClock(startIso)} – ${formatClock(endIso)}`;
  } catch (error) {
    console.warn('Error formatting time range:', error);
    return 'Invalid Time Range';
  }
};

/**
 * Format a time range for display (legacy compatibility function)
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  return formatRange(startTime, endTime);
};

/**
 * Returns an ISO string for "today" with the time set to 12:00 local
 */
function middayISO(d: Date = new Date()) {
  const mid = new Date(d);
  mid.setHours(12, 0, 0, 0);
  return mid.toISOString();
}

/**
 * Returns true when two ISO strings fall in the same "app day"
 * An "app day" runs from 04:00 to the next day's 03:59 local time.
 */
export function isSameDay(isoA: string, isoB: string): boolean {
  const SHIFT_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

  const a = new Date(isoA);
  const b = new Date(isoB);

  // Shift both dates backward by 4 h so the app-day starts at 00:00
  const aShifted = new Date(a.getTime() - SHIFT_MS);
  const bShifted = new Date(b.getTime() - SHIFT_MS);

  return (
    aShifted.getFullYear() === bShifted.getFullYear() &&
    aShifted.getMonth() === bShifted.getMonth() &&
    aShifted.getDate() === bShifted.getDate()
  );
}

/**
 * Filter function to check if a date matches a specific date string
 */
export const filterByDate = (dateStr: string, targetDate: string): boolean => {
  try {
    const date = fromLocalISOString(dateStr);
    const dateString = date.toISOString().split('T')[0];
    return dateString === targetDate;
  } catch (error) {
    console.warn('Error filtering by date:', error);
    return false;
  }
};

/**
 * Gets today's date in ISO format (UTC), accounting for 4am day boundary
 * If current time is between midnight and 4am, returns previous calendar day
 */
export const getTodayISO = (): string => {
  const now = new Date();
  // If it's before 04:00, use yesterday; otherwise today.
  const ref = now.getHours() < 4
    ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
    : now;
  return middayISO(ref);
};

/**
 * Formats a date for datetime-local input
 */
export const formatForDateTimeInput = (iso: string): string => {
  try {
    const localDate = toLocal(iso);
    return format(localDate, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.warn('Error formatting for datetime input:', error);
    return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  }
};

/**
 * Parse a datetime-local input value to ISO string in UTC
 */
export const parseFromDateTimeInput = (inputValue: string): string => {
  try {
    const localDate = new Date(inputValue);
    if (!isValid(localDate)) {
      throw new Error('Invalid date input');
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const utcDate = zonedTimeToUtc(localDate, timeZone);
    return formatISO(utcDate);
  } catch (error) {
    console.warn('Error parsing from datetime input:', error);
    throw error;
  }
};

/**
 * Calculate duration between two ISO strings in seconds
 */
export const calculateDuration = (startIso: string, endIso: string): number => {
  try {
    const start = parseISO(startIso);
    const end = parseISO(endIso);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    return duration >= 0 ? duration : 0;
  } catch (error) {
    console.warn('Error calculating duration:', error);
    return 0;
  }
}; 