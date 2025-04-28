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
 * Checks if two ISO strings represent the same local calendar day
 */
export const isSameDay = (aIso: string, bIso: string): boolean => {
  try {
    const aLocal = toLocal(aIso);
    const bLocal = toLocal(bIso);
    return (
      aLocal.getFullYear() === bLocal.getFullYear() &&
      aLocal.getMonth() === bLocal.getMonth() &&
      aLocal.getDate() === bLocal.getDate()
    );
  } catch (error) {
    console.warn('Error comparing dates:', error);
    return false;
  }
};

/**
 * Gets today's date in ISO format (UTC)
 */
export const getTodayISO = (): string => {
  return toISO(new Date());
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